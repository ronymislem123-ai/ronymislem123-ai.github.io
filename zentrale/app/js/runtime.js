/* LINUA Agentur-Zentrale – Laufzeit
   Ersetzt die frühere Artefakt-Laufzeit: Datenbank, Nutzer, Dateien und Downloads laufen über das eigene
   Supabase-Backend (EU). Zugriff nur mit gültiger Sitzung; alle Regeln greifen serverseitig (Row Level Security). */
(function () {
  'use strict';
  const CFG = window.ZENTRALE_CONFIG || {};
  const Z = window.ZAuth;
  const BUCKET = 'zentrale-docs';
  const POLL_MS = 15000;
  const E = (code, message) => ({ code, message: message || code });
  const copy = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
  const enc = encodeURIComponent;

  /* ---------- HTTP mit Sitzung (erneuert abgelaufene Tokens einmal automatisch) ---------- */
  async function api(path, opts) {
    opts = opts || {};
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await Z.token();
      let res;
      try {
        res = await fetch(CFG.url + path, {
          method: opts.method || 'GET', body: opts.body, credentials: 'omit', cache: 'no-store',
          headers: Object.assign({ apikey: CFG.anonKey, Authorization: 'Bearer ' + token }, opts.headers || {})
        });
      } catch (e) { throw E('unavailable', 'Keine Verbindung zum Server'); }
      if (res.status === 401 && attempt === 0) { try { await Z.refresh(true); } catch (e) { Z.expire('session'); throw E('revoked'); } continue; }
      if (res.ok) return res;
      let detail = '';
      try { const j = await res.json(); detail = j.message || j.error_description || j.error || j.msg || ''; } catch (e) { }
      if (res.status === 401) { Z.expire('session'); throw E('revoked', detail); }
      if (res.status === 403) throw E('revoked', detail || 'Zugriff verweigert');
      if (res.status === 413) throw E('too_large', detail);
      if (res.status === 429) throw E('resource_exhausted', detail);
      if (res.status === 400 || res.status === 409 || res.status === 422) throw E('invalid_argument', detail);
      if (res.status >= 500) throw E('unavailable', detail);
      throw E('http_' + res.status, detail);
    }
    throw E('revoked');
  }
  const json = (path, body, method, prefer) => api(path, {
    method: method || 'POST', body: body === undefined ? undefined : JSON.stringify(body),
    headers: Object.assign({ 'Content-Type': 'application/json' }, prefer ? { Prefer: prefer } : {})
  });

  /* ---------- Lokaler Spiegel + Abgleich ---------- */
  const byParent = new Map();          // 'ws/live/companies' -> Map(id -> data)
  const known = new Map();             // path -> letzte Server-Sequenz
  const inflight = new Map();          // path -> laufende Schreibvorgänge
  const listeners = new Set();
  const state = { loaded: new Set(), loading: new Map(), lastSeq: {}, timer: null };
  const parentOf = p => p.slice(0, p.lastIndexOf('/'));
  const idOf = p => p.slice(p.lastIndexOf('/') + 1);
  const wsOf = p => String(p).split('/')[1];

  function put(path, data) { const k = parentOf(path); if (!byParent.has(k)) byParent.set(k, new Map()); byParent.get(k).set(idOf(path), data); }
  function drop(path) { const m = byParent.get(parentOf(path)); if (m) m.delete(idOf(path)); }
  function peek(path) { const m = byParent.get(parentOf(path)); return m ? m.get(idOf(path)) : undefined; }

  function deliver(l) {
    const m = byParent.get(l.parent) || new Map();
    let docs = Array.from(m, ([id, d]) => ({ id, d }));
    if (l.order) { const f = l.order, dir = l.dir === 'desc' ? -1 : 1; docs.sort((a, b) => { const x = a.d[f], y = b.d[f]; return (x > y ? 1 : x < y ? -1 : 0) * dir; }); }
    if (l.lim) docs = docs.slice(0, l.lim);
    const snap = { docs: docs.map(x => ({ id: x.id, data: () => copy(x.d) })), metadata: { fromCache: false }, size: docs.length, empty: !docs.length };
    try { l.cb(snap); } catch (e) { console.error(e); }
  }
  function emit(parents) { for (const l of listeners) if (state.loaded.has(wsOf(l.parent)) && (!parents || parents.has(l.parent))) deliver(l); }

  async function loadWs(ws) {
    if (state.loaded.has(ws)) return;
    if (state.loading.has(ws)) return state.loading.get(ws);
    const p = (async () => {
      let from = 0; const page = 1000; let max = 0;
      for (; ;) {
        const r = await api('/rest/v1/zentrale_docs?select=path,data,seq&ws=eq.' + enc(ws) + '&order=seq.asc', { headers: { 'Range-Unit': 'items', Range: from + '-' + (from + page - 1) } });
        const rows = await r.json();
        for (const row of rows) { put(row.path, row.data); known.set(row.path, row.seq); if (row.seq > max) max = row.seq; }
        if (rows.length < page) break; from += page;
      }
      const t = await (await api('/rest/v1/zentrale_tombstones?select=seq&ws=eq.' + enc(ws) + '&order=seq.desc&limit=1')).json();
      if (t[0] && t[0].seq > max) max = t[0].seq;
      state.lastSeq[ws] = max; state.loaded.add(ws);
    })();
    state.loading.set(ws, p);
    try { await p; } finally { state.loading.delete(ws); }
  }

  async function poll(ws) {
    if (!state.loaded.has(ws)) return;
    const since = Math.max(0, (state.lastSeq[ws] || 0) - 50); // Überlappung fängt spät bestätigte Transaktionen ab
    const [docs, tombs] = await Promise.all([
      api('/rest/v1/zentrale_docs?select=path,data,seq&ws=eq.' + enc(ws) + '&seq=gt.' + since + '&order=seq.asc&limit=5000').then(r => r.json()),
      api('/rest/v1/zentrale_tombstones?select=path,seq&ws=eq.' + enc(ws) + '&seq=gt.' + since + '&order=seq.asc&limit=5000').then(r => r.json())
    ]);
    const events = docs.map(d => ({ t: 'set', path: d.path, data: d.data, seq: d.seq })).concat(tombs.map(d => ({ t: 'del', path: d.path, seq: d.seq }))).sort((a, b) => a.seq - b.seq);
    const changed = new Set(); let max = state.lastSeq[ws] || 0;
    for (const ev of events) {
      if (ev.seq > max) max = ev.seq;
      if (inflight.get(ev.path)) continue;
      if ((known.get(ev.path) || 0) >= ev.seq) continue;
      known.set(ev.path, ev.seq);
      if (ev.t === 'set') put(ev.path, ev.data); else drop(ev.path);
      changed.add(parentOf(ev.path));
    }
    state.lastSeq[ws] = max;
    if (changed.size) emit(changed);
  }
  function activeWs() { const s = new Set(); for (const l of listeners) s.add(wsOf(l.parent)); return s; }
  async function pollAll() { for (const ws of activeWs()) { try { await poll(ws); } catch (e) { if (e && e.code === 'revoked') return; console.warn('Abgleich', e); } } }
  function schedule() {
    clearTimeout(state.timer);
    state.timer = setTimeout(async () => { if (document.visibilityState === 'visible') await pollAll(); schedule(); }, POLL_MS);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pollAll(); });
  window.addEventListener('focus', () => pollAll());

  /* ---------- Firestore-ähnliche Schnittstelle, die die Datenschicht der Zentrale erwartet ---------- */
  function query(parent, order, dir, lim) {
    return {
      orderBy: (f, d) => query(parent, f, d || 'asc', lim),
      limit: n => query(parent, order, dir, n),
      onSnapshot(cb, onErr) {
        const l = { parent, order, dir, lim, cb };
        listeners.add(l);
        const ws = wsOf(parent);
        loadWs(ws).then(() => { if (listeners.has(l)) deliver(l); schedule(); }).catch(e => { if (onErr) onErr(e && e.code ? e : E('unavailable')); });
        return () => listeners.delete(l);
      }
    };
  }

  async function guarded(path, fn) {
    inflight.set(path, (inflight.get(path) || 0) + 1);
    try { return await fn(); } finally { const n = (inflight.get(path) || 1) - 1; if (n) inflight.set(path, n); else inflight.delete(path); }
  }
  function rowFor(path, data) {
    const p = path.split('/');
    return { path, ws: p[1], col: p[2], doc_id: p[3], data, lease_holder: null, lease_until: null };
  }
  function docRef(path) {
    return {
      async set(data) {
        const prev = peek(path); const d = copy(data);
        put(path, d); emit(new Set([parentOf(path)]));
        try { await guarded(path, () => json('/rest/v1/zentrale_docs?on_conflict=path', rowFor(path, d), 'POST', 'resolution=merge-duplicates,return=minimal')); }
        catch (e) { if (prev === undefined) drop(path); else put(path, prev); emit(new Set([parentOf(path)])); throw e; }
      },
      async update(patch) {
        let cur = peek(path);
        if (cur === undefined) { const g = await this.get(); if (!g.exists) throw E('not_found', 'Datensatz nicht gefunden'); cur = g.data(); }
        return this.set(Object.assign({}, cur, copy(patch)));
      },
      async delete() {
        const prev = peek(path);
        drop(path); emit(new Set([parentOf(path)]));
        try { await guarded(path, () => api('/rest/v1/zentrale_docs?path=eq.' + enc(path), { method: 'DELETE', headers: { Prefer: 'return=minimal' } })); }
        catch (e) { if (prev !== undefined) { put(path, prev); emit(new Set([parentOf(path)])); } throw e; }
      },
      async get() {
        const rows = await (await api('/rest/v1/zentrale_docs?select=data,seq&path=eq.' + enc(path))).json();
        const row = rows[0];
        if (row) { put(path, row.data); known.set(path, row.seq); }
        return { exists: !!row, data: () => (row ? copy(row.data) : undefined) };
      },
      async acquire(o) {
        const r = await json('/rest/v1/rpc/zentrale_acquire', { p_path: path, p_holder: String(o && o.holder || 'tab'), p_ttl_ms: Number(o && o.ttlMs) || 8000 });
        return { acquired: (await r.json()) === true };
      }
    };
  }
  const db = { collection: path => query(path), doc: path => docRef(path) };

  /* ---------- Nutzer ---------- */
  const user = { id: async () => { const s = Z.session(); return s && s.user ? s.user.id : null; }, email: () => { const s = Z.session(); return s && s.user ? s.user.email : ''; } };

  /* ---------- Dateien (privater Speicher, Abruf nur mit Sitzung) ---------- */
  const blobCache = new Map(); const blobLoading = new Map();
  let rerender = null;
  const EXT = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm', 'text/csv': 'csv', 'text/markdown': 'md', 'application/json': 'json', 'text/plain': 'txt' };
  const assets = {
    async upload(blob, o) {
      const type = (o && o.type) || blob.type || 'application/octet-stream';
      if (blob.size > 20 * 1048576 || (type === 'image/svg+xml' && blob.size > 2 * 1048576)) throw E('too_large');
      if (!EXT[type]) throw E('unsupported_type');
      const id = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)) + '.' + EXT[type];
      try { await api('/storage/v1/object/' + BUCKET + '/' + id, { method: 'POST', body: blob, headers: { 'Content-Type': type, 'x-upsert': 'false', 'cache-control': 'private, max-age=0' } }); }
      catch (e) { if (e.code === 'too_large') throw e; if (e.code === 'unavailable') throw E('store_unavailable'); throw e; }
      return { id, sizeBytes: blob.size, contentType: type };
    },
    async delete(id) {
      await json('/storage/v1/object/' + BUCKET, { prefixes: [String(id)] }, 'DELETE');
      const u = blobCache.get(id); if (u) { URL.revokeObjectURL(u); blobCache.delete(id); }
    },
    async list() {
      const items = await (await json('/storage/v1/object/list/' + BUCKET, { prefix: '', limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } })).json();
      const files = items.filter(x => x && x.id);
      const bytes = files.reduce((s, x) => s + (Number(x.metadata && x.metadata.size) || 0), 0);
      return { items: files.map(x => ({ id: x.name, sizeBytes: Number(x.metadata && x.metadata.size) || 0, contentType: x.metadata && x.metadata.mimetype })), usage: { files: files.length, bytes, maxBytes: Number(CFG.storageBytes) || 1073741824 } };
    },
    async fetchBlob(id) { return (await api('/storage/v1/object/authenticated/' + BUCKET + '/' + encodeURI(String(id)))).blob(); },
    url(id) {
      if (!id) return '';
      if (blobCache.has(id)) return blobCache.get(id);
      if (!blobLoading.has(id)) {
        blobLoading.set(id, assets.fetchBlob(id).then(b => { const u = URL.createObjectURL(b); blobCache.set(id, u); clearTimeout(rerender); rerender = setTimeout(() => window.App && App.render && App.render(), 60); return u; })
          .catch(e => { console.warn('Datei', id, e); }).finally(() => blobLoading.delete(id)));
      }
      return 'data:,zblob-' + id;
    },
    ensure(id) { return blobCache.has(id) ? Promise.resolve(blobCache.get(id)) : (assets.url(id), blobLoading.get(id) || Promise.resolve(blobCache.get(id))); }
  };
  // Klick auf einen noch nicht geladenen Dateilink: Fenster sofort öffnen, Inhalt nachladen
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="data:,zblob-"]'); if (!a) return;
    e.preventDefault(); const id = a.getAttribute('href').slice('data:,zblob-'.length);
    const w = window.open('', '_blank');
    assets.ensure(id).then(u => { if (u && w) w.location.href = u; else if (w) w.close(); });
  }, true);

  /* ---------- Downloads ---------- */
  const downloads = {
    async save(o) {
      const d = o.data; const blob = d instanceof Blob ? d : new Blob([d], { type: o.type || (typeof d === 'string' ? 'application/json' : 'application/octet-stream') });
      const u = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = u; a.download = o.filename || 'download'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 4000);
      return { saved: true };
    }
  };

  /* ---------- Optionales KI-Modul (nur wenn eine eigene KI-Funktion konfiguriert ist) ---------- */
  function makeSampler() {
    if (!CFG.aiUrl) return null;
    const call = async (input, opts, asJson) => {
      const r = await json(CFG.aiUrl.replace(CFG.url, ''), { input, json: !!asJson, maxTokens: (opts && opts.maxTokens) || 1200 });
      const j = await r.json(); if (j.error) throw E(j.error);
      if (asJson) { try { return JSON.parse(String(j.text).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (e) { throw E('invalid_json'); } }
      const out = { text: String(j.text || ''), truncated: !!j.truncated };
      if (opts && typeof opts.onText === 'function') try { opts.onText(out); } catch (e) { }
      return out;
    };
    const s = (input, opts) => call(input, opts, false);
    s.json = (input, opts) => call(input, opts, true);
    s.limits = async () => ({ tools: false });
    return s;
  }

  /* ---------- Website-Anfragen aus dem Formular-Eingang ---------- */
  const inbox = {
    async pending() { return (await api('/rest/v1/zentrale_inbox?select=id,created_at,subject,body,name,email&order=created_at.asc&limit=50')).json(); },
    async remove(id) { await api('/rest/v1/zentrale_inbox?id=eq.' + enc(id), { method: 'DELETE', headers: { Prefer: 'return=minimal' } }); }
  };

  const services = { db, user, assets, downloads, sample: makeSampler(), mcp: null };
  window.Runtime = {
    configured: !!(CFG.url && CFG.anonKey),
    use: name => Promise.resolve(services[name] || null),
    assets, inbox, user, pollNow: pollAll,
    logout: async () => { await Z.logout(); for (const u of blobCache.values()) URL.revokeObjectURL(u); Z.go((CFG.gate || '/zentrale/') + '?grund=abgemeldet'); }
  };
})();
