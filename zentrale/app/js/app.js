/* Agentur-Zentrale – App-Rahmen: Navigation, Router, Suche, Schnellanlage, Start */
(function () {
  'use strict';
  const esc = F.esc;
  const App = window.App = { VERSION: '2.0.0', state: {} };
  const NAV = [
    { g: 'Übersicht', items: [['dashboard', 'Dashboard', 'dashboard'], ['aufgaben', 'Aufgaben', 'checkSquare'], ['kalender', 'Kalender', 'calendar']] },
    { g: 'Vertrieb', items: [['anfragen', 'Anfragen', 'inbox'], ['pipeline', 'Pipeline', 'kanban'], ['kunden', 'Kunden', 'users'], ['email', 'E-Mail', 'mail']] },
    { g: 'Umsetzung', items: [['projekte', 'Projekte', 'folderKanban'], ['dokumente', 'Dokumente', 'folder']] },
    { g: 'Finanzen', items: [['angebote', 'Angebote', 'fileText'], ['rechnungen', 'Rechnungen', 'receipt'], ['finanzen', 'Finanzen', 'wallet']] },
    { g: 'Steuerung', items: [['automatisierungen', 'Automatisierungen', 'zap'], ['freigaben', 'Freigaben', 'shield'], ['ki', 'KI-Assistent', 'sparkles'], ['einstellungen', 'Einstellungen', 'settings']] }
  ];

  /* ---------- UI-Zustand (Komfort, nur in diesem Browser) ---------- */
  let uiState = {}; try { uiState = JSON.parse(localStorage.getItem('zentrale.ui') || '{}') || {}; } catch (e) { uiState = {}; }
  App.ui = v => (uiState[v] = uiState[v] || {});
  App.saveUi = F.debounce(() => { try { localStorage.setItem('zentrale.ui', JSON.stringify(uiState)); } catch (e) { } }, 300);
  App.theme = () => { try { return localStorage.getItem('zentrale.theme') || 'system'; } catch (e) { return 'system'; } };
  App.applyTheme = () => { const t = App.theme(); const dark = t === 'dark' || (t === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; };
  App.setTheme = t => { try { localStorage.setItem('zentrale.theme', t); } catch (e) { } App.applyTheme(); };
  App.applyTheme(); if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', App.applyTheme);

  /* ---------- Routing ---------- */
  App.route = () => { const h = (location.hash || '#dashboard').slice(1); const m = h.match(/^([a-z]+)-([a-z0-9]+)$/i); if (m && V[m[1]] && V[m[1]].parent) return { view: m[1], id: m[2] }; return { view: V[h] ? h : 'dashboard', id: null }; };
  App.go = h => { if (UI.closeMenu) UI.closeMenu(); if (location.hash.slice(1) === h) App.render(); else location.hash = h; closeSide(); };
  App.ctxPre = () => { const r = App.route(); if (r.view === 'kunde') return { companyId: r.id }; if (r.view === 'projekt') { const p = D.get('projects', r.id); return { projectId: r.id, companyId: p && p.companyId }; } return {}; };
  window.addEventListener('hashchange', () => { window.scrollTo(0, 0); App.render(true); });

  /* ---------- Rahmen ---------- */
  function counts() {
    const t = L.todayBerlin();
    return { anfragen: D.all('inquiries').filter(q => q.status === 'neu').length, aufgaben: D.all('tasks').filter(x => x.status !== 'erledigt' && x.due && x.due <= t).length, freigaben: D.all('approvals').filter(a => a.status === 'offen').length, rechnungen: D.all('invoices').filter(i => L.daysOverdue(i, t) > 0).length };
  }
  function shell() {
    const s = D.settings(); const c = counts(); const r = App.route(); const active = V[r.view] && V[r.view].parent ? V[r.view].parent : r.view;
    const side = document.getElementById('side');
    side.innerHTML = '<div class="brand"><div class="mark" aria-hidden="true"><svg viewBox="0 0 64 64" width="22" height="22"><rect x="14" y="41" width="36" height="4" rx="2" fill="currentColor"/><circle cx="32" cy="27" r="7" fill="var(--accent-dot)"/></svg></div><div><b>Agenturzentrale</b><small class="ellipsis">' + esc(s.businessName || 'Webdesign-Business') + '</small></div></div>' +
      '<div class="ws-switch" role="group" aria-label="Arbeitsbereich"><button class="' + (D.ws === 'live' ? 'on' : '') + '" data-act="toLive">Echte Daten</button><button class="' + (D.ws === 'demo' ? 'on demo' : '') + '" data-act="toDemo">Demo</button></div>' +
      NAV.map(g => '<div class="nav-group">' + g.g + '</div><nav class="nav">' + g.items.map(([k, l, i]) => '<a href="#' + k + '" class="' + (active === k ? 'on' : '') + '">' + ic(i) + '<span>' + l + '</span>' + (c[k] ? '<span class="cnt ' + (k === 'anfragen' || k === 'freigaben' ? 'hot' : '') + '">' + c[k] + '</span>' : '') + '</a>').join('') + '</nav>').join('') +
      '<div class="side-foot"><div class="sync ' + (D.status !== 'ok' ? 'err' : D.pending ? 'busy' : '') + '"><span class="dot"></span>' + (D.status === 'ok' ? (D.pending ? 'Speichert …' : 'Gespeichert') : D.status === 'connecting' ? 'Verbinde …' : 'Nicht verbunden') + '</div>' +
      '<div class="row wrap gap-4"><a href="#system" class="faint">Systemstatus</a>·<a href="#papierkorb" class="faint">Papierkorb</a>·<a href="#aktivitaet" class="faint">Protokoll</a></div><div class="row" style="justify-content:space-between"><span class="faint tiny">v' + App.VERSION + '</span><button type="button" class="btn xs ghost" data-act="logout">' + ic('lock', 's') + 'Abmelden</button></div></div>';
    const bn = document.getElementById('bottom-nav');
    bn.innerHTML = [['dashboard', 'Start', 'home'], ['anfragen', 'Anfragen', 'inbox'], ['aufgaben', 'Aufgaben', 'checkSquare'], ['pipeline', 'Pipeline', 'kanban']].map(([k, l, i]) => '<a href="#' + k + '" class="' + (active === k ? 'on' : '') + '">' + ic(i) + (c[k] ? '<span class="cnt">' + c[k] + '</span>' : '') + l + '</a>').join('') + '<a href="#" data-act="openSide">' + ic('menu') + 'Mehr</a>';
    const v = V[r.view]; const crumb = v && v.crumb ? v.crumb(r.id) : '';
    document.getElementById('top-title').innerHTML = v && v.parent ? '<a class="crumb" href="#' + v.parent + '">' + esc(V[v.parent].title) + '</a><span class="crumb">/</span><span class="ellipsis">' + esc(crumb) + '</span>' : esc(v ? v.title : '');
    const unread = D.all('notifications').filter(n => !n.read).length;
    document.getElementById('bell').innerHTML = ic('bell') + (unread ? '<span class="badge-dot"></span>' : '');
    document.getElementById('demo-band').innerHTML = D.ws === 'demo' ? ic('flask') + '<span class="long">DEMO-MODUS – fiktive Beispieldaten, getrennt von deinen echten Daten. Nichts davon fließt in echte Kennzahlen.</span><span class="short">DEMO – fiktive Beispieldaten</span><button class="btn xs" data-act="toLive">Zu echten Daten</button>' : '';
    document.getElementById('demo-band').classList.toggle('hide', D.ws !== 'demo');
    document.title = (v ? (crumb || v.title) + ' · ' : '') + 'Agentur-Zentrale';
  }

  /* ---------- Rendern ---------- */
  let lastKey = '';
  App.render = function (navigated) {
    const content = document.getElementById('app-content'); if (!content) return;
    shell();
    if (D.status === 'offline' || D.status === 'revoked') { content.innerHTML = '<div class="card" style="max-width:620px;margin:40px auto">' + UI.empty('lock', 'Datenspeicher nicht verfügbar', D.error || 'Bitte neu anmelden.') + '</div>'; return; }
    if (!D.loaded) { content.innerHTML = '<div class="card" style="max-width:520px;margin:60px auto;text-align:center"><div class="faint">' + (D.status === 'slow' ? 'Die Daten können noch nicht erreicht werden – Verbindung wird weiter versucht …' : D.status === 'error' ? esc(D.error) : 'Lade deine Unternehmenszentrale …') + '</div></div>'; return; }
    if (document.querySelector('.kcard.ghost')) return; // Drag & Drop läuft
    const r = App.route(); const v = V[r.view];
    const key = r.view + ':' + (r.id || '');
    const ae = document.activeElement; const focusId = ae && ae.id && content.contains(ae) ? ae.id : null; const selS = focusId && ae.selectionStart, selE = focusId && ae.selectionEnd;
    let html = '';
    try { html = v.render(r.id); } catch (e) { console.error(e); html = '<div class="note bad">' + ic('alert') + '<span>Ansicht konnte nicht geladen werden: ' + esc(e.message || e) + '</span></div>'; }
    content.innerHTML = html;
    if (key !== lastKey) { content.style.animation = 'none'; void content.offsetWidth; content.style.animation = ''; }
    lastKey = key;
    try { if (v.mount) v.mount(content, r.id); } catch (e) { console.error(e); }
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); try { el.setSelectionRange(selS, selE); } catch (e) { } } }
    void navigated;
  };
  const scheduleRender = (() => { let q = false; return () => { if (q) return; q = true; requestAnimationFrame(() => { q = false; App.render(); }); }; })();

  /* ---------- Suche & Befehlspalette ---------- */
  App.search = function (q) {
    q = String(q || '').trim().toLowerCase(); if (!q) return [];
    const out = []; const hit = (s) => String(s || '').toLowerCase().includes(q);
    for (const c of D.all('companies')) if (hit(c.name) || hit(c.email) || hit(c.website) || hit((c.address || {}).city) || hit(c.industry)) out.push({ type: 'Kunde', icon: 'users', title: c.name, meta: L.labelOf(L.COMPANY_STATUS, c.status), href: 'kunde-' + c.id, id: c.id });
    for (const p of D.all('contacts')) if (hit(F.personName(p)) || hit(p.email) || hit(p.phone)) out.push({ type: 'Kontakt', icon: 'user', title: F.personName(p), meta: O.companyName(p.companyId), href: 'kunde-' + p.companyId, id: p.id });
    for (const d of D.all('deals')) if (hit(d.title)) out.push({ type: 'Deal', icon: 'kanban', title: d.title, meta: L.stageLabel(d.stage), act: () => V.dealDrawer(d.id), id: d.id });
    for (const p of D.all('projects')) if (hit(p.name)) out.push({ type: 'Projekt', icon: 'folderKanban', title: p.name, meta: O.companyName(p.companyId), href: 'projekt-' + p.id, id: p.id });
    for (const x of D.all('quotes')) if (hit(x.number) || hit(x.title)) out.push({ type: 'Angebot', icon: 'fileText', title: (x.number || 'Entwurf') + ' · ' + (x.title || ''), meta: O.companyName(x.companyId), href: 'angebot-' + x.id, id: x.id });
    for (const x of D.all('invoices')) if (hit(x.number) || hit(x.customerName)) out.push({ type: 'Rechnung', icon: 'receipt', title: (x.number || 'Entwurf'), meta: O.companyName(x.companyId) + ' · ' + F.money(L.totals(x).gross), href: 'rechnung-' + x.id, id: x.id });
    for (const t of D.all('tasks')) if (t.status !== 'erledigt' && hit(t.title)) out.push({ type: 'Aufgabe', icon: 'checkSquare', title: t.title, meta: t.due ? F.rel(t.due) : '', act: () => E.task(t), id: t.id });
    for (const d of D.all('documents')) if (hit(d.name)) out.push({ type: 'Dokument', icon: 'paperclip', title: d.name, meta: O.companyName(d.companyId), url: Docs.url(d), id: d.id });
    for (const n of D.all('notes')) if (hit(n.text)) out.push({ type: 'Notiz', icon: 'note', title: String(n.text).slice(0, 70), meta: O.companyName(n.companyId), act: () => E.note(n), id: n.id });
    return out.slice(0, 60);
  };
  const COMMANDS = [
    ['Neue Anfrage erfassen', 'inbox', () => E.inquiry()], ['Neuer Kunde', 'userPlus', () => E.company()], ['Neue Aufgabe', 'checkSquare', () => E.task(null, App.ctxPre())],
    ['Neuer Termin', 'calendar', () => E.event(null, App.ctxPre())], ['Neue Verkaufschance', 'kanban', () => E.deal(null, App.ctxPre())], ['Neues Projekt', 'folderKanban', () => E.project(null, App.ctxPre())],
    ['Neues Angebot', 'fileText', () => ACT.newQuote()], ['Neue Rechnung', 'receipt', () => V.newInvoiceDialog(App.ctxPre())], ['Ausgabe erfassen', 'wallet', () => E.expense()], ['Notiz', 'note', () => E.note(null, App.ctxPre())],
    ['Dokument hochladen', 'upload', () => V.uploadDialog(App.ctxPre())], ['E-Mail verfassen', 'mail', () => E.emailCompose({})], ['Dunkles/helles Design umschalten', 'moon', () => { App.setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); App.render(); }]
  ];
  App.cmdk = function () {
    let sel = 0, results = [];
    const dlg = UI.dialog({ raw: true, cls: 'cmdk', body: '<div class="q">' + ic('search') + '<input id="cmdk-in" placeholder="Suchen oder Befehl … (Kunden, Projekte, Rechnungen, Aufgaben)" autocomplete="off"><kbd>Esc</kbd></div><div class="res" id="cmdk-res"></div>' });
    const inp = dlg.el.querySelector('#cmdk-in'), res = dlg.el.querySelector('#cmdk-res');
    const draw = () => {
      const q = inp.value.trim(); const navs = NAV.flatMap(g => g.items).concat([['system', 'Systemstatus', 'activity'], ['papierkorb', 'Papierkorb', 'trash'], ['aktivitaet', 'Aktivitätsprotokoll', 'history']]).filter(([, l]) => !q || l.toLowerCase().includes(q.toLowerCase())).map(([k, l, i]) => ({ group: 'Gehe zu', icon: i, title: l, href: k }));
      const cmds = COMMANDS.filter(([l]) => !q || l.toLowerCase().includes(q.toLowerCase())).map(([l, i, fn]) => ({ group: 'Aktionen', icon: i, title: l, act: fn }));
      const found = App.search(q).map(r => Object.assign({ group: 'Treffer' }, r));
      results = q ? found.concat(cmds, navs).slice(0, 40) : cmds.slice(0, 6).concat(navs);
      if (sel >= results.length) sel = 0;
      let g = ''; res.innerHTML = results.length ? results.map((r, i) => (r.group !== g ? '<div class="grp">' + esc((g = r.group)) + '</div>' : '') + '<button data-i="' + i + '" class="' + (i === sel ? 'sel' : '') + '">' + ic(r.icon) + '<span class="ellipsis">' + esc(r.title) + '</span><span class="m">' + esc(r.type ? r.type + (r.meta ? ' · ' + r.meta : '') : r.meta || '') + '</span></button>').join('') : '<div class="empty small">Keine Treffer für „' + esc(q) + '“</div>';
      const s = res.querySelector('.sel'); if (s) s.scrollIntoView({ block: 'nearest' });
    };
    const run = i => { const r = results[i]; if (!r) return; dlg.close(); if (r.href) App.go(r.href); else if (r.url) window.open(r.url, '_blank', 'noopener'); else if (r.act) r.act(); };
    inp.addEventListener('input', () => { sel = 0; draw(); });
    inp.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { sel = Math.min(results.length - 1, sel + 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); } else if (e.key === 'Enter') { run(sel); e.preventDefault(); } });
    res.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) run(Number(b.dataset.i)); });
    draw(); setTimeout(() => inp.focus(), 20);
  };
  App.quickMenu = el => UI.menu(el, [{ heading: true, label: 'Schnell anlegen' }].concat(COMMANDS.slice(0, 12).map(([l, i, fn]) => ({ label: l.replace(/^Neue?r? /, ''), icon: i, fn }))));

  /* ---------- Arbeitsbereiche & Demo ---------- */
  const ACT = window.ACT;
  ACT.openSide = (el, e) => { if (e) e.preventDefault(); document.getElementById('side').classList.add('open'); document.getElementById('side-scrim').classList.remove('hide'); };
  function closeSide() { const s = document.getElementById('side'); if (s) s.classList.remove('open'); const sc = document.getElementById('side-scrim'); if (sc) sc.classList.add('hide'); }
  ACT.toLive = () => { if (D.ws !== 'live') { A.resetState(); D.setWorkspace('live'); UI.toast('Echte Daten'); } closeSide(); };
  ACT.toDemo = () => {
    if (D.ws !== 'demo') { A.resetState(); D.setWorkspace('demo'); }
    closeSide();
    const wait = () => { if (!D.loaded) return setTimeout(wait, 200); if (!D.COLS.some(c => D.cols[c].size)) UI.confirm({ title: 'Demo-Daten erzeugen?', text: 'Der Demo-Arbeitsbereich ist leer. Sollen fiktive Beispieldaten (Kunden, Pipeline, Projekte, Rechnungen …) erzeugt werden? Sie bleiben vollständig getrennt von deinen echten Daten.', ok: 'Demo erzeugen' }).then(ok => { if (ok) ACT.genDemo(); }); };
    wait();
  };
  ACT.genDemo = async () => {
    if (D.ws !== 'demo') return UI.toast('Demo-Daten nur im Demo-Arbeitsbereich', { bad: true });
    const t = UI.dialog({ title: 'Demo wird erzeugt …', body: '<div class="progress"><i id="dp" style="width:0"></i></div><div class="faint small" id="dt" style="margin-top:6px">Bitte kurz warten.</div>', sticky: true });
    try {
      if (D.COLS.some(c => D.cols[c].size)) await D.wipeWorkspace();
      const data = Demo.build(L.todayBerlin()); data.app = 'Agentur-Zentrale';
      await D.importAll(data, (i, all) => { const p = t.el.querySelector('#dp'); if (p) p.style.width = (100 * i / all) + '%'; const x = t.el.querySelector('#dt'); if (x) x.textContent = i + ' / ' + all + ' Einträge'; });
      A.resetState(); UI.toast('Demo bereit – viel Spaß beim Ausprobieren'); App.go('dashboard');
    } catch (e) { UI.err(e); } finally { t.close(); }
  };

  /* ---------- Ereignis-Delegation ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act],[data-href]'); if (!t) return;
    if (t.dataset.act) {
      const fn = ACT[t.dataset.act]; if (!fn) return;
      if (t.tagName === 'A' || t.tagName === 'BUTTON' || t.closest('a[href="#"]')) { if (t.getAttribute('href') === '#' || t.tagName === 'BUTTON') e.preventDefault(); }
      if (t.tagName === 'INPUT') { fn(t, e); return; }
      fn(t, e); return;
    }
    const inner = e.target.closest('a[href],button,input,select,label,textarea');
    if (inner && t.contains(inner) && inner !== t) return;
    App.go(t.dataset.href);
  });
  document.addEventListener('change', e => { const t = e.target.closest('[data-act-change]'); if (t && ACT[t.dataset.actChange]) ACT[t.dataset.actChange](t, e); });
  const inputHandlers = {
    kundenQ: v => { App.ui('kunden').q = v; }, pipeQ: v => { App.ui('pipeline').q = v; }, projQ: v => { App.ui('projekte').q = v; }, docQ: v => { App.ui('dokumente').q = v; }
  };
  const inputRender = F.debounce(() => { App.saveUi(); App.render(); }, 160);
  document.addEventListener('input', e => { const t = e.target.closest('[data-input]'); if (t && inputHandlers[t.dataset.input]) { inputHandlers[t.dataset.input](t.value); inputRender(); } });
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!document.querySelector('.cmdk')) App.cmdk(); return; }
    if (e.key === 'Escape') { if (UI.closeMenu()) return; if (UI.closeTop()) return; closeSide(); }
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('kcard')) e.target.click();
  });

  /* ---------- Start ---------- */
  async function start() {
    document.getElementById('searchbtn').onclick = () => App.cmdk();
    document.getElementById('quickbtn').onclick = e => App.quickMenu(e.currentTarget);
    document.getElementById('fab').onclick = e => App.quickMenu(e.currentTarget);
    document.getElementById('bell').onclick = e => ACT.notifications(e.currentTarget);
    document.getElementById('menubtn').onclick = () => ACT.openSide();
    document.getElementById('side-scrim').onclick = closeSide;
    document.getElementById('side').addEventListener('click', e => { if (e.target.closest('a[href^="#"]') && e.target.closest('a').getAttribute('href') !== '#') closeSide(); });
    D.onWriteError = msg => UI.toast(msg, { bad: true });
    D.onChange(scheduleRender);
    App.render();
    const ok = await D.connect();
    Promise.all([Mail.init(), AI.init(), Docs.init()]).then(() => scheduleRender()).catch(() => { });
    if (!ok) return App.render();
    let started = false;
    D.onChange(() => {
      if (!started && D.loaded && D.status === 'ok') {
        started = true; A.resetState(); setTimeout(() => A.start(), 600);
        setInterval(() => { if (document.visibilityState === 'visible' && window.Inbox) Inbox.pull().then(n => { if (n) scheduleRender(); }).catch(() => scheduleRender()); }, 120000);
        const s = D.settings(); let dismissed = false; try { dismissed = sessionStorage.getItem('zentrale.setup') === '1'; } catch (e) { }
        if (D.ws === 'live' && !s.setupDone && !dismissed) setTimeout(() => {
          try { sessionStorage.setItem('zentrale.setup', '1'); } catch (e) { }
          UI.dialog({ title: 'Willkommen in deiner Agentur-Zentrale', body: '<p class="muted mt-0">Alles an einem Ort: Anfragen, Kunden, Pipeline, Projekte, Aufgaben, Angebote, Rechnungen, Finanzen und Automatisierungen.</p><div class="stack tight"><div class="row">' + ic('circleCheck') + '<span>Daten werden dauerhaft gespeichert – nur du hast Zugriff.</span></div><div class="row">' + ic('shield') + '<span>Nichts geht ohne deine Freigabe nach außen.</span></div><div class="row">' + ic('flask') + '<span>Demo mit Beispieldaten – strikt getrennt.</span></div></div>', foot: '<button class="btn" data-close>Später</button><button class="btn" data-x="demo">' + ic('flask') + 'Demo ansehen</button><button class="btn primary" data-x="setup">Firmendaten einrichten</button>', onMount: (el, close) => { el.querySelector('[data-x="demo"]').onclick = () => { close(); ACT.toDemo(); }; el.querySelector('[data-x="setup"]').onclick = () => { close(); App.ui('einstellungen').tab = 'firma'; App.go('einstellungen'); }; } });
        }, 400);
      }
      if (started && D.status === 'ok' && D.loaded && App._ws !== D.ws) { App._ws = D.ws; A.resetState(); setTimeout(() => A.runScheduled(), 400); }
    });
  }
  ACT.logout = () => { if (window.Runtime) Runtime.logout(); };
  const boot = () => { if (window.ZAuth && ZAuth.guard()) start(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
