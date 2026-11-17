/* Agentur-Zentrale – Ansichten: Helfer, Dashboard, Anfragen, Pipeline, Kunden, Kundenakte */
(function () {
  'use strict';
  const V = window.V = window.V || {}; const ACT = window.ACT = window.ACT || {};
  const esc = F.esc; const today = () => L.todayBerlin(); const S = () => D.settings();

  /* ================= gemeinsame Helfer ================= */
  const H = window.H = {};
  H.avatar = (name, cls) => '<span class="avatar ' + (cls || '') + '" style="background:' + F.hashColor(name) + '">' + esc(F.initials(name)) + '</span>';
  const stageTone = { neu: 'accent', nicht_kontaktiert: '', erstkontakt: 'info', beratung: 'info', angebot_in_arbeit: 'violet', angebot_versendet: 'violet', nachfassen: 'warn', verhandlung: 'warn', gewonnen: 'good', verloren: '' };
  H.stage = s => '<span class="chip ' + (stageTone[s] || '') + '">' + esc(L.stageLabel(s)) + '</span>';
  const cTone = { lead: 'accent', interessent: 'info', kunde: 'good', inaktiv: '', verloren: '' };
  H.cstatus = s => '<span class="chip ' + (cTone[s] || '') + '"><i class="d"></i>' + esc(L.labelOf(L.COMPANY_STATUS, s)) + '</span>';
  const pTone = { geplant: '', aktiv: 'info', review: 'violet', pausiert: 'warn', abgeschlossen: 'good' };
  H.pstatus = s => '<span class="chip ' + (pTone[s] || '') + '">' + esc(L.labelOf(L.PROJECT_STATUS, s)) + '</span>';
  H.prio = p => p === 'hoch' ? '<span class="chip bad">Hoch</span>' : p === 'niedrig' ? '<span class="chip">Niedrig</span>' : '';
  H.qstatus = s => '<span class="chip ' + ({ entwurf: '', freigabe: 'warn', versendet: 'info', angenommen: 'good', abgelehnt: 'bad', abgelaufen: '' }[s] || '') + '">' + esc(L.labelOf(L.QUOTE_STATUS, s)) + '</span>';
  H.istatus = inv => {
    const st = inv.status; const od = L.daysOverdue(inv, today());
    if (st === 'entwurf') return '<span class="chip">Entwurf</span>';
    if (st === 'storniert') return '<span class="chip outline">Storniert</span>';
    if (inv.type === 'storno') return '<span class="chip outline">Storno</span>';
    if (st === 'bezahlt') return '<span class="chip good">Bezahlt</span>';
    if (od) return '<span class="chip bad">' + od + ' T. überfällig' + ((inv.reminders || []).length ? ' · ' + L.DUNNING_LABELS[(inv.reminders || []).length] : '') + '</span>';
    if (st === 'teilbezahlt') return '<span class="chip warn">Teilbezahlt</span>';
    return '<span class="chip info">' + (inv.sentAt ? 'Versendet' : 'Festgeschrieben') + '</span>';
  };
  H.co = id => { const c = D.get('companies', id); return c ? '<a href="#kunde-' + c.id + '">' + esc(c.name) + '</a>' : '<span class="faint">–</span>'; };
  H.info = t => '<span class="info" title="' + esc(t) + '">' + ic('info', 's') + '</span>';
  H.kpi = o => '<div class="kpi' + (o.href ? ' link' : '') + '"' + (o.href ? ' data-href="' + o.href + '"' : '') + '><div class="lbl">' + (o.icon ? ic(o.icon, 's') : '') + esc(o.label) + (o.def ? H.info(o.def) : '') + '</div>' +
    (o.value == null ? '<div class="val na" title="Keine Daten im Zeitraum">unvollständig</div>' : '<div class="val">' + o.value + '</div>') + (o.sub ? '<div class="sub">' + o.sub + '</div>' : '') + '</div>';
  H.delta = (cur, prev, goodUp) => {
    if (prev == null || cur == null || (!prev && !cur)) return '';
    if (!prev) return '<span class="delta flat">neu</span>';
    const d = (cur - prev) / Math.abs(prev); const up = d > 0.005, dn = d < -0.005; const good = goodUp === false ? dn : up;
    return '<span class="delta ' + (up || dn ? (good ? 'up' : 'down') : 'flat') + '">' + (up ? '▲' : dn ? '▼' : '■') + ' ' + F.pct(Math.abs(d)) + '</span>';
  };
  H.taskRow = (t, o) => {
    o = o || {}; const late = t.status !== 'erledigt' && t.due && t.due < today();
    const link = t.projectId ? '<a href="#projekt-' + t.projectId + '">' + esc((D.get('projects', t.projectId) || {}).name || '') + '</a>' : t.companyId ? H.co(t.companyId) : '';
    return '<div class="li" data-task="' + t.id + '"><button class="check ' + (t.status === 'erledigt' ? 'on' : '') + '" data-act="toggleTask" data-id="' + t.id + '" aria-label="Erledigt">' + ic('check') + '</button>' +
      '<div class="grow"><div class="t ' + (t.status === 'erledigt' ? 'done-t' : '') + '">' + esc(t.title) + '</div><div class="m row wrap gap-4">' +
      (t.due ? '<span class="' + (late ? 'chip bad' : '') + '">' + ic('clock', 's') + ' ' + F.rel(t.due) + '</span>' : '') + (t.assignee === 'kunde' ? '<span class="chip warn">Kunde</span>' : '') + (t.kind === 'followup' ? '<span class="chip info">Wiedervorlage</span>' : '') + (t.kind === 'duplicate' ? '<span class="chip violet">Duplikat?</span>' : '') +
      (t.recurrence && t.recurrence !== 'none' ? '<span title="Wiederkehrend">' + ic('repeat', 's') + '</span>' : '') + (o.noLink ? '' : link) + '</div></div>' + H.prio(t.priority) +
      '<button class="btn ghost xs icon" data-act="taskMenu" data-id="' + t.id + '" aria-label="Mehr">' + ic('more') + '</button></div>';
  };
  H.sortRows = (rows, key, dir, getters) => { const g = getters[key]; if (!g) return rows; return rows.slice().sort((a, b) => { const x = g(a), y = g(b); const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'de', { numeric: true }); return dir === 'desc' ? -r : r; }); };
  H.th = (view, key, label, cls) => { const st = App.ui(view); const on = st.sort === key; return '<th class="sort ' + (cls || '') + '" data-act="sort" data-view="' + view + '" data-key="' + key + '">' + esc(label) + (on ? ' <span class="arr">' + (st.dir === 'desc' ? '↓' : '↑') + '</span>' : '') + '</th>'; };
  ACT.sort = el => { const st = App.ui(el.dataset.view); if (st.sort === el.dataset.key) st.dir = st.dir === 'desc' ? 'asc' : 'desc'; else { st.sort = el.dataset.key; st.dir = 'asc'; } App.saveUi(); App.render(); };
  ACT.toggleTask = el => UI.run(async () => { const t = await O.completeTask(el.dataset.id); if (t && t.status === 'erledigt') UI.toast('Erledigt' + (t.recurrence && t.recurrence !== 'none' ? ' – nächste Wiederholung angelegt' : ''), { action: { label: 'Rückgängig', fn: () => O.completeTask(t.id, false) } }); });
  ACT.taskMenu = el => {
    const t = D.get('tasks', el.dataset.id); if (!t) return;
    UI.menu(el, [
      { label: 'Bearbeiten', icon: 'pencil', fn: () => E.task(t) },
      { label: 'Auf morgen verschieben', icon: 'clock', fn: () => UI.run(() => D.update('tasks', t.id, { due: L.addWorkdays(today(), 1, S().state) }), 'Verschoben') },
      { label: 'Auf nächste Woche', icon: 'calendar', fn: () => UI.run(() => D.update('tasks', t.id, { due: L.addWorkdays(today(), 5, S().state) }), 'Verschoben') },
      t.kind === 'duplicate' ? { label: 'Duplikat prüfen & zusammenführen', icon: 'layers', fn: () => V.mergeDialog(t.companyId, t.candidates) } : null,
      { sep: true }, { label: 'Löschen', icon: 'trash', danger: true, fn: () => UI.run(() => D.softDelete('tasks', t.id), 'In den Papierkorb verschoben') }
    ]);
  };
  H.periodSeg = (view, val) => '<div class="seg" role="tablist">' + [['monat', 'Monat'], ['quartal', 'Quartal'], ['jahr', 'Jahr']].map(([k, l]) => '<button class="' + (val === k ? 'on' : '') + '" data-act="setUi" data-view="' + view + '" data-k="period" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
  ACT.setUi = el => { const st = App.ui(el.dataset.view); st[el.dataset.k] = el.dataset.v; App.saveUi(); App.render(); };

  /* Zeitachse für Kunde / Projekt */
  H.timelineItems = function (f) {
    const it = [];
    const add = (at, icon, t, m, x, href) => { if (at) it.push({ at: String(at), icon, t, m, x, href }); };
    for (const q of D.all('inquiries').filter(f)) add(q.receivedAt, 'inbox', 'Anfrage eingegangen' + (q.category ? ' · ' + L.labelOf(L.PROJECT_TYPES, q.category.projectType) : ''), L.labelOf(L.CHANNELS, q.channel), q.raw && q.raw.message);
    for (const c of D.all('comms').filter(f)) add(c.at, c.direction === 'in' ? 'mail' : 'send', (c.direction === 'in' ? 'Eingang: ' : 'Gesendet: ') + (c.subject || L.labelOf(L.CHANNELS, c.channel)), c.to ? 'an ' + c.to : '', c.snippet);
    for (const n of D.all('notes').filter(f)) add(n.at && n.at.length === 10 ? n.at + 'T12:00:00' : n.createdAt, 'note', { notiz: 'Notiz', gespraech: 'Gesprächsprotokoll', anruf: 'Anruf', meeting: 'Meeting' }[n.kind] || 'Notiz', '', n.text, '#note-' + n.id);
    for (const e of D.all('events').filter(f)) add(e.start, 'calendar', 'Termin: ' + e.title, F.dateTime(e.start) + (e.location ? ' · ' + e.location : ''), e.notes);
    for (const d of D.all('deals').filter(f)) for (const h of (d.stageHistory || [])) add(h.at, 'kanban', d.title + ': ' + L.stageLabel(h.stage), '', h.stage === 'verloren' && d.lostReason ? 'Grund: ' + d.lostReason : '');
    for (const q of D.all('quotes').filter(f)) { add(q.createdAt, 'fileText', 'Angebot ' + (q.number || 'Entwurf') + ' erstellt', F.money(L.totals(q).net) + ' netto', '', '#angebot-' + q.id); if (q.sentAt) add(q.sentAt, 'send', 'Angebot ' + q.number + ' versendet'); if (q.acceptedAt) add(q.acceptedAt, 'circleCheck', 'Angebot ' + q.number + ' angenommen'); }
    for (const i of D.all('invoices').filter(f)) { if (i.finalizedAt) add(i.finalizedAt, 'receipt', (i.title || 'Rechnung') + ' ' + i.number, F.money(L.totals(i).gross), '', '#rechnung-' + i.id); for (const p of (i.payments || [])) add(p.date + 'T12:00:00', 'euro', 'Zahlung ' + F.money(p.amount) + ' zu ' + i.number, p.note); for (const r of (i.reminders || [])) add(r.date + 'T12:00:00', 'alert', L.DUNNING_LABELS[r.level] + ' zu ' + i.number); }
    for (const p of D.all('projects').filter(f)) { add(p.createdAt, 'folderKanban', 'Projekt angelegt: ' + p.name, '', '', '#projekt-' + p.id); if (p.completedAt) add(p.completedAt, 'flag', 'Projekt abgeschlossen: ' + p.name); for (const m of (p.milestones || []).filter(m => m.done && m.doneAt)) add(m.doneAt, 'target', 'Meilenstein erreicht: ' + m.title); }
    for (const t of D.all('tasks').filter(f).filter(t => t.status === 'erledigt' && t.doneAt)) add(t.doneAt, 'check', 'Erledigt: ' + t.title);
    for (const d of D.all('documents').filter(f)) add(d.uploadedAt || d.createdAt, 'paperclip', 'Dokument: ' + d.name, L.labelOf(L.DOC_CATEGORIES, d.category));
    for (const a of D.activity.filter(a => f(a) && (a.action === 'status' || a.action === 'merge') && a.col === 'companies')) add(a.at, 'user', a.detail || 'Status geändert');
    return it.sort((a, b) => (b.at > a.at ? 1 : -1));
  };
  H.timeline = (items, limit) => items.length ? '<div class="timeline">' + items.slice(0, limit || 200).map(i => '<div class="tl"><div class="ic">' + ic(i.icon) + '</div><div class="b"><div class="t">' + (i.href && !i.href.startsWith('#note') ? '<a href="' + i.href + '">' + esc(i.t) + '</a>' : esc(i.t)) + '</div><div class="m">' + F.dateTime(i.at).replace(', 12:00', '') + (i.m ? ' · ' + esc(i.m) : '') + '</div>' + (i.x ? '<div class="x">' + esc(String(i.x).slice(0, 700)) + '</div>' : '') + '</div></div>').join('') + '</div>' : UI.empty('history', 'Noch kein Verlauf', 'Sobald Anfragen, E-Mails, Notizen, Angebote oder Rechnungen dazukommen, erscheinen sie hier chronologisch.');

  /* ================= Dashboard ================= */
  const WIDGETS = [
    ['kunden', 'Kunden'], ['anfragen', 'Neue Anfragen'], ['projekte', 'Laufende Projekte'], ['fertig', 'Abgeschlossene Projekte'], ['angebote', 'Offene Angebote'], ['winloss', 'Gewonnen / verloren'],
    ['umsatz', 'Umsatz'], ['zahlungen', 'Zahlungseingang'], ['offen', 'Offene Rechnungen'], ['ueberfaellig', 'Ausstehende Zahlungen'], ['mrr', 'Wiederkehrende Einnahmen'],
    ['termine', 'Anstehende Termine'], ['aufgaben', 'Überfällige Aufgaben'], ['pipeline', 'Pipeline (gewichtet)'], ['gewinn', 'Vorläufiger Gewinn'],
    ['c_umsatz', 'Diagramm: Umsatz & Zahlungen'], ['c_kunden', 'Diagramm: Kundenwachstum'], ['c_conv', 'Diagramm: Anfragen & Aufträge'], ['c_pipe', 'Pipeline nach Phase'], ['c_proj', 'Projektfortschritt'], ['feed', 'Vertriebsaktivitäten'], ['heute', 'Heute']
  ];
  V.dashboard = {
    title: 'Dashboard', icon: 'dashboard',
    render() {
      const st = App.ui('dashboard'); const period = st.period || 'monat'; const t = today(); const s = S(); const snap = D.snapshot();
      const R = L.periodRange(period, t), P = L.periodRange(period, t, -1);
      const on = k => { const w = s.dashboardWidgets; return !w || w[k] !== false; };
      const hr = Number(new Date().toLocaleString('de-DE', { hour: 'numeric', hour12: false, timeZone: 'Europe/Berlin' }));
      const hello = (hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Guten Tag' : 'Guten Abend') + (s.ownerName ? ', ' + esc(s.ownerName.split(' ')[0]) : '');
      const newInq = snap.inquiries.filter(q => q.status === 'neu');
      const todayTasks = snap.tasks.filter(x => x.status !== 'erledigt' && x.due && x.due <= t);
      const overdue = snap.tasks.filter(x => x.status !== 'erledigt' && x.due && x.due < t);
      const appr = snap.approvals.filter(a => a.status === 'offen');
      const rev = L.revenue(snap.invoices, R), revP = L.revenue(snap.invoices, P);
      const pay = L.paymentsIn(snap.invoices, R), payP = L.paymentsIn(snap.invoices, P);
      const rec = L.receivables(snap.invoices, t); const mrr = L.mrr(snap.contracts, t);
      const pipe = L.pipeline(snap.deals, s); const sales = L.salesStats(snap.deals, snap.inquiries, R);
      const exp = L.expensesIn(snap.expenses, R, s); const profit = L.r2(pay.net - exp.total);
      const series = L.monthlySeries(snap, t, 12);
      const running = snap.projects.filter(p => ['geplant', 'aktiv', 'review'].includes(p.status));
      const crit = running.filter(p => L.projectHealth(p, snap.tasks, t, s.state).level === 'red').length;
      const upcoming = snap.events.filter(e => e.start && L.dateOf(e.start) >= t && L.dateOf(e.start) <= L.addDays(t, 7)).sort((a, b) => (a.start > b.start ? 1 : -1));
      const openQuotes = snap.quotes.filter(q => q.status === 'versendet');
      const customers = snap.companies.filter(c => c.status === 'kunde');
      const anyData = D.COLS.some(c => c !== 'notifications' && D.cols[c].size);
      const k = [];
      if (on('kunden')) k.push(H.kpi({ label: 'Kunden', icon: 'users', href: 'kunden', value: F.num(customers.length), sub: '+' + customers.filter(c => L.inRange(L.dateOf(c.becameCustomerAt), R)).length + ' im Zeitraum · ' + snap.companies.filter(c => ['lead', 'interessent'].includes(c.status)).length + ' Interessenten', def: 'Datensätze mit Status „Kunde“. Interessenten = Status Lead oder Interessent.' }));
      if (on('anfragen')) k.push(H.kpi({ label: 'Neue Anfragen', icon: 'inbox', href: 'anfragen', value: F.num(newInq.length), sub: sales.inquiries + ' im Zeitraum eingegangen', def: 'Unbearbeitete Anfragen (Status „neu“).' }));
      if (on('projekte')) k.push(H.kpi({ label: 'Laufende Projekte', icon: 'folderKanban', href: 'projekte', value: F.num(running.length), sub: crit ? '<span class="chip bad">' + crit + ' kritisch</span>' : 'alle im Plan oder ohne Warnung', def: 'Projekte mit Status Geplant, In Arbeit oder Abnahme.' }));
      if (on('fertig')) k.push(H.kpi({ label: 'Abgeschlossene Projekte', icon: 'flag', href: 'projekte', value: F.num(snap.projects.filter(p => p.status === 'abgeschlossen' && L.inRange(L.dateOf(p.completedAt), R)).length), sub: snap.projects.filter(p => p.status === 'abgeschlossen').length + ' insgesamt', def: 'Im Zeitraum abgeschlossene Projekte.' }));
      if (on('angebote')) k.push(H.kpi({ label: 'Offene Angebote', icon: 'fileText', href: 'angebote', value: F.num(openQuotes.length), sub: F.money(openQuotes.reduce((a, q) => a + L.totals(q).net, 0), 0) + ' netto', def: 'Versendete Angebote ohne Annahme/Ablehnung, noch gültig.' }));
      if (on('winloss')) k.push(H.kpi({ label: 'Gewonnen / verloren', icon: 'handshake', href: 'pipeline', value: sales.won + ' / ' + sales.lost, sub: 'Gewinnquote ' + (sales.winRate == null ? '–' : F.pct(sales.winRate)), def: 'Im Zeitraum gewonnene bzw. verlorene Deals. Gewinnquote = gewonnen / (gewonnen + verloren).' }));
      if (on('umsatz')) k.push(H.kpi({ label: 'Umsatz (netto)', icon: 'trending', href: 'finanzen', value: F.money(rev, 0), sub: H.delta(rev, revP) + ' ggü. ' + esc(P.label) + Viz_spark(series.map(x => x.revenue)), def: 'Summe der Netto-Rechnungsbeträge mit Rechnungsdatum im Zeitraum, abzüglich Stornos. Nur festgeschriebene Rechnungen, keine Demo-Daten.' }));
      if (on('zahlungen')) k.push(H.kpi({ label: 'Zahlungseingang', icon: 'euro', href: 'finanzen', value: F.money(pay.gross, 0), sub: H.delta(pay.gross, payP.gross) + ' · netto ' + F.money(pay.net, 0), def: 'Tatsächlich eingegangene Zahlungen im Zeitraum (brutto; netto anteilig).' }));
      if (on('offen')) k.push(H.kpi({ label: 'Offene Rechnungen', icon: 'receipt', href: 'rechnungen', value: F.money(rec.total, 0), sub: rec.count + ' Rechnung(en) offen', def: 'Festgeschriebene, nicht (vollständig) bezahlte Rechnungen (brutto).' }));
      if (on('ueberfaellig')) k.push(H.kpi({ label: 'Ausstehende Zahlungen', icon: 'alert', href: 'rechnungen', value: F.money(rec.overdue, 0), sub: rec.overdueCount ? '<span class="chip bad">' + rec.overdueCount + ' überfällig</span>' : 'nichts überfällig', def: 'Davon überfällig (nach Fälligkeitsdatum).' }));
      if (on('mrr')) k.push(H.kpi({ label: 'Wiederkehrend / Monat', icon: 'repeat', href: 'finanzen', value: F.money(mrr, 0), sub: snap.contracts.filter(c => c.active !== false).length + ' aktive Verträge', def: 'Summe aktiver Monatsverträge (Wartung, Hosting, Betreuung); Jahresverträge ÷ 12, Quartal ÷ 3.' }));
      if (on('termine')) k.push(H.kpi({ label: 'Anstehende Termine', icon: 'calendar', href: 'kalender', value: F.num(upcoming.length), sub: upcoming[0] ? 'Nächster: ' + esc(upcoming[0].title) + ' · ' + F.rel(upcoming[0].start) : 'nächste 7 Tage', def: 'Termine in den nächsten 7 Tagen.' }));
      if (on('aufgaben')) k.push(H.kpi({ label: 'Überfällige Aufgaben', icon: 'checkSquare', href: 'aufgaben', value: F.num(overdue.length), sub: todayTasks.length - overdue.length + ' heute fällig', def: 'Offene Aufgaben mit Fälligkeit vor heute.' }));
      if (on('pipeline')) k.push(H.kpi({ label: 'Pipeline gewichtet', icon: 'kanban', href: 'pipeline', value: F.money(pipe.weighted, 0), sub: F.money(pipe.value, 0) + ' gesamt · ' + pipe.count + ' Deals', def: 'Summe offener Deals × Wahrscheinlichkeit je Phase (Annahmen in den Einstellungen).' }));
      if (on('gewinn')) k.push(H.kpi({ label: 'Vorläufiger Gewinn', icon: 'coins', href: 'finanzen', value: F.money(profit, 0), sub: 'vor Steuern · Zufluss − Abfluss', def: 'Zahlungseingänge (netto) minus bezahlte Betriebsausgaben im Zeitraum. Vorläufig, vor Steuern.' }));
      let html = '<div class="hero"><div><div class="hello">' + hello + '</div><div class="big">' + F.weekdayName(t) + ', ' + Number(t.slice(8, 10)) + '. ' + L.MONTHS[Number(t.slice(5, 7)) - 1] + '</div></div><div class="focus">' +
        '<a href="#anfragen" class="' + (newInq.length ? 'hot' : '') + '">' + ic('inbox') + '<b>' + newInq.length + '</b> neue Anfragen</a>' +
        '<a href="#aufgaben" class="' + (overdue.length ? 'hot' : '') + '">' + ic('checkSquare') + '<b>' + todayTasks.length + '</b> fällig' + (overdue.length ? ' (' + overdue.length + ' überfällig)' : '') + '</a>' +
        '<a href="#freigaben" class="' + (appr.length ? 'hot' : '') + '">' + ic('shield') + '<b>' + appr.length + '</b> Freigaben</a></div></div>';
      if (!anyData && D.ws === 'live') html += '<div class="card" style="margin-bottom:14px"><div class="row wrap gap-12"><div class="grow"><b>Willkommen in deiner Zentrale.</b><div class="muted small">Noch keine Daten. Leg los mit einer Anfrage oder einem Kunden – oder sieh dir zuerst die Demo mit Beispieldaten an. Kennzahlen entstehen ausschließlich aus deinen echten Daten.</div></div><button class="btn" data-act="newInquiry">' + ic('inbox') + 'Anfrage erfassen</button><button class="btn" data-act="newCompany">' + ic('userPlus') + 'Kunde anlegen</button><button class="btn" data-act="toDemo">' + ic('flask') + 'Demo ansehen</button></div></div>';
      html += '<div class="toolbar"><b class="muted">Kennzahlen · ' + esc(R.label) + '</b><span class="grow"></span>' + H.periodSeg('dashboard', period) + '<button class="btn sm" data-act="dashCustomize">' + ic('settings', 's') + 'Ansicht anpassen</button></div>';
      html += '<div class="kpis">' + k.join('') + '</div>';
      const charts = [];
      if (on('c_umsatz')) charts.push('<div class="card"><div class="card-h"><h3>Umsatz & Zahlungseingang</h3><span class="sub">letzte 12 Monate</span><div class="tools">' + H.info('Umsatz = Netto-Rechnungsbeträge nach Rechnungsdatum. Zahlungseingang = tatsächlich eingegangene Zahlungen (brutto).') + '</div></div><div id="ch-umsatz"></div></div>');
      if (on('c_kunden')) charts.push('<div class="card"><div class="card-h"><h3>Kundenwachstum</h3><span class="sub">Kunden gesamt, 12 Monate</span></div><div id="ch-kunden"></div></div>');
      if (on('c_conv')) charts.push('<div class="card"><div class="card-h"><h3>Anfragen & gewonnene Aufträge</h3><span class="sub">Conversion ' + (sales.conversion == null ? '–' : F.pct(sales.conversion)) + ' im Zeitraum</span></div><div id="ch-conv"></div></div>');
      if (on('c_pipe')) charts.push('<div class="card"><div class="card-h"><h3>Pipeline nach Phase</h3><span class="sub">offene Deals, netto</span><div class="tools"><a class="btn xs" href="#pipeline">Öffnen</a></div></div>' + Viz_hbars(L.OPEN_STAGES.map(id => ({ label: L.stageLabel(id), value: pipe.byStage[id].value }))) + '</div>');
      if (on('c_proj')) charts.push('<div class="card"><div class="card-h"><h3>Projektfortschritt</h3><div class="tools"><a class="btn xs" href="#projekte">Alle</a></div></div>' + (running.length ? '<div class="list">' + running.slice(0, 7).map(p => { const pr = L.projectProgress(p, snap.tasks); const h = L.projectHealth(p, snap.tasks, t, s.state); return '<a class="li click" href="#projekt-' + p.id + '" style="text-decoration:none;color:inherit"><span class="health ' + h.level + '" title="' + esc(h.label + (h.reasons.length ? ': ' + h.reasons.join(', ') : '')) + '"></span><div class="grow"><div class="t ellipsis">' + esc(p.name) + '</div><div class="progress" style="margin-top:6px"><i style="width:' + pr + '%"></i></div></div><b class="num small">' + pr + ' %</b></a>'; }).join('') + '</div>' : UI.empty('folderKanban', 'Keine laufenden Projekte', 'Gewonnene Aufträge werden automatisch zu Projekten.')) + '</div>');
      if (on('feed')) {
        const feed = D.activity.filter(a => ['inquiries', 'deals', 'quotes', 'comms', 'notes', 'events'].includes(a.col) && a.action !== 'update').slice(0, 9);
        charts.push('<div class="card"><div class="card-h"><h3>Aktuelle Vertriebsaktivitäten</h3><div class="tools"><a class="btn xs" href="#aktivitaet">Protokoll</a></div></div>' + (feed.length ? '<div class="list">' + feed.map(a => '<div class="li"><span class="faint">' + ic({ inquiries: 'inbox', deals: 'kanban', quotes: 'fileText', comms: 'mail', notes: 'note', events: 'calendar' }[a.col]) + '</span><div class="grow"><div class="ellipsis">' + esc(actionText(a)) + '</div><div class="m">' + F.ago(a.at) + '</div></div></div>').join('') + '</div>' : '<div class="faint small">Noch keine Aktivitäten.</div>') + '</div>');
      }
      if (on('heute')) charts.push('<div class="card"><div class="card-h"><h3>Heute</h3><div class="tools"><button class="btn xs" data-act="newTask">' + ic('plus', 's') + 'Aufgabe</button></div></div>' + (todayTasks.length ? '<div class="list">' + todayTasks.sort((a, b) => (a.due > b.due ? 1 : -1)).slice(0, 8).map(x => H.taskRow(x)).join('') + '</div>' : '<div class="faint small" style="padding:6px 0 10px">Keine fälligen Aufgaben. 🎯</div>') +
        (upcoming.length ? '<div class="divider"></div><div class="list">' + upcoming.slice(0, 4).map(e => '<div class="li click" data-act="editEvent" data-id="' + e.id + '"><span class="chip accent">' + F.dateShort(e.start) + ' ' + F.time(e.start) + '</span><div class="grow ellipsis">' + esc(e.title) + '</div></div>').join('') + '</div>' : '') + '</div>');
      html += '<div class="grid g2" style="margin-top:14px">' + charts.join('') + '</div>';
      return html;
    },
    mount() {
      const t = today(); const snap = D.snapshot(); const series = L.monthlySeries(snap, t, 12);
      const lbl = series.map(x => x.label), tips = series.map(x => L.monthLabel(x.from));
      const e1 = document.getElementById('ch-umsatz'); if (e1) UI.Viz.bars(e1, { labels: lbl, tipLabels: tips, money: true, aria: 'Umsatz und Zahlungseingang je Monat', series: [{ name: 'Umsatz netto', color: 'var(--s1)', values: series.map(x => x.revenue) }, { name: 'Zahlungseingang brutto', color: 'var(--s2)', values: series.map(x => x.payments) }] });
      const e2 = document.getElementById('ch-kunden');
      if (e2) { const before = D.all('companies').filter(c => c.becameCustomerAt && L.dateOf(c.becameCustomerAt) < series[0].from).length; let acc = before; UI.Viz.line(e2, { labels: lbl, tipLabels: tips, aria: 'Kunden gesamt je Monat', fmt: v => F.num(v) + ' Kunden', series: [{ name: 'Kunden gesamt', color: 'var(--s1)', area: true, values: series.map(x => (acc += x.newCustomers)) }] }); }
      const e3 = document.getElementById('ch-conv'); if (e3) UI.Viz.bars(e3, { labels: lbl, tipLabels: tips, aria: 'Anfragen und gewonnene Aufträge', fmt: v => F.num(v), series: [{ name: 'Anfragen', color: 'var(--s1)', values: series.map(x => x.inquiries) }, { name: 'Gewonnene Aufträge', color: 'var(--s3)', values: series.map(x => x.won) }] });
    }
  };
  const Viz_spark = vals => ' ' + UI.Viz.spark(vals, 'var(--s1)');
  const Viz_hbars = rows => UI.Viz.hbars(rows);
  function actionText(a) {
    const what = D.LABELS[a.col] || a.col;
    const verb = { create: 'angelegt', update: 'geändert', delete: 'gelöscht', restore: 'wiederhergestellt', stage: '', sent: 'versendet', accepted: 'angenommen', rejected: 'abgelehnt', done: 'erledigt', finalize: '', payment: '', status: '' }[a.action];
    return a.detail ? what + ' „' + a.title + '“: ' + a.detail : what + ' „' + a.title + '“ ' + (verb == null ? a.action : verb);
  }
  H.actionText = actionText;
  ACT.dashCustomize = () => {
    const s = S(); const w = s.dashboardWidgets || {};
    UI.form({
      title: 'Dashboard anpassen', size: 'wide', values: Object.fromEntries(WIDGETS.map(([k]) => [k, w[k] !== false])), submit: 'Übernehmen',
      fields: WIDGETS.map(([k, l]) => ({ key: k, type: 'checkbox', text: l })),
      onSubmit: async v => { await D.setMeta('settings', { dashboardWidgets: v }); UI.toast('Dashboard gespeichert'); }
    });
  };

  /* ================= Anfragen ================= */
  V.anfragen = {
    title: 'Anfragen', icon: 'inbox',
    render() {
      const st = App.ui('anfragen'); const f = st.f || 'neu'; const s = S();
      const all = D.all('inquiries').sort((a, b) => (b.receivedAt > a.receivedAt ? 1 : -1));
      const groups = { neu: all.filter(q => q.status === 'neu'), in_bearbeitung: all.filter(q => q.status === 'in_bearbeitung'), beantwortet: all.filter(q => q.status === 'beantwortet'), archiviert: all.filter(q => q.status === 'archiviert'), alle: all };
      const list = groups[f] || all;
      const gm = '<button class="btn" data-act="inboxPull">' + ic('refresh') + 'Website-Anfragen abrufen</button>' + (Mail.available ? '<button class="btn" data-act="gmailImport">' + ic('mail') + 'Aus Gmail abrufen</button>' : '');
      let html = '<div class="page-head"><div><h2>Anfragen</h2><p>Eingehende Projektanfragen – automatisch kategorisiert, dem CRM zugeordnet und in der Pipeline.</p></div><div class="actions">' + gm + '<button class="btn primary" data-act="newInquiry">' + ic('plus') + 'Anfrage erfassen</button></div></div>';
      if (window.Inbox && Inbox.error) html += '<div class="note warn" style="margin-bottom:14px">' + ic('info') + '<span>Website-Anfragen konnten gerade nicht abgerufen werden (' + esc(Inbox.error) + '). Die Zentrale versucht es automatisch erneut.</span></div>';
      if (false) html += '<div class="note" style="margin-bottom:14px">' + ic('info') + '<span><b>Website-Anfragen automatisch übernehmen:</b> Dein Website-Formular schickt eine E-Mail mit Betreff „' + esc(s.inquirySubjectKeyword || 'Projektanfrage') + '“ an dein Gmail – die Zentrale liest sie über den Gmail-Connector ein. <a href="#einstellungen" data-act="settingsTab" data-tab="website">Einrichten</a></span></div>';
      html += '<div class="toolbar"><div class="pill-filter">' + [['neu', 'Neu'], ['in_bearbeitung', 'In Bearbeitung'], ['beantwortet', 'Beantwortet'], ['archiviert', 'Archiv'], ['alle', 'Alle']].map(([k, l]) => '<button class="' + (f === k ? 'on' : '') + '" data-act="setUi" data-view="anfragen" data-k="f" data-v="' + k + '">' + l + ' <span class="faint">' + groups[k].length + '</span></button>').join('') + '</div></div>';
      if (!list.length) return html + '<div class="card">' + UI.empty('inbox', f === 'neu' ? 'Keine neuen Anfragen' : 'Keine Anfragen in dieser Ansicht', 'Neue Anfragen erscheinen hier automatisch – über das Kontaktformular der Website oder manuell erfasst.', '<button class="btn primary" data-act="newInquiry">' + ic('plus') + 'Anfrage erfassen</button>') + '</div>';
      html += '<div class="stack">' + list.map(q => {
        const r = q.raw || {}, c = q.category || {}; const co = D.get('companies', q.companyId);
        const dupChip = q.dup && q.dup.result === 'zugeordnet' ? '<span class="chip info" title="' + esc(q.dup.reason || '') + '">Bestehendem Kunden zugeordnet</span>' : q.dup && q.dup.result === 'unsicher' ? '<span class="chip violet">Mögliches Duplikat</span>' : '<span class="chip accent">Neuer Lead</span>';
        return '<div class="card"><div class="row start gap-12">' + H.avatar(r.company || r.name || r.email) + '<div class="grow"><div class="row wrap"><b style="font-size:14px">' + esc(r.company || r.name || r.email || 'Unbekannt') + '</b>' + (r.company && r.name ? '<span class="muted">' + esc(r.name) + '</span>' : '') +
          '<span class="chip ' + (c.priority === 'A' ? 'bad' : c.priority === 'B' ? 'warn' : '') + '" title="Score ' + (c.score || 0) + '/100">Priorität ' + esc(c.priority || '–') + '</span>' + dupChip + '<span class="grow"></span><span class="faint small">' + F.ago(q.receivedAt) + ' · ' + esc(L.labelOf(L.CHANNELS, q.channel)) + '</span></div>' +
          '<div class="row wrap gap-4" style="margin:6px 0"><span class="chip outline">' + esc(L.labelOf(L.PROJECT_TYPES, c.projectType)) + '</span><span class="chip outline">Budget: ' + esc(r.budget || L.labelOf(L.BUDGET_BANDS, c.budgetBand)) + '</span><span class="chip outline">Dringlichkeit: ' + esc(L.labelOf(L.URGENCY, c.urgency)) + '</span>' + (c.industry ? '<span class="chip outline">' + esc(c.industry) + '</span>' : '') + (r.deadline ? '<span class="chip outline">' + ic('clock', 's') + esc(r.deadline) + '</span>' : '') + '</div>' +
          (r.message ? '<div class="muted" style="white-space:pre-wrap;max-height:4.4em;overflow:hidden">' + esc(r.message) + '</div>' : '') +
          '<div class="row wrap small muted" style="margin-top:6px">' + (r.email ? ic('mail', 's') + esc(r.email) : '') + (r.phone ? ' ' + ic('phone', 's') + '<a href="tel:' + esc(r.phone) + '">' + esc(r.phone) + '</a>' : '') + (r.website ? ' ' + ic('globe', 's') + esc(L.normDomain(r.website) || r.website) : '') + '</div>' +
          '<div class="row wrap" style="margin-top:10px">' + (co ? '<a class="btn sm" href="#kunde-' + co.id + '">' + ic('user', 's') + 'Kundenakte</a>' : '') + '<button class="btn sm primary" data-act="answerInquiry" data-id="' + q.id + '">' + ic('send', 's') + 'Antworten</button>' +
          (AI.available ? '<button class="btn sm" data-act="aiInquiry" data-id="' + q.id + '">' + ic('sparkles', 's') + 'Zusammenfassen</button>' : '') +
          (q.status !== 'beantwortet' ? '<button class="btn sm ghost" data-act="inqStatus" data-id="' + q.id + '" data-s="beantwortet">' + ic('check', 's') + 'Beantwortet</button>' : '') +
          (q.status !== 'archiviert' ? '<button class="btn sm ghost" data-act="inqStatus" data-id="' + q.id + '" data-s="archiviert">' + ic('archive', 's') + 'Archivieren</button>' : '<button class="btn sm ghost" data-act="inqStatus" data-id="' + q.id + '" data-s="in_bearbeitung">Zurückholen</button>') +
          (q.dup && q.dup.result === 'unsicher' ? '<button class="btn sm ghost" data-act="mergeFromInquiry" data-id="' + q.id + '">' + ic('layers', 's') + 'Duplikat prüfen</button>' : '') +
          '</div><div class="ai-out" id="ai-' + q.id + '"></div></div></div></div>';
      }).join('') + '</div>';
      return html;
    }
  };
  ACT.newInquiry = () => E.inquiry();
  ACT.inqStatus = el => UI.run(() => D.update('inquiries', el.dataset.id, { status: el.dataset.s }), 'Status aktualisiert');
  ACT.answerInquiry = el => {
    const q = D.get('inquiries', el.dataset.id); const r = q.raw || {}; const s = S();
    const base = O.renderTemplate('antwort_anfrage', O.vars({ name: r.name || r.company || '', termin1: F.weekdayName(L.addWorkdays(today(), 2, s.state)) + ', ' + F.date(L.addWorkdays(today(), 2, s.state)) + ', 10:00 Uhr', termin2: F.weekdayName(L.addWorkdays(today(), 3, s.state)) + ', ' + F.date(L.addWorkdays(today(), 3, s.state)) + ', 15:00 Uhr' }));
    E.emailCompose({ title: 'Antwort an ' + (r.name || r.company || r.email), to: r.email, subject: base.subject, body: base.body, refs: { companyId: q.companyId, contactId: q.contactId, dealId: q.dealId }, threadId: q.gmailThreadId,
      ai: 'Formuliere eine persönliche, kurze Antwort auf diese Website-Projektanfrage. Bedanke dich, greife 1–2 konkrete Punkte aus der Anfrage auf, stelle bis zu 2 gezielte Rückfragen und schlage ein 20-minütiges Kennenlerngespräch mit zwei Terminoptionen vor (' + base.body.split('\n').filter(l => l.startsWith('–')).join(' ') + '). Keine Preise nennen.\n\nAnfrage:\n' + JSON.stringify(r) });
    if (q.status === 'neu') D.update('inquiries', q.id, { status: 'in_bearbeitung' }, { silent: true }).catch(() => { });
    if (q.dealId) { const d = D.get('deals', q.dealId); if (d && ['neu', 'nicht_kontaktiert'].includes(d.stage)) O.setDealStage(d.id, 'erstkontakt').catch(() => { }); }
  };
  ACT.aiInquiry = async el => {
    const q = D.get('inquiries', el.dataset.id); const out = document.getElementById('ai-' + q.id); if (!out) return;
    out.innerHTML = '<div class="note" style="margin-top:10px">' + ic('sparkles') + '<span class="grow" id="aitxt-' + q.id + '">KI denkt nach …</span></div>';
    const span = document.getElementById('aitxt-' + q.id);
    try { const r = await AI.ask(AI.SYSTEM + '\n\nFasse diese Projektanfrage in 3 Stichpunkten zusammen (Bedarf, Rahmen, offene Fragen) und gib eine Einschätzung (1 Satz), wie vielversprechend sie ist und warum. Keine Markdown-Überschriften.\n\n' + JSON.stringify({ anfrage: q.raw, kategorie: q.category }), { modelTier: 'quick', onText: x => { span.textContent = x.text; } }); span.textContent = r.text; }
    catch (e) { span.textContent = AI.errorText(e); }
  };
  ACT.inboxPull = async el => { el.disabled = true; try { const n = await Inbox.pull(); UI.toast(n ? n + ' neue Anfrage(n) übernommen' : 'Keine neuen Website-Anfragen'); } catch (e) { UI.err(e); } finally { el.disabled = false; App.render(); } };
  ACT.gmailImport = async el => { el.disabled = true; try { const n = await Mail.importInquiries(true); UI.toast(n ? n + ' neue Anfrage(n) übernommen' : 'Keine neuen Website-Anfragen gefunden'); } catch (e) { UI.err(e); } finally { el.disabled = false; } };
  ACT.mergeFromInquiry = el => { const q = D.get('inquiries', el.dataset.id); V.mergeDialog(q.companyId, (q.dup && q.dup.candidates) || []); };

  /* Zusammenführen-Dialog */
  V.mergeDialog = function (companyId, candidates) {
    const a = D.get('companies', companyId); if (!a) return UI.toast('Kunde nicht gefunden', { bad: true });
    const others = (candidates || []).map(c => D.get('companies', c.companyId)).filter(x => x && x.id !== a.id);
    const all = D.all('companies').filter(c => c.id !== a.id);
    const counts = id => ['contacts', 'deals', 'projects', 'quotes', 'invoices'].map(col => D.all(col).filter(x => x.companyId === id).length).reduce((x, y) => x + y, 0);
    UI.form({
      title: 'Dubletten prüfen & zusammenführen', size: 'wide', submit: 'Zusammenführen', values: { other: others[0] ? others[0].id : '', keep: 'other' },
      intro: '<div class="note warn" style="margin-bottom:12px">' + ic('alert') + '<span>Es wird nie automatisch zusammengeführt. Wähle den Datensatz, der erhalten bleibt. Kontakte, Deals, Projekte, Angebote, Aufgaben, Notizen und Dokumente werden übertragen; leere Felder ergänzt. Der andere Datensatz kommt in den Papierkorb (wiederherstellbar).</span></div>',
      fields: [
        { type: 'html', full: true, html: '<div class="card flat tight"><b>' + esc(a.name) + '</b> <span class="faint small">(neu bzw. aktuell, ' + counts(a.id) + ' verknüpfte Einträge)</span><div class="small muted">' + esc([a.email, a.phone, a.website].filter(Boolean).join(' · ') || 'keine Kontaktdaten') + '</div></div>' },
        { key: 'other', label: 'Vergleichen mit', type: 'select', options: (others.length ? others : []).concat(all.filter(c => !others.includes(c))).map(c => ({ id: c.id, label: c.name + ' (' + L.labelOf(L.COMPANY_STATUS, c.status) + ', ' + counts(c.id) + ' Einträge)' })), full: true, required: true },
        { key: 'keep', label: 'Behalten', type: 'select', options: [['other', 'Den älteren / ausgewählten Datensatz behalten'], ['this', '„' + a.name + '“ behalten']], full: true }
      ],
      footLeft: '<button class="btn ghost sm" data-notdup>Kein Duplikat</button>',
      onMount: (el, close) => { el.querySelector('[data-notdup]').onclick = async () => { for (const t of D.all('tasks').filter(t => t.kind === 'duplicate' && t.companyId === a.id && t.status !== 'erledigt')) await O.completeTask(t.id, true); for (const q of D.all('inquiries').filter(q => q.companyId === a.id && q.dup && q.dup.result === 'unsicher')) await D.update('inquiries', q.id, { dup: Object.assign({}, q.dup, { result: 'neu', reason: 'Als kein Duplikat bestätigt' }) }, { silent: true }); UI.toast('Als eigenständig bestätigt'); close(true); }; },
      onSubmit: async v => {
        const keep = v.keep === 'this' ? a.id : v.other, drop = v.keep === 'this' ? v.other : a.id;
        const ok = await UI.confirm({ title: 'Wirklich zusammenführen?', text: '„' + D.get('companies', drop).name + '“ wird in „' + D.get('companies', keep).name + '“ übernommen.', ok: 'Zusammenführen' }); if (!ok) return false;
        await O.mergeCompanies(keep, drop); UI.toast('Zusammengeführt'); App.go('kunde-' + keep);
      }
    });
  };

  /* ================= Pipeline ================= */
  V.pipeline = {
    title: 'Pipeline', icon: 'kanban',
    render() {
      const st = App.ui('pipeline'); const mode = st.mode || 'board'; const period = st.period || 'monat'; const s = S(); const t = today();
      const R = L.periodRange(period, t); const deals = D.all('deals'); const sales = L.salesStats(deals, D.all('inquiries'), R); const pipe = L.pipeline(deals, s);
      const q = (st.q || '').toLowerCase();
      const vis = deals.filter(d => !q || (d.title + ' ' + O.companyName(d.companyId)).toLowerCase().includes(q)).filter(d => st.closed === 'show' || !['gewonnen', 'verloren'].includes(d.stage) || L.diffDays(L.dateOf(d.wonAt || d.lostAt || d.updatedAt), t) <= 30);
      let html = '<div class="page-head"><div><h2>Vertriebs-Pipeline</h2><p>Leads per Drag & Drop zwischen den Phasen verschieben (mobil: lange drücken). Automatisierungen laufen bei jedem Phasenwechsel.</p></div><div class="actions"><button class="btn primary" data-act="newDeal">' + ic('plus') + 'Verkaufschance</button></div></div>';
      html += '<div class="toolbar"><b class="muted">Vertriebsleistung · ' + esc(R.label) + '</b><span class="grow"></span>' + H.periodSeg('pipeline', period) + '</div>';
      html += '<div class="kpis scroll-m" style="margin-bottom:16px">' +
        H.kpi({ label: 'Neue Leads', value: F.num(sales.newLeads), sub: sales.inquiries + ' Anfragen', def: 'Im Zeitraum angelegte Deals.' }) +
        H.kpi({ label: 'Conversion', value: sales.conversion == null ? null : F.pct(sales.conversion, 1), sub: 'Anfrage → Auftrag', def: 'Gewonnene Aufträge / Anfragen im Zeitraum.' }) +
        H.kpi({ label: 'Ø Auftragswert', value: sales.avgDeal == null ? null : F.money(sales.avgDeal, 0), sub: sales.won + ' gewonnen', def: 'Summe gewonnener Auftragswerte / Anzahl.' }) +
        H.kpi({ label: 'Erfolgsquote', value: sales.winRate == null ? null : F.pct(sales.winRate), sub: sales.won + ' gewonnen · ' + sales.lost + ' verloren', def: 'Gewonnen / (gewonnen + verloren) im Zeitraum.' }) +
        H.kpi({ label: 'Umsatzpotenzial', value: F.money(pipe.value, 0), sub: 'gewichtet ' + F.money(pipe.weighted, 0), def: 'Summe offener Deals; gewichtet mit Wahrscheinlichkeit je Phase (Annahme, in Einstellungen änderbar).' }) +
        H.kpi({ label: 'Ø Abschlussdauer', value: sales.avgCycleDays == null ? null : sales.avgCycleDays + ' Tage', sub: 'Anfrage → gewonnen', def: 'Tage von Anfrage bis „Auftrag gewonnen“ (Deals, die im Zeitraum gewonnen wurden).' }) + '</div>';
      html += '<div class="toolbar"><div class="search-in">' + ic('search') + '<input id="pipe-q" placeholder="Deals filtern …" value="' + esc(st.q || '') + '" data-input="pipeQ"></div><div class="seg"><button class="' + (mode === 'board' ? 'on' : '') + '" data-act="setUi" data-view="pipeline" data-k="mode" data-v="board">' + ic('kanban', 's') + 'Board</button><button class="' + (mode === 'list' ? 'on' : '') + '" data-act="setUi" data-view="pipeline" data-k="mode" data-v="list">' + ic('list', 's') + 'Liste</button></div><label class="toggle small"><input type="checkbox" data-act="pipeClosed" ' + (st.closed === 'show' ? 'checked' : '') + '><span class="sw"></span>Alle abgeschlossenen zeigen</label></div>';
      if (!deals.length) return html + '<div class="card">' + UI.empty('kanban', 'Noch keine Verkaufschancen', 'Jede Anfrage erzeugt automatisch einen Deal in „Neue Anfrage“. Du kannst Deals auch manuell anlegen.', '<button class="btn primary" data-act="newDeal">' + ic('plus') + 'Verkaufschance anlegen</button>') + '</div>';
      if (mode === 'list') {
        const rows = H.sortRows(vis, st.sort || 'updatedAt', st.dir || 'desc', { title: d => d.title, company: d => O.companyName(d.companyId), stage: d => L.STAGES.findIndex(x => x.id === d.stage), value: d => L.num(d.value), updatedAt: d => d.updatedAt, prob: d => L.stageProb(d.stage, s) });
        return html + '<div class="card pad0"><div class="tbl-wrap"><table class="tbl cards"><thead><tr>' + H.th('pipeline', 'title', 'Deal') + H.th('pipeline', 'company', 'Kunde') + H.th('pipeline', 'stage', 'Phase') + H.th('pipeline', 'value', 'Wert', 'num') + H.th('pipeline', 'prob', 'Wahrsch.', 'num') + H.th('pipeline', 'updatedAt', 'Zuletzt') + '</tr></thead><tbody>' +
          rows.map(d => '<tr class="click" data-act="openDeal" data-id="' + d.id + '"><td class="strong">' + esc(d.title) + '</td><td data-l="Kunde">' + esc(O.companyName(d.companyId)) + '</td><td>' + H.stage(d.stage) + '</td><td class="num" data-l="Wert">' + F.money(d.value, 0) + '</td><td class="num hide-m">' + L.stageProb(d.stage, s) + ' %</td><td class="faint hide-m">' + F.ago(d.updatedAt) + '</td></tr>').join('') + '</tbody></table></div></div>';
      }
      html += '<div class="kanban" id="pipe-board">' + L.STAGES.map(stg => {
        const ds = vis.filter(d => d.stage === stg.id).sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
        const sum = ds.reduce((a, d) => a + L.num(d.value), 0);
        return '<div class="col ' + (stg.id === 'gewonnen' ? 'won' : stg.id === 'verloren' ? 'lost' : '') + '" data-col="' + stg.id + '"><div class="col-h">' + esc(stg.label) + ' <span class="n">' + ds.length + '</span><span class="v">' + (sum ? F.moneyShort(sum) : '') + '</span></div>' +
          ds.map(d => {
            const last = (d.stageHistory || []).slice(-1)[0]; const days = last ? L.diffDays(L.dateOf(last.at), t) : 0; const next = D.all('tasks').filter(x => x.dealId === d.id && x.status !== 'erledigt').sort((a, b) => (a.due > b.due ? 1 : -1))[0];
            return '<div class="kcard" data-id="' + d.id + '" data-act="openDeal" tabindex="0"><div class="t">' + esc(d.title) + '</div><div class="m">' + esc(O.companyName(d.companyId)) + '</div><div class="f"><b class="num small">' + F.money(d.value, 0) + '</b><span class="grow"></span>' + (days > 7 && L.OPEN_STAGES.includes(d.stage) ? '<span class="chip warn" title="Tage in dieser Phase">' + days + ' T.</span>' : '<span class="faint small">' + days + ' T.</span>') + '</div>' + (next ? '<div class="m ellipsis" style="margin-top:6px">' + ic('clock', 's') + ' ' + esc(next.title) + ' · ' + F.rel(next.due) + '</div>' : '') + '</div>';
          }).join('') + '</div>';
      }).join('') + '</div>';
      return html;
    },
    mount(el) {
      const b = el.querySelector('#pipe-board'); if (!b) return;
      UI.kanban(el, (id, stage) => moveDeal(id, stage));
    }
  };
  async function moveDeal(id, stage) {
    const d = D.get('deals', id); if (!d) return;
    if (stage === 'verloren') return E.lose(d);
    if (stage === 'gewonnen') { const ok = await UI.confirm({ title: 'Auftrag gewonnen? 🎉', html: 'Workflow C startet: Kundenstatus → Kunde, Projekt aus Vorlage, Willkommens-Mail als Entwurf in der Freigabe, Anzahlungsrechnung als Entwurf.', ok: 'Als gewonnen markieren' }); if (!ok) return App.render(); }
    UI.run(() => O.setDealStage(id, stage), 'Phase: ' + L.stageLabel(stage));
  }
  ACT.pipeClosed = el => { App.ui('pipeline').closed = el.checked ? 'show' : ''; App.saveUi(); App.render(); };
  ACT.newDeal = () => E.deal(null, App.ctxPre());
  ACT.openDeal = el => { if (el.closest('#pipe-board') && UI.$('#app-content')._suppressClick && Date.now() - UI.$('#app-content')._suppressClick < 300) return; V.dealDrawer(el.dataset.id); };
  V.dealDrawer = function (id) {
    const d = D.get('deals', id); if (!d) return; const s = S();
    const tasks = D.all('tasks').filter(t => t.dealId === id); const quotes = D.all('quotes').filter(q => q.dealId === id);
    const body = '<div class="stack"><div class="row wrap">' + H.stage(d.stage) + '<b class="num">' + F.money(d.value, 0) + '</b><span class="faint small">· ' + L.stageProb(d.stage, s) + ' % Wahrscheinlichkeit</span></div>' +
      '<dl class="kv"><dt>Kunde</dt><dd>' + H.co(d.companyId) + '</dd><dt>Kontakt</dt><dd>' + esc(F.personName(D.get('contacts', d.contactId)) || '–') + '</dd><dt>Projektart</dt><dd>' + esc(L.labelOf(L.PROJECT_TYPES, d.projectType)) + '</dd><dt>Quelle</dt><dd>' + esc(L.labelOf(L.CHANNELS, d.source)) + '</dd><dt>Erwarteter Abschluss</dt><dd>' + F.date(d.expectedClose) + '</dd>' + (d.lostReason ? '<dt>Verlustgrund</dt><dd>' + esc(d.lostReason) + '</dd>' : '') + '</dl>' +
      (d.notes ? '<div class="xbox">' + esc(d.notes) + '</div>' : '') +
      '<div><div class="nav-group" style="margin:4px 0">Phase ändern</div><select class="in" data-act-change="dealStage" data-id="' + d.id + '">' + UI.optList(L.STAGES, d.stage) + '</select></div>' +
      '<div class="row wrap"><button class="btn sm" data-act="newQuoteFor" data-deal="' + d.id + '">' + ic('fileText', 's') + 'Angebot</button><button class="btn sm" data-act="newEventFor" data-deal="' + d.id + '">' + ic('calendar', 's') + 'Termin</button><button class="btn sm" data-act="newTaskFor" data-deal="' + d.id + '">' + ic('checkSquare', 's') + 'Aufgabe</button><button class="btn sm" data-act="newNoteFor" data-deal="' + d.id + '">' + ic('note', 's') + 'Notiz</button></div>' +
      (L.OPEN_STAGES.includes(d.stage) ? '<div class="row wrap"><button class="btn sm good" data-act="dealWon" data-id="' + d.id + '">' + ic('circleCheck', 's') + 'Gewonnen</button><button class="btn sm danger" data-act="dealLost" data-id="' + d.id + '">' + ic('xCircle', 's') + 'Verloren</button></div>' : '') +
      (quotes.length ? '<div><div class="nav-group" style="margin:4px 0">Angebote</div><div class="list">' + quotes.map(q => '<a class="li click" href="#angebot-' + q.id + '" style="color:inherit;text-decoration:none"><span class="grow">' + esc(q.number || 'Entwurf') + '</span>' + H.qstatus(q.status) + '<b class="num small">' + F.money(L.totals(q).net, 0) + '</b></a>').join('') + '</div></div>' : '') +
      (tasks.length ? '<div><div class="nav-group" style="margin:4px 0">Aufgaben</div><div class="list">' + tasks.map(x => H.taskRow(x, { noLink: true })).join('') + '</div></div>' : '') +
      '<div><div class="nav-group" style="margin:4px 0">Verlauf</div>' + H.timeline((d.stageHistory || []).slice().reverse().map(h => ({ at: h.at, icon: 'kanban', t: L.stageLabel(h.stage) }))) + '</div></div>';
    App.drawer = UI.dialog({ drawer: true, title: d.title, body, headTools: '<button class="btn ghost sm icon" data-act="dealMenu" data-id="' + d.id + '" aria-label="Mehr">' + ic('more') + '</button>' });
  };
  ACT.dealStage = el => UI.run(async () => { const v = el.value; const d = D.get('deals', el.dataset.id); if (App.drawer) App.drawer.close(); if (v === 'verloren') return E.lose(d); await moveDeal(d.id, v); });
  ACT.dealWon = el => { if (App.drawer) App.drawer.close(); moveDeal(el.dataset.id, 'gewonnen'); };
  ACT.dealLost = el => { if (App.drawer) App.drawer.close(); E.lose(D.get('deals', el.dataset.id)); };
  ACT.dealMenu = el => { const d = D.get('deals', el.dataset.id); UI.menu(el, [{ label: 'Bearbeiten', icon: 'pencil', fn: () => { App.drawer && App.drawer.close(); E.deal(d); } }, { label: 'Kundenakte öffnen', icon: 'user', fn: () => { App.drawer && App.drawer.close(); App.go('kunde-' + d.companyId); } }, { sep: true }, { label: 'Löschen', icon: 'trash', danger: true, fn: async () => { if (await UI.confirm({ title: 'Deal löschen?', text: 'Der Deal kommt in den Papierkorb.', ok: 'Löschen', danger: true })) { App.drawer && App.drawer.close(); UI.run(() => D.softDelete('deals', d.id), 'Gelöscht'); } } }]); };

  /* ================= Kunden ================= */
  V.kunden = {
    title: 'Kunden', icon: 'users',
    render() {
      const st = App.ui('kunden'); const f = st.f || 'alle'; const q = (st.q || '').toLowerCase(); const t = today();
      const inv = D.all('invoices'); const all = D.all('companies');
      const lifetime = id => L.r2(inv.filter(i => i.companyId === id && L.isIssued(i)).reduce((s, i) => s + L.totals(i).net, 0));
      const openOf = id => L.r2(inv.filter(i => i.companyId === id).reduce((s, i) => s + L.openAmount(i), 0));
      const lastAct = c => { const xs = [c.updatedAt]; for (const col of ['comms', 'notes', 'deals', 'inquiries']) for (const x of D.all(col)) if (x.companyId === c.id) xs.push(x.updatedAt || x.createdAt); return xs.sort().pop(); };
      const rows0 = all.filter(c => (f === 'alle' || (f === 'interessenten' ? ['lead', 'interessent'].includes(c.status) : c.status === f)))
        .filter(c => !q || [c.name, c.industry, c.email, c.website, (c.address || {}).city, ...D.all('contacts').filter(p => p.companyId === c.id).map(p => F.personName(p) + ' ' + p.email)].join(' ').toLowerCase().includes(q));
      const rows = H.sortRows(rows0, st.sort || 'name', st.dir || 'asc', { name: c => c.name, status: c => c.status, industry: c => c.industry, city: c => (c.address || {}).city, rev: c => lifetime(c.id), open: c => openOf(c.id), last: c => lastAct(c) });
      const cnt = k => all.filter(c => k === 'alle' || (k === 'interessenten' ? ['lead', 'interessent'].includes(c.status) : c.status === k)).length;
      let html = '<div class="page-head"><div><h2>Kunden & Interessenten</h2><p>Jede Kundenakte bündelt Kontakte, Kommunikation, Projekte, Angebote, Rechnungen, Dokumente und Aufgaben.</p></div><div class="actions"><button class="btn primary" data-act="newCompany">' + ic('userPlus') + 'Neuer Kunde</button></div></div>';
      html += '<div class="toolbar"><div class="search-in">' + ic('search') + '<input id="kunden-q" placeholder="Name, Ort, Ansprechpartner, E-Mail …" value="' + esc(st.q || '') + '" data-input="kundenQ"></div><div class="pill-filter">' + [['alle', 'Alle'], ['kunde', 'Kunden'], ['interessenten', 'Interessenten'], ['inaktiv', 'Inaktiv'], ['verloren', 'Kein Auftrag']].map(([k, l]) => '<button class="' + (f === k ? 'on' : '') + '" data-act="setUi" data-view="kunden" data-k="f" data-v="' + k + '">' + l + ' <span class="faint">' + cnt(k) + '</span></button>').join('') + '</div></div>';
      if (!all.length) return html + '<div class="card">' + UI.empty('users', 'Noch keine Kunden', 'Leg deinen ersten Kunden an oder erfasse eine Anfrage – die Kundenakte entsteht dann automatisch.', '<button class="btn primary" data-act="newCompany">' + ic('userPlus') + 'Kunde anlegen</button>') + '</div>';
      html += '<div class="card pad0"><div class="tbl-wrap"><table class="tbl cards"><thead><tr>' + H.th('kunden', 'name', 'Name') + H.th('kunden', 'status', 'Status') + H.th('kunden', 'industry', 'Branche') + '<th>Ansprechpartner</th>' + H.th('kunden', 'city', 'Ort') + H.th('kunden', 'rev', 'Umsatz', 'num') + H.th('kunden', 'open', 'Offen', 'num') + H.th('kunden', 'last', 'Letzte Aktivität') + '</tr></thead><tbody>' +
        (rows.length ? rows.map(c => { const p = O.primaryContact(c.id); const op = openOf(c.id); return '<tr class="click" data-href="kunde-' + c.id + '"><td><div class="row">' + H.avatar(c.name, 'sm') + '<b>' + esc(c.name) + '</b></div></td><td>' + H.cstatus(c.status) + '</td><td data-l="Branche" class="muted">' + esc(c.industry || '–') + '</td><td data-l="Kontakt">' + esc(p ? F.personName(p) : '–') + '</td><td class="hide-m">' + esc((c.address || {}).city || '–') + '</td><td class="num" data-l="Umsatz">' + F.money(lifetime(c.id), 0) + '</td><td class="num hide-m">' + (op ? '<span class="chip warn">' + F.money(op, 0) + '</span>' : '<span class="faint">–</span>') + '</td><td class="faint hide-m">' + F.ago(lastAct(c)) + '</td></tr>'; }).join('') : '<tr><td colspan="8" class="faint center" style="padding:24px">Keine Treffer.</td></tr>') + '</tbody></table></div></div>';
      return html;
    }
  };
  ACT.newCompany = () => E.company();

  /* ================= Kundenakte ================= */
  V.kunde = {
    title: 'Kundenakte', icon: 'users', parent: 'kunden',
    render(id) {
      const c = D.get('companies', id); if (!c) return '<div class="card">' + UI.empty('users', 'Kunde nicht gefunden', 'Der Datensatz wurde gelöscht oder zusammengeführt.', '<a class="btn" href="#kunden">Zur Kundenliste</a>') + '</div>';
      if (c.deletedAt) return '<div class="card">' + UI.empty('trash', 'Im Papierkorb', '„' + c.name + '“ wurde gelöscht' + (c.mergedInto ? ' (zusammengeführt).' : '.'), (c.mergedInto ? '<a class="btn" href="#kunde-' + c.mergedInto + '">Zum zusammengeführten Kunden</a> ' : '') + '<button class="btn" data-act="restore" data-col="companies" data-id="' + c.id + '">Wiederherstellen</button>') + '</div>';
      const st = App.ui('kunde'); const tab = st.tab || 'uebersicht'; const t = today();
      const by = col => D.all(col).filter(x => x.companyId === id);
      const contacts = by('contacts'), deals = by('deals'), projects = by('projects'), quotes = by('quotes'), invoices = by('invoices'), docs = by('documents'), comms = by('comms'), notes = by('notes'), tasks = by('tasks'), contracts = by('contracts');
      const rev = L.r2(invoices.filter(L.isIssued).reduce((s, i) => s + L.totals(i).net, 0)); const open = L.r2(invoices.reduce((s, i) => s + L.openAmount(i), 0));
      const p = O.primaryContact(id); const a = c.address || {};
      let html = '<div class="card" style="margin-bottom:14px"><div class="row start wrap gap-12">' + H.avatar(c.name, 'lg') + '<div class="grow" style="min-width:min(100%,250px)"><div class="row wrap"><h2 style="margin:0;font-size:21px;letter-spacing:-.02em">' + esc(c.name) + '</h2>' + H.cstatus(c.status) + (c.number ? '<span class="chip outline">' + esc(c.number) + '</span>' : '') + '</div>' +
        '<div class="muted small" style="margin-top:3px">' + esc([({ firma: 'Unternehmen', selbststaendig: 'Selbstständig', startup: 'Start-up', verein: 'Verein', privat: 'Privatperson' })[c.type], c.industry, a.city, 'Quelle: ' + L.labelOf(L.CHANNELS, c.source)].filter(Boolean).join(' · ')) + '</div>' +
        '<div class="row wrap" style="margin-top:10px">' + ((p && p.email) || c.email ? '<button class="btn sm" data-act="mailCompany" data-id="' + id + '">' + ic('mail', 's') + 'E-Mail</button>' : '') + ((p && p.phone) || c.phone ? '<a class="btn sm" href="tel:' + esc((p && p.phone) || c.phone) + '">' + ic('phone', 's') + esc((p && p.phone) || c.phone) + '</a>' : '') +
        '<button class="btn sm" data-act="newTaskFor" data-company="' + id + '">' + ic('checkSquare', 's') + 'Aufgabe</button><button class="btn sm" data-act="newNoteFor" data-company="' + id + '">' + ic('note', 's') + 'Notiz</button><button class="btn sm" data-act="newEventFor" data-company="' + id + '">' + ic('calendar', 's') + 'Termin</button><button class="btn sm" data-act="newMenuFor" data-company="' + id + '">' + ic('plus', 's') + 'Mehr</button></div></div>' +
        '<div class="row"><button class="btn sm" data-act="editCompany" data-id="' + id + '">' + ic('pencil', 's') + 'Bearbeiten</button><button class="btn sm icon" data-act="companyMenu" data-id="' + id + '" aria-label="Mehr">' + ic('more') + '</button></div></div>' +
        '<div class="kpis" style="margin-top:14px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">' + mini('Umsatz gesamt', F.money(rev, 0)) + mini('Offene Forderungen', open ? F.money(open, 0) : '–') + mini('Projekte', projects.filter(x => x.status !== 'abgeschlossen').length + ' aktiv / ' + projects.length) + mini('Offene Deals', F.money(deals.filter(x => L.OPEN_STAGES.includes(x.stage)).reduce((s, x) => s + L.num(x.value), 0), 0)) + mini('Wiederkehrend', F.money(L.mrr(contracts, t), 0) + ' / Mon.') + '</div></div>';
      const tabs = [['uebersicht', 'Übersicht'], ['verlauf', 'Verlauf'], ['kontakte', 'Kontakte', contacts.length], ['deals', 'Deals', deals.length], ['projekte', 'Projekte', projects.length], ['finanzen', 'Angebote & Rechnungen', quotes.length + invoices.length], ['dokumente', 'Dokumente', docs.length], ['kommunikation', 'Kommunikation', comms.length], ['aufgaben', 'Aufgaben', tasks.filter(x => x.status !== 'erledigt').length], ['notizen', 'Notizen', notes.length]];
      html += '<div class="tabs" role="tablist">' + tabs.map(([k, l, n]) => '<button class="' + (tab === k ? 'on' : '') + '" data-act="setUi" data-view="kunde" data-k="tab" data-v="' + k + '">' + l + (n ? ' <span class="n">' + n + '</span>' : '') + '</button>').join('') + '</div>';
      const tl = () => H.timelineItems(x => x.companyId === id);
      if (tab === 'uebersicht') {
        html += '<div class="grid g-main"><div class="stack"><div class="card"><div class="card-h"><h3>Nächste Aufgaben</h3><div class="tools"><button class="btn xs" data-act="newTaskFor" data-company="' + id + '">' + ic('plus', 's') + '</button></div></div>' + (tasks.filter(x => x.status !== 'erledigt').length ? '<div class="list">' + tasks.filter(x => x.status !== 'erledigt').sort((x, y) => (x.due > y.due ? 1 : -1)).slice(0, 6).map(x => H.taskRow(x)).join('') + '</div>' : '<div class="faint small">Keine offenen Aufgaben.</div>') + '</div>' +
          '<div class="card"><div class="card-h"><h3>Letzte Aktivitäten</h3><div class="tools"><button class="btn xs" data-act="setUi" data-view="kunde" data-k="tab" data-v="verlauf">Alle</button>' + (AI.available ? '<button class="btn xs" data-act="aiCustomer" data-id="' + id + '">' + ic('sparkles', 's') + 'Zusammenfassen</button>' : '') + '</div></div><div id="ai-cust"></div>' + H.timeline(tl(), 8) + '</div></div>' +
          '<div class="stack"><div class="card"><div class="card-h"><h3>Kontaktdaten</h3></div><dl class="kv">' +
          '<dt>Ansprechpartner</dt><dd>' + esc(p ? F.personName(p) + (p.role ? ' (' + p.role + ')' : '') : '–') + '</dd><dt>E-Mail</dt><dd>' + esc((p && p.email) || c.email || '–') + '</dd><dt>Telefon</dt><dd>' + esc((p && p.phone) || c.phone || '–') + '</dd>' +
          '<dt>Adresse</dt><dd>' + (a.street ? esc(a.street) + '<br>' + esc([a.zip, a.city].filter(Boolean).join(' ')) : '<span class="faint">fehlt (für Rechnungen nötig)</span>') + '</dd><dt>Website</dt><dd>' + (c.website ? '<a href="' + esc(/^https?:/.test(c.website) ? c.website : 'https://' + c.website) + '" target="_blank" rel="noopener">' + esc(L.normDomain(c.website) || c.website) + '</a>' : '–') + '</dd>' +
          Object.entries(c.socials || {}).filter(([, v]) => v).map(([k, v]) => '<dt>' + esc(k[0].toUpperCase() + k.slice(1)) + '</dt><dd>' + esc(v) + '</dd>').join('') + (c.vatId ? '<dt>USt-IdNr.</dt><dd>' + esc(c.vatId) + '</dd>' : '') + '</dl>' +
          (c.notes ? '<div class="divider"></div><div class="nav-group" style="margin:0 0 4px">Interne Bemerkungen</div><div class="small" style="white-space:pre-wrap">' + esc(c.notes) + '</div>' : '') + '</div>' +
          (projects.length ? '<div class="card"><div class="card-h"><h3>Projekte</h3></div><div class="list">' + projects.map(pp => '<a class="li click" href="#projekt-' + pp.id + '" style="color:inherit;text-decoration:none"><span class="grow ellipsis">' + esc(pp.name) + '</span>' + H.pstatus(pp.status) + '</a>').join('') + '</div></div>' : '') + '</div></div>';
      } else if (tab === 'verlauf') html += '<div class="card">' + H.timeline(tl()) + '</div>';
      else if (tab === 'kontakte') html += '<div class="card"><div class="card-h"><h3>Ansprechpartner</h3><div class="tools"><button class="btn sm" data-act="newContactFor" data-company="' + id + '">' + ic('userPlus', 's') + 'Kontakt</button></div></div>' + (contacts.length ? '<div class="list">' + contacts.map(x => '<div class="li">' + H.avatar(F.personName(x), 'sm') + '<div class="grow"><div class="t">' + esc(F.personName(x)) + (c.primaryContactId === x.id || x.isPrimary ? ' <span class="chip accent">Haupt</span>' : '') + '</div><div class="m">' + esc([x.role, x.email, x.phone].filter(Boolean).join(' · ')) + '</div></div><button class="btn xs" data-act="editContact" data-id="' + x.id + '">' + ic('pencil', 's') + '</button></div>').join('') + '</div>' : '<div class="faint small">Noch keine Kontakte.</div>') + '</div>';
      else if (tab === 'deals') html += '<div class="card"><div class="card-h"><h3>Verkaufschancen</h3><div class="tools"><button class="btn sm" data-act="newDealFor" data-company="' + id + '">' + ic('plus', 's') + 'Deal</button></div></div>' + (deals.length ? '<div class="list">' + deals.map(d => '<div class="li click" data-act="openDeal" data-id="' + d.id + '"><span class="grow"><b>' + esc(d.title) + '</b></span>' + H.stage(d.stage) + '<b class="num small">' + F.money(d.value, 0) + '</b></div>').join('') + '</div>' : '<div class="faint small">Keine Deals.</div>') + '</div>';
      else if (tab === 'projekte') html += '<div class="card"><div class="card-h"><h3>Projekte</h3><div class="tools"><button class="btn sm" data-act="newProjectFor" data-company="' + id + '">' + ic('plus', 's') + 'Projekt</button></div></div>' + (projects.length ? '<div class="list">' + projects.map(pp => { const pr = L.projectProgress(pp, D.all('tasks')); return '<a class="li click" href="#projekt-' + pp.id + '" style="color:inherit;text-decoration:none"><span class="grow"><b>' + esc(pp.name) + '</b><div class="progress" style="margin-top:6px;max-width:260px"><i style="width:' + pr + '%"></i></div></span>' + H.pstatus(pp.status) + '<span class="faint small">' + F.date(pp.deadline) + '</span></a>'; }).join('') + '</div>' : '<div class="faint small">Keine Projekte.</div>') + '</div>';
      else if (tab === 'finanzen') html += '<div class="grid g2"><div class="card"><div class="card-h"><h3>Angebote</h3><div class="tools"><button class="btn sm" data-act="newQuoteFor" data-company="' + id + '">' + ic('plus', 's') + 'Angebot</button></div></div>' + (quotes.length ? '<div class="list">' + quotes.map(q => '<a class="li click" href="#angebot-' + q.id + '" style="color:inherit;text-decoration:none"><span class="grow">' + esc(q.number || 'Entwurf') + ' <span class="faint small">' + esc(q.title || '') + '</span></span>' + H.qstatus(q.status) + '<b class="num small">' + F.money(L.totals(q).net, 0) + '</b></a>').join('') + '</div>' : '<div class="faint small">Keine Angebote.</div>') + '</div>' +
        '<div class="card"><div class="card-h"><h3>Rechnungen & Zahlungen</h3><div class="tools"><button class="btn sm" data-act="newInvoiceFor" data-company="' + id + '">' + ic('plus', 's') + 'Rechnung</button></div></div>' + (invoices.length ? '<div class="list">' + invoices.sort((x, y) => (y.date > x.date ? 1 : -1)).map(i => '<a class="li click" href="#rechnung-' + i.id + '" style="color:inherit;text-decoration:none"><span class="grow">' + esc(i.number || 'Entwurf') + ' <span class="faint small">' + F.date(i.date) + '</span></span>' + H.istatus(i) + '<b class="num small">' + F.money(L.totals(i).gross, 0) + '</b></a>').join('') + '</div>' : '<div class="faint small">Keine Rechnungen.</div>') + (contracts.length ? '<div class="divider"></div><div class="nav-group" style="margin:0 0 4px">Wiederkehrende Verträge</div>' + contracts.map(k => '<div class="li"><span class="grow">' + esc(k.title) + '</span><span class="chip ' + (k.active !== false ? 'good' : '') + '">' + (k.active !== false ? 'aktiv' : 'beendet') + '</span><b class="num small">' + F.money(k.amount) + ' / ' + esc(k.interval) + '</b></div>').join('') : '') + '</div></div>';
      else if (tab === 'dokumente') html += V.docList(docs, { companyId: id });
      else if (tab === 'kommunikation') html += '<div class="card"><div class="card-h"><h3>Kommunikation</h3><div class="tools"><button class="btn sm" data-act="logComm" data-company="' + id + '">' + ic('plus', 's') + 'Eintrag</button><button class="btn sm primary" data-act="mailCompany" data-id="' + id + '">' + ic('send', 's') + 'E-Mail</button></div></div>' + H.timeline(H.timelineItems(x => x.companyId === id).filter(x => ['mail', 'send', 'inbox', 'phone'].includes(x.icon))) + '</div>';
      else if (tab === 'aufgaben') html += '<div class="card"><div class="card-h"><h3>Aufgaben & Wiedervorlagen</h3><div class="tools"><button class="btn sm" data-act="newTaskFor" data-company="' + id + '">' + ic('plus', 's') + 'Aufgabe</button></div></div>' + (tasks.length ? '<div class="list">' + tasks.sort((x, y) => (x.status === y.status ? (x.due > y.due ? 1 : -1) : x.status === 'erledigt' ? 1 : -1)).map(x => H.taskRow(x)).join('') + '</div>' : '<div class="faint small">Keine Aufgaben.</div>') + '</div>';
      else if (tab === 'notizen') html += '<div class="card"><div class="card-h"><h3>Notizen & Gesprächsprotokolle</h3><div class="tools"><button class="btn sm" data-act="newNoteFor" data-company="' + id + '">' + ic('plus', 's') + 'Notiz</button></div></div>' + (notes.length ? notes.sort((x, y) => (y.at > x.at ? 1 : -1)).map(n => '<div class="tl"><div class="ic">' + ic('note') + '</div><div class="b"><div class="row"><b>' + esc({ notiz: 'Notiz', gespraech: 'Gesprächsprotokoll', anruf: 'Anruf', meeting: 'Meeting' }[n.kind] || 'Notiz') + '</b><span class="faint small">' + F.date(n.at) + '</span><span class="grow"></span>' + (AI.available ? '<button class="btn xs" data-act="aiTasksFromNote" data-id="' + n.id + '">' + ic('sparkles', 's') + 'Aufgaben ableiten</button>' : '') + '<button class="btn xs icon" data-act="editNote" data-id="' + n.id + '">' + ic('pencil', 's') + '</button></div><div class="x">' + esc(n.text) + '</div></div></div>').join('') : '<div class="faint small">Noch keine Notizen.</div>') + '</div>';
      return html;
    },
    crumb(id) { const c = D.get('companies', id); return c ? c.name : ''; }
  };
  const mini = (l, v) => '<div class="kpi" style="box-shadow:none;background:var(--panel-2);padding:10px 12px"><div class="lbl">' + esc(l) + '</div><div class="val" style="font-size:17px">' + v + '</div></div>';
  ACT.editCompany = el => E.company(D.get('companies', el.dataset.id));
  ACT.editContact = el => E.contact(D.get('contacts', el.dataset.id));
  ACT.editNote = el => E.note(D.get('notes', el.dataset.id));
  ACT.newContactFor = el => E.contact(null, { companyId: el.dataset.company, isPrimary: !O.primaryContact(el.dataset.company) });
  ACT.newDealFor = el => E.deal(null, { companyId: el.dataset.company, title: 'Website – ' + O.companyName(el.dataset.company) });
  ACT.newProjectFor = el => E.project(null, { companyId: el.dataset.company, name: 'Website ' + O.companyName(el.dataset.company) });
  ACT.newTaskFor = el => E.task(null, { companyId: el.dataset.company || (el.dataset.deal && D.get('deals', el.dataset.deal).companyId) || (el.dataset.project && D.get('projects', el.dataset.project).companyId) || null, dealId: el.dataset.deal || null, projectId: el.dataset.project || null });
  ACT.newNoteFor = el => E.note(null, { companyId: el.dataset.company || (el.dataset.deal && D.get('deals', el.dataset.deal).companyId) || (el.dataset.project && D.get('projects', el.dataset.project).companyId) || null, dealId: el.dataset.deal || null, projectId: el.dataset.project || null });
  ACT.newEventFor = el => E.event(null, { companyId: el.dataset.company || (el.dataset.deal && D.get('deals', el.dataset.deal).companyId) || (el.dataset.project && D.get('projects', el.dataset.project).companyId) || null, dealId: el.dataset.deal || null, projectId: el.dataset.project || null, kind: el.dataset.deal ? 'beratung' : 'termin' });
  ACT.newMenuFor = el => { const id = el.dataset.company; UI.menu(el, [{ label: 'Kontakt', icon: 'userPlus', fn: () => ACT.newContactFor({ dataset: { company: id } }) }, { label: 'Verkaufschance', icon: 'kanban', fn: () => ACT.newDealFor({ dataset: { company: id } }) }, { label: 'Projekt', icon: 'folderKanban', fn: () => ACT.newProjectFor({ dataset: { company: id } }) }, { label: 'Angebot', icon: 'fileText', fn: () => ACT.newQuoteFor({ dataset: { company: id } }) }, { label: 'Rechnung', icon: 'receipt', fn: () => ACT.newInvoiceFor({ dataset: { company: id } }) }, { label: 'Wiederkehrender Vertrag', icon: 'repeat', fn: () => E.contract(null, { companyId: id }) }, { label: 'Dokument hochladen', icon: 'upload', fn: () => V.uploadDialog({ companyId: id }) }]); };
  ACT.companyMenu = el => { const c = D.get('companies', el.dataset.id); UI.menu(el, [{ label: 'Bearbeiten', icon: 'pencil', fn: () => E.company(c) }, { label: 'Mit anderem Datensatz zusammenführen', icon: 'layers', fn: () => V.mergeDialog(c.id, []) }, { label: 'Status: Inaktiv', icon: 'pause', fn: () => UI.run(() => O.setCompanyStatus(c.id, 'inaktiv'), 'Status geändert') }, { sep: true }, { label: 'In den Papierkorb', icon: 'trash', danger: true, fn: async () => { if (await UI.confirm({ title: 'Kunde löschen?', text: '„' + c.name + '“ kommt in den Papierkorb. Verknüpfte Datensätze bleiben erhalten. Endgültiges Löschen nur über den Papierkorb mit Freigabe.', ok: 'In den Papierkorb', danger: true })) { await UI.run(() => D.softDelete('companies', c.id), 'In den Papierkorb verschoben'); App.go('kunden'); } } }]); };
  ACT.mailCompany = el => { const r = O.recipientFor(el.dataset.id); E.emailCompose({ to: r.email, subject: '', body: 'Hallo ' + (r.name || '') + ',\n\n\n\nViele Grüße\n' + (S().ownerName || ''), refs: { companyId: el.dataset.id, contactId: r.contact ? r.contact.id : null }, vars: { name: r.name, firma: r.company && r.company.name }, ai: 'Schreibe eine kurze, freundliche E-Mail an ' + r.name + ' (' + (r.company && r.company.name) + '). Der Nutzer ergänzt den Anlass ggf. selbst; formuliere neutral.' }); };
  ACT.logComm = el => UI.form({ title: 'Kommunikation festhalten', values: { channel: 'telefon', direction: 'in', at: today() }, fields: [{ key: 'channel', label: 'Kanal', type: 'select', options: [['telefon', 'Telefon'], ['email', 'E-Mail'], ['social', 'Social Media'], ['sonstiges', 'Sonstiges']] }, { key: 'direction', label: 'Richtung', type: 'select', options: [['in', 'Eingehend'], ['out', 'Ausgehend']] }, { key: 'subject', label: 'Betreff / Anlass', full: true, required: true }, { key: 'snippet', label: 'Inhalt', type: 'textarea', rows: 4 }, { key: 'at', label: 'Datum', type: 'date' }], onSubmit: async v => { await D.create('comms', Object.assign(v, { companyId: el.dataset.company, at: v.at + 'T12:00:00', answered: v.direction === 'out' })); UI.toast('Gespeichert'); } });
  ACT.aiCustomer = async el => {
    const id = el.dataset.id; const box = document.getElementById('ai-cust'); box.innerHTML = '<div class="note" style="margin-bottom:12px">' + ic('sparkles') + '<span class="grow" id="ai-cust-t">KI liest die Kundenhistorie …</span></div>'; const out = document.getElementById('ai-cust-t');
    const items = H.timelineItems(x => x.companyId === id).slice(0, 60).map(i => ({ datum: i.at.slice(0, 10), was: i.t, info: i.m, text: i.x ? String(i.x).slice(0, 400) : '' }));
    try { const r = await AI.ask(AI.SYSTEM + '\n\nFasse die Kundenbeziehung zu „' + O.companyName(id) + '“ zusammen: 1) Stand in 2 Sätzen, 2) offene Punkte, 3) empfohlener nächster Schritt. Maximal 120 Wörter.\n\nVerlauf (neueste zuerst):\n' + JSON.stringify(items), { onText: x => { out.textContent = x.text; } }); out.textContent = r.text; } catch (e) { out.textContent = AI.errorText(e); }
  };
  ACT.aiTasksFromNote = async el => {
    const n = D.get('notes', el.dataset.id); el.disabled = true;
    try {
      const list = await AI.json(AI.SYSTEM + '\n\nLeite aus diesem Gesprächsprotokoll konkrete Aufgaben ab. Antworte nur mit einem JSON-Array von Objekten {"title": string, "dueInWorkdays": number, "assignee": "ich"|"kunde"} (max. 8). Heute ist ' + today() + '.\n\n' + n.text, { modelTier: 'quick' });
      if (!Array.isArray(list) || !list.length) return UI.toast('Keine Aufgaben erkannt');
      UI.form({ title: 'Vorgeschlagene Aufgaben', size: 'wide', submit: 'Ausgewählte anlegen', values: Object.fromEntries(list.map((x, i) => ['t' + i, true])), intro: '<p class="muted mt-0">Du entscheidest, was angelegt wird.</p>', fields: list.map((x, i) => ({ key: 't' + i, type: 'checkbox', text: String(x.title) + ' · fällig in ' + (Number(x.dueInWorkdays) || 0) + ' Werktag(en)' + (x.assignee === 'kunde' ? ' · Kunde' : ''), full: true })),
        onSubmit: async v => { let k = 0; for (let i = 0; i < list.length; i++) if (v['t' + i]) { await D.create('tasks', { title: String(list[i].title).slice(0, 200), due: L.addWorkdays(today(), Number(list[i].dueInWorkdays) || 0, S().state), assignee: list[i].assignee === 'kunde' ? 'kunde' : 'ich', priority: 'mittel', status: 'offen', companyId: n.companyId, projectId: n.projectId, dealId: n.dealId, kind: 'task', source: 'KI aus Notiz' }); k++; } UI.toast(k + ' Aufgabe(n) angelegt'); } });
    } catch (e) { UI.toast(AI.errorText(e), { bad: true }); } finally { el.disabled = false; }
  };
  ACT.restore = el => UI.run(() => D.restore(el.dataset.col, el.dataset.id), 'Wiederhergestellt');
})();
