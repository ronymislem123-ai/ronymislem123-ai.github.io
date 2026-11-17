/* LINUA Agentur-Zentrale – Anmeldung und geschützte Sitzung (Supabase Auth)
   Der Zugangscode wird ausschließlich serverseitig von Supabase Auth geprüft (als gehashtes Passwort
   des Inhaberkontos). Im Quellcode steht weder der Code noch ein Hash davon. */
(function () {
  'use strict';
  const CFG = window.ZENTRALE_CONFIG || {};
  const KEY = 'linua.zentrale.session';
  const ACT = 'linua.zentrale.activity';
  const IDLE_MS = Math.max(5, Number(CFG.idleMinutes) || 30) * 60000;
  const GATE = CFG.gate || '/zentrale/';
  const Z = { configured: !!(CFG.url && CFG.anonKey && CFG.email), idleMinutes: IDLE_MS / 60000 };
  const now = () => Date.now();

  function read() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write(s) { try { if (s) sessionStorage.setItem(KEY, JSON.stringify(s)); else sessionStorage.removeItem(KEY); } catch (e) { } }
  function lastActivity() { try { return Number(sessionStorage.getItem(ACT)) || 0; } catch (e) { return 0; } }
  function touch() { try { sessionStorage.setItem(ACT, String(now())); } catch (e) { } }
  function fromResponse(j) {
    return {
      access_token: j.access_token, refresh_token: j.refresh_token,
      expires_at: now() + (Number(j.expires_in) || 3600) * 1000,
      user: { id: j.user && j.user.id, email: j.user && j.user.email }
    };
  }
  function authPost(path, body, token) {
    const h = { apikey: CFG.anonKey, 'Content-Type': 'application/json' };
    if (token) h.Authorization = 'Bearer ' + token;
    return fetch(CFG.url + '/auth/v1/' + path, { method: 'POST', headers: h, body: JSON.stringify(body || {}), credentials: 'omit', cache: 'no-store' });
  }

  Z.session = () => read();
  Z.idle = () => { const s = read(); return !!s && now() - lastActivity() > IDLE_MS; };
  Z.valid = () => { const s = read(); return !!(s && s.refresh_token && !Z.idle()); };

  Z.login = async function (code) {
    if (!Z.configured) throw { code: 'not_configured' };
    code = String(code == null ? '' : code).trim();
    if (!code) throw { code: 'empty' };
    let res;
    try { res = await authPost('token?grant_type=password', { email: CFG.email, password: code }); } catch (e) { throw { code: 'network' }; }
    if (res.status === 429) throw { code: 'rate' };
    if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 422) throw { code: 'wrong' };
    if (!res.ok) throw { code: 'server', status: res.status };
    const s = fromResponse(await res.json());
    write(s); touch();
    // Zweite serverseitige Prüfung: Ist dieses Konto als Administrator der Zentrale eingetragen?
    let admin = null;
    try {
      const r = await fetch(CFG.url + '/rest/v1/rpc/zentrale_is_admin', { method: 'POST', headers: { apikey: CFG.anonKey, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: '{}', credentials: 'omit', cache: 'no-store' });
      admin = r.ok ? (await r.json()) === true : false;
    } catch (e) { admin = null; }
    if (admin !== true) { await Z.logout(); throw { code: admin === null ? 'network' : 'forbidden' }; }
    return s;
  };

  let refreshing = null;
  Z.refresh = function (force) {
    const s = read();
    if (!s || !s.refresh_token) return Promise.reject({ code: 'revoked' });
    if (!force && s.expires_at - now() > 60000) return Promise.resolve(s);
    if (refreshing) return refreshing;
    refreshing = (async () => {
      let res;
      try { res = await authPost('token?grant_type=refresh_token', { refresh_token: s.refresh_token }); } catch (e) { throw { code: 'unavailable' }; }
      if (!res.ok) { write(null); throw { code: 'revoked' }; }
      const n = fromResponse(await res.json()); write(n); return n;
    })().finally(() => { refreshing = null; });
    return refreshing;
  };

  Z.token = async function () {
    if (Z.idle()) { Z.expire('inaktiv'); throw { code: 'revoked' }; }
    const s = await Z.refresh(false);
    return s.access_token;
  };

  Z.logout = async function () {
    const s = read(); write(null);
    try { sessionStorage.removeItem(ACT); } catch (e) { }
    if (s && s.access_token && Z.configured) { try { await authPost('logout?scope=local', {}, s.access_token); } catch (e) { } }
  };

  Z.go = function (url) { Z.redirecting = true; location.replace(url); };
  Z.expire = function (reason) {
    Z.redirecting = true;
    write(null);
    try { sessionStorage.removeItem(ACT); } catch (e) { }
    location.replace(GATE + (reason ? '?grund=' + encodeURIComponent(reason) : ''));
  };

  /* Schutz für die App-Seite: ohne gültige Sitzung sofort zurück zur Code-Eingabe */
  Z.guard = function () {
    if (!Z.configured) { Z.expire('einrichtung'); return false; }
    if (!read()) { Z.expire(''); return false; }
    if (Z.idle()) { Z.expire('inaktiv'); return false; }
    touch();
    let last = 0;
    const mark = () => { const t = now(); if (t - last > 5000) { last = t; touch(); } };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => window.addEventListener(ev, mark, { passive: true, capture: true }));
    setInterval(() => { if (!read()) Z.expire('abgemeldet'); else if (Z.idle()) Z.expire('inaktiv'); }, 15000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Z.idle()) Z.expire('inaktiv'); });
    return true;
  };

  // Seitenübergänge: Weiterleitungen (z. B. ohne Sitzung) brechen einen laufenden Übergang ab – das ist gewollt, kein Fehler
  ['pagereveal', 'pageswap'].forEach(t => window.addEventListener(t, e => {
    const vt = e.viewTransition; if (!vt) return;
    if (Z.redirecting) { try { vt.skipTransition(); } catch (x) { } }
    [vt.ready, vt.finished, vt.updateCallbackDone].forEach(pr => { if (pr && pr.catch) pr.catch(() => { }); });
  }));

  window.ZAuth = Z;
})();
