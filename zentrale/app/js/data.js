/* Agentur-Zentrale – Datenschicht: dauerhafte Speicherung im eigenen Backend (Supabase, über js/runtime.js) */
(function () {
  'use strict';
  const COLS = ['companies', 'contacts', 'inquiries', 'deals', 'projects', 'tasks', 'events', 'notes', 'comms', 'quotes', 'invoices',
    'expenses', 'contracts', 'documents', 'approvals', 'notifications', 'scheduled'];
  const LABELS = {
    companies: 'Kunde', contacts: 'Kontakt', inquiries: 'Anfrage', deals: 'Deal', projects: 'Projekt', tasks: 'Aufgabe', events: 'Termin',
    notes: 'Notiz', comms: 'Kommunikation', quotes: 'Angebot', invoices: 'Rechnung', expenses: 'Ausgabe', contracts: 'Vertrag',
    documents: 'Dokument', approvals: 'Freigabe', notifications: 'Benachrichtigung', scheduled: 'Geplante Aktion'
  };
  const D = {
    COLS, LABELS, db: null, user: null, ws: 'live', status: 'connecting', error: '', cols: {}, meta: {}, activity: [], autolog: [],
    unsubs: [], pending: 0, listeners: new Set(), tabId: Math.random().toString(36).slice(2), loaded: false, lastWriteError: ''
  };
  for (const c of COLS) D.cols[c] = new Map();

  const nowIso = () => new Date().toISOString();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const newId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).replace(/[^a-z0-9]/g, '');
  D.newId = newId; D.nowIso = nowIso;
  const base = () => 'ws/' + D.ws;
  const clean = v => JSON.parse(JSON.stringify(v, (k, x) => (x === undefined ? null : x)));

  /* ---------- Änderungs-Benachrichtigung ---------- */
  let notifyQueued = false;
  function changed() {
    if (notifyQueued) return; notifyQueued = true;
    (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout)(() => { notifyQueued = false; D.listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); });
  }
  D.onChange = fn => { D.listeners.add(fn); return () => D.listeners.delete(fn); };

  /* ---------- Verbindung ---------- */
  D.connect = async function () {
    D.status = 'connecting'; changed();
    let db = null, user = null;
    try {
      if (!window.Runtime || !Runtime.configured) throw new Error('no-runtime');
      [db, user] = await Promise.all([Runtime.use('db'), Runtime.use('user').catch(() => null)]);
    } catch (e) { db = null; }
    D.user = user;
    if (!db) { D.status = 'offline'; D.error = 'Der Server der Zentrale ist nicht erreichbar oder noch nicht eingerichtet. Bitte neu anmelden.'; changed(); return false; }
    D.db = db;
    try { D.userId = user && user.id ? await user.id() : null; } catch (e) { D.userId = null; }
    try { const ws = localStorage.getItem('zentrale.ws'); if (ws === 'demo') D.ws = 'demo'; } catch (e) { }
    subscribeAll();
    return true;
  };

  function subscribeAll() {
    D.unsubs.forEach(u => { try { u(); } catch (e) { } }); D.unsubs = [];
    for (const c of COLS) D.cols[c] = new Map();
    D.meta = {}; D.activity = []; D.autolog = []; D.loaded = false; D.status = 'connecting'; changed();
    const need = new Set([...COLS, '_meta', '_activity', '_autolog']);
    const done = key => { if (need.delete(key) && need.size === 0) { D.loaded = true; D.status = 'ok'; clearTimeout(timer); changed(); } };
    const timer = setTimeout(() => { if (!D.loaded) { D.status = 'slow'; changed(); } }, 10000);
    const onErr = key => e => {
      console.warn('db', key, e); D.status = e && e.code === 'revoked' ? 'revoked' : 'error';
      D.error = e && e.code === 'resource_exhausted' ? 'Zu viele Abfragen – bitte später neu laden.' : 'Verbindung zum Datenspeicher unterbrochen (' + (e && e.code || 'Fehler') + ').';
      changed();
    };
    for (const c of COLS) {
      const u = D.db.collection(base() + '/' + c).onSnapshot(snap => {
        const m = new Map(); for (const d of snap.docs) { const x = d.data(); if (x) m.set(d.id, Object.assign({}, x, { id: d.id })); }
        D.cols[c] = m; if (!snap.metadata || !snap.metadata.fromCache) done(c); else if (m.size) done(c); changed();
      }, onErr(c));
      D.unsubs.push(u);
    }
    D.unsubs.push(D.db.collection(base() + '/meta').onSnapshot(snap => {
      const m = {}; for (const d of snap.docs) m[d.id] = d.data(); D.meta = m; done('_meta'); changed();
    }, onErr('meta')));
    D.unsubs.push(D.db.collection(base() + '/activity').orderBy('month', 'desc').limit(3).onSnapshot(snap => {
      D.activityDocs = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
      D.activity = [].concat(...D.activityDocs.map(d => d.entries || [])).sort((a, b) => (b.at > a.at ? 1 : -1));
      done('_activity'); changed();
    }, onErr('activity')));
    D.unsubs.push(D.db.collection(base() + '/autolog').orderBy('month', 'desc').limit(2).onSnapshot(snap => {
      D.autologDocs = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
      D.autolog = [].concat(...D.autologDocs.map(d => d.runs || [])).sort((a, b) => (b.at > a.at ? 1 : -1));
      done('_autolog'); changed();
    }, onErr('autolog')));
  }

  D.setWorkspace = function (ws) {
    if (ws === D.ws) return; flushActivity(); flushRuns(); D.ws = ws;
    try { localStorage.setItem('zentrale.ws', ws); } catch (e) { }
    subscribeAll();
  };

  /* ---------- Lesen ---------- */
  D.get = (col, id) => (id ? D.cols[col].get(id) || null : null);
  D.all = (col, opts) => { const a = Array.from(D.cols[col].values()); return opts && opts.withDeleted ? a : a.filter(x => !x.deletedAt); };
  D.trash = () => { const out = []; for (const c of COLS) for (const x of D.cols[c].values()) if (x.deletedAt) out.push({ col: c, item: x }); return out.sort((a, b) => (b.item.deletedAt > a.item.deletedAt ? 1 : -1)); };
  D.snapshot = () => { const o = {}; for (const c of COLS) o[c] = D.all(c); o.settings = D.settings(); return o; };
  D.settings = () => {
    const s = Object.assign({}, L.DEFAULT_SETTINGS, D.meta.settings || {});
    s.address = Object.assign({}, L.DEFAULT_SETTINGS.address, (D.meta.settings || {}).address || {});
    s.bank = Object.assign({}, L.DEFAULT_SETTINGS.bank, (D.meta.settings || {}).bank || {});
    return s;
  };
  D.rules = () => (D.meta.automations && Array.isArray(D.meta.automations.rules) ? D.meta.automations.rules : L.DEFAULT_RULES);
  D.templates = () => (D.meta.templates && Array.isArray(D.meta.templates.list) ? D.meta.templates.list : L.DEFAULT_TEMPLATES);
  D.emailTemplates = () => Object.assign({}, L.DEFAULT_EMAIL_TEMPLATES, (D.meta.emailTemplates && D.meta.emailTemplates.map) || {});
  D.today = () => L.todayBerlin();

  /* ---------- Schreiben (eine Schreiboperation je Dokument gleichzeitig) ---------- */
  const queues = {};
  function enqueue(path, fn) {
    const prev = queues[path] || Promise.resolve();
    const next = prev.catch(() => { }).then(fn);
    queues[path] = next.finally(() => { if (queues[path] === next) delete queues[path]; });
    return next;
  }
  async function withRetry(fn) {
    for (let i = 0; ; i++) {
      try { return await fn(); } catch (e) {
        const code = e && e.code;
        if ((code === 'unavailable' && i < 1) || (code === 'resource_exhausted' && i < 4)) { await sleep(500 + Math.random() * 600 + i * 900); continue; }
        throw e;
      }
    }
  }
  function writeErrorText(e) {
    const c = e && e.code;
    if (c === 'quota_exceeded') return 'Speicher voll: ' + (e.message || 'Limit erreicht') + '. Bitte alte Einträge im Papierkorb endgültig löschen.';
    if (c === 'invalid_argument') return 'Speichern nicht möglich (keine Schreibrechte oder ungültige Daten).';
    if (c === 'resource_exhausted') return 'Zu viele Änderungen auf einmal – bitte kurz warten und erneut versuchen.';
    if (c === 'revoked') return 'Zugriff wurde entzogen. Bitte die Seite neu öffnen.';
    return 'Speichern fehlgeschlagen (' + (c || (e && e.message) || 'unbekannt') + ').';
  }
  D.writeErrorText = writeErrorText;
  function rawWrite(path, kind, data) {
    if (!D.db) return Promise.reject({ code: 'unavailable', message: 'Keine Verbindung' });
    D.pending++; changed();
    return enqueue(path, () => withRetry(() => {
      const ref = D.db.doc(path);
      return kind === 'set' ? ref.set(data) : kind === 'update' ? ref.update(data) : ref.delete();
    })).then(r => { D.pending--; changed(); return r; }, e => { D.pending--; D.lastWriteError = writeErrorText(e); changed(); if (D.onWriteError) D.onWriteError(D.lastWriteError, e); throw e; });
  }
  D.rawWrite = rawWrite;

  function validate(col, doc) {
    const size = JSON.stringify(doc).length;
    if (size > 240000) throw { code: 'invalid_argument', message: 'Datensatz zu groß (' + Math.round(size / 1024) + ' KB). Bitte Inhalte kürzen oder als Dokument hochladen.' };
    const req = { companies: ['name'], contacts: [], deals: ['title'], projects: ['name'], tasks: ['title'], events: ['title', 'start'], quotes: [], invoices: [], expenses: ['date'] }[col] || [];
    for (const k of req) if (!String(doc[k] == null ? '' : doc[k]).trim()) throw { code: 'invalid_argument', message: 'Pflichtfeld fehlt: ' + k };
    if (col === 'contacts' && !(doc.firstName || doc.lastName || doc.email)) throw { code: 'invalid_argument', message: 'Kontakt braucht Name oder E-Mail.' };
    if (doc.email && !L.validEmail(doc.email)) throw { code: 'invalid_argument', message: 'E-Mail-Adresse ist ungültig: ' + doc.email };
  }

  D.create = async function (col, data, opts) {
    const id = (data && data.id) || newId();
    const doc = clean(Object.assign({}, data, { id, createdAt: (data && data.createdAt) || nowIso(), updatedAt: nowIso() }));
    if (D.ws === 'demo') doc.demo = true;
    validate(col, doc);
    D.cols[col].set(id, doc); changed();
    try { await rawWrite(base() + '/' + col + '/' + id, 'set', doc); } catch (e) { D.cols[col].delete(id); changed(); throw e; }
    if (!(opts && opts.silent)) D.log('create', col, doc);
    return doc;
  };
  const INVOICE_MUTABLE_AFTER_ISSUE = ['payments', 'reminders', 'status', 'sentAt', 'cancelledById', 'pdfDocId', 'internalNote', 'updatedAt', 'paidAt'];
  D.update = async function (col, id, patch, opts) {
    const cur = D.cols[col].get(id); if (!cur) throw { code: 'invalid_argument', message: 'Datensatz nicht gefunden' };
    if (col === 'invoices' && L.isIssued(cur)) {
      const bad = Object.keys(patch).filter(k => !INVOICE_MUTABLE_AFTER_ISSUE.includes(k));
      if (bad.length) throw { code: 'invalid_argument', message: 'Festgeschriebene Rechnungen sind unveränderbar. Korrektur nur per Storno + neuer Rechnung.' };
    }
    const p = clean(Object.assign({}, patch, { updatedAt: nowIso() }));
    const next = Object.assign({}, cur, p);
    validate(col, next);
    D.cols[col].set(id, next); changed();
    try { await rawWrite(base() + '/' + col + '/' + id, 'set', Object.assign({}, next)); } catch (e) { D.cols[col].set(id, cur); changed(); throw e; }
    if (!(opts && opts.silent)) D.log((opts && opts.action) || 'update', col, next, opts && opts.detail);
    return next;
  };
  D.softDelete = async (col, id) => { const r = await D.update(col, id, { deletedAt: nowIso() }, { action: 'delete' }); return r; };
  D.restore = async (col, id) => D.update(col, id, { deletedAt: null }, { action: 'restore' });
  D.hardDelete = async function (col, id) {
    const cur = D.cols[col].get(id);
    if (col === 'invoices' && cur && L.isIssued(cur)) throw { code: 'invalid_argument', message: 'Festgeschriebene Rechnungen unterliegen der Aufbewahrungspflicht (8 Jahre) und können nicht gelöscht werden.' };
    D.cols[col].delete(id); changed();
    try { await rawWrite(base() + '/' + col + '/' + id, 'delete'); } catch (e) { if (cur) D.cols[col].set(id, cur); changed(); throw e; }
    D.log('purge', col, cur || { id });
  };
  D.setMeta = async function (name, data) {
    const doc = clean(Object.assign({}, D.meta[name] || {}, data, { updatedAt: nowIso() }));
    D.meta[name] = doc; changed();
    await rawWrite(base() + '/meta/' + name, 'set', doc);
    return doc;
  };
  D.replaceMeta = async function (name, data) {
    const doc = clean(Object.assign({}, data, { updatedAt: nowIso() })); D.meta[name] = doc; changed();
    await rawWrite(base() + '/meta/' + name, 'set', doc); return doc;
  };

  /* ---------- Nummernkreise (fortlaufend, lückenlos, mit Sperre) ---------- */
  D.allocateNumber = async function (kind, year, writeRecord) {
    const ref = D.db.doc(base() + '/meta/counters');
    let got = false;
    for (let i = 0; i < 15 && !got; i++) {
      try { const r = await ref.acquire({ holder: D.tabId, ttlMs: 8000 }); got = r && r.acquired; } catch (e) { got = false; }
      if (!got) await sleep(500);
    }
    if (!got) throw { code: 'resource_exhausted', message: 'Nummernkreis gerade gesperrt – bitte erneut versuchen.' };
    const snap = await ref.get(); const cur = snap.exists ? Object.assign({}, snap.data()) : {};
    const byKind = Object.assign({}, cur[kind] || {}); const n = (Number(byKind[year]) || 0) + 1;
    await writeRecord(n); // erst Beleg schreiben, dann Zähler erhöhen -> keine Lücken bei Fehlern
    byKind[year] = n; const next = clean(Object.assign({}, cur, { [kind]: byKind, updatedAt: nowIso() }));
    delete next.lease; D.meta.counters = next;
    await rawWrite(base() + '/meta/counters', 'set', next);
    return n;
  };

  /* ---------- Aktivitätsprotokoll (monatlich gebündelt) ---------- */
  let actBuf = []; let actTimer = null;
  const titleOf = (col, x) => {
    if (!x) return '';
    if (col === 'contacts') return [x.firstName, x.lastName].filter(Boolean).join(' ') || x.email || '';
    if (col === 'invoices' || col === 'quotes') return x.number || 'Entwurf';
    if (col === 'inquiries') return (x.raw && (x.raw.company || x.raw.name)) || 'Anfrage';
    if (col === 'notes') return String(x.text || '').replace(/\s+/g, ' ').slice(0, 60);
    return x.name || x.title || x.subject || '';
  };
  D.titleOf = titleOf;
  D.log = function (action, col, x, detail) {
    if (col === 'notifications' || col === 'scheduled') return;
    actBuf.push(clean({
      at: nowIso(), action, col, id: x && x.id, title: titleOf(col, x), detail: detail || '',
      companyId: (x && (col === 'companies' ? x.id : x.companyId)) || null, projectId: x && (col === 'projects' ? x.id : x.projectId) || null,
      dealId: x && (col === 'deals' ? x.id : x.dealId) || null
    }));
    clearTimeout(actTimer); actTimer = setTimeout(flushActivity, 1200);
  };
  async function flushActivity() {
    if (!actBuf.length || !D.db) return;
    const month = L.todayBerlin().slice(0, 7); const buf = actBuf; actBuf = [];
    const cur = (D.activityDocs || []).find(d => d.id === month) || { month, entries: [] };
    const entries = (cur.entries || []).concat(buf).slice(-700);
    const doc = { month, entries };
    D.activityDocs = [doc].concat((D.activityDocs || []).filter(d => d.id !== month).map(d => d)); doc.id = month;
    D.activity = [].concat(...D.activityDocs.map(d => d.entries || [])).sort((a, b) => (b.at > a.at ? 1 : -1)); changed();
    try { await rawWrite(base() + '/activity/' + month, 'set', { month, entries }); } catch (e) { console.warn('activity', e); }
  }
  D.flush = flushActivity;

  /* ---------- Automatisierungsprotokoll ---------- */
  let runBuf = []; let runTimer = null;
  D.logRun = function (run) { runBuf.push(clean(Object.assign({ at: nowIso() }, run))); D.autolog = runBuf.slice().reverse().concat(D.autolog); changed(); clearTimeout(runTimer); runTimer = setTimeout(flushRuns, 1000); };
  async function flushRuns() {
    if (!runBuf.length || !D.db) return;
    const month = L.todayBerlin().slice(0, 7); const buf = runBuf; runBuf = [];
    const cur = (D.autologDocs || []).find(d => d.id === month) || { month, runs: [] };
    const runs = (cur.runs || []).concat(buf).slice(-400);
    D.autologDocs = [{ id: month, month, runs }].concat((D.autologDocs || []).filter(d => d.id !== month));
    try { await rawWrite(base() + '/autolog/' + month, 'set', { month, runs }); } catch (e) { console.warn('autolog', e); }
  }

  /* ---------- Benachrichtigungen ---------- */
  D.notify = async function (title, body, link) {
    try {
      await D.create('notifications', { title, body: body || '', link: link || '', read: false }, { silent: true });
      const all = D.all('notifications').sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
      if (all.length > 150) for (const n of all.slice(0, all.length - 150)) D.hardDelete('notifications', n.id).catch(() => { });
    } catch (e) { console.warn(e); }
  };

  /* ---------- Export / Import ---------- */
  D.exportAll = function () {
    const out = { app: 'Agentur-Zentrale', version: 1, workspace: D.ws, exportedAt: nowIso(), collections: {}, meta: {} };
    for (const c of COLS) out.collections[c] = D.all(c, { withDeleted: true });
    for (const k of Object.keys(D.meta)) if (k !== 'counters') out.meta[k] = D.meta[k];
    out.meta.counters = D.meta.counters || {};
    out.activity = D.activityDocs || [];
    return out;
  };
  D.importAll = async function (data, onProgress) {
    if (!data || data.app !== 'Agentur-Zentrale' || !data.collections) throw { code: 'invalid_argument', message: 'Keine gültige Sicherungsdatei der Agentur-Zentrale.' };
    const ops = [];
    for (const c of COLS) for (const x of (data.collections[c] || [])) if (x && x.id) ops.push(['set', base() + '/' + c + '/' + x.id, Object.assign({}, x, D.ws === 'demo' ? { demo: true } : {})]);
    for (const k of Object.keys(data.meta || {})) ops.push(['set', base() + '/meta/' + k, data.meta[k]]);
    for (const a of (data.activity || [])) if (a && a.month) ops.push(['set', base() + '/activity/' + a.month, { month: a.month, entries: a.entries || [] }]);
    let i = 0;
    const worker = async () => { while (i < ops.length) { const op = ops[i++]; await rawWrite(op[1], op[0], clean(op[2])); if (onProgress) onProgress(i, ops.length); } };
    await Promise.all([worker(), worker(), worker()]);
    return ops.length;
  };
  D.wipeWorkspace = async function (onProgress) {
    const ops = [];
    for (const c of COLS) for (const x of D.cols[c].values()) ops.push(base() + '/' + c + '/' + x.id);
    for (const k of Object.keys(D.meta)) ops.push(base() + '/meta/' + k);
    for (const a of (D.activityDocs || [])) ops.push(base() + '/activity/' + a.id);
    for (const a of (D.autologDocs || [])) ops.push(base() + '/autolog/' + a.id);
    let i = 0;
    const worker = async () => { while (i < ops.length) { const p = ops[i++]; await rawWrite(p, 'delete'); if (onProgress) onProgress(i, ops.length); } };
    await Promise.all([worker(), worker(), worker()]);
    for (const c of COLS) D.cols[c] = new Map(); D.meta = {}; D.activity = []; D.autolog = []; changed();
    return ops.length;
  };
  D.counts = () => { let n = 0; for (const c of COLS) n += D.cols[c].size; return n + Object.keys(D.meta).length + (D.activityDocs || []).length + (D.autologDocs || []).length; };

  window.D = D;
})();
