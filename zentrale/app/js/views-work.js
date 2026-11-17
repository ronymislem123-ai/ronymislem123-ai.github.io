/* Agentur-Zentrale – Ansichten: Projekte (Kanban, Tabelle, Kalender, Zeitstrahl, Fortschritt), Projektakte, Aufgaben, Kalender */
(function () {
  'use strict';
  const V = window.V; const ACT = window.ACT; const esc = F.esc; const today = () => L.todayBerlin(); const S = () => D.settings();

  /* ================= Projekte ================= */
  V.projekte = {
    title: 'Projekte', icon: 'folderKanban',
    render() {
      const st = App.ui('projekte'); const mode = st.mode || 'kanban'; const t = today(); const s = S(); const tasks = D.all('tasks');
      const showDone = st.done === 'show'; const q = (st.q || '').toLowerCase();
      const all = D.all('projects'); const ps = all.filter(p => (showDone || mode === 'kanban' || p.status !== 'abgeschlossen') && (!q || (p.name + ' ' + O.companyName(p.companyId)).toLowerCase().includes(q)));
      let html = '<div class="page-head"><div><h2>Projekte</h2><p>Gewonnene Aufträge werden automatisch mit Vorlage zu Projekten. Ampel: Achtung bei Aufgaben > 2 Werktage überfällig, kritisch bei gefährdeten Meilensteinen.</p></div><div class="actions"><button class="btn" data-act="tplEditor">' + ic('layers') + 'Vorlagen</button><button class="btn primary" data-act="newProject">' + ic('plus') + 'Projekt</button></div></div>';
      html += '<div class="toolbar"><div class="search-in">' + ic('search') + '<input id="proj-q" placeholder="Projekte filtern …" value="' + esc(st.q || '') + '" data-input="projQ"></div><div class="seg">' + [['kanban', 'kanban', 'Kanban'], ['tabelle', 'table', 'Tabelle'], ['kalender', 'calendar', 'Kalender'], ['zeitstrahl', 'gantt', 'Zeitstrahl'], ['fortschritt', 'activity', 'Fortschritt']].map(([k, i, l]) => '<button class="' + (mode === k ? 'on' : '') + '" data-act="setUi" data-view="projekte" data-k="mode" data-v="' + k + '">' + ic(i, 's') + '<span class="hide-m">' + l + '</span></button>').join('') + '</div>' + (mode !== 'kanban' ? '<label class="toggle small"><input type="checkbox" data-act="projDone" ' + (showDone ? 'checked' : '') + '><span class="sw"></span>Abgeschlossene zeigen</label>' : '') + '</div>';
      if (!all.length) return html + '<div class="card">' + UI.empty('folderKanban', 'Noch keine Projekte', 'Projekte entstehen automatisch, sobald ein Deal gewonnen wird – oder du legst eins mit Vorlage an.', '<button class="btn primary" data-act="newProject">' + ic('plus') + 'Projekt anlegen</button>') + '</div>';
      const card = p => { const pr = L.projectProgress(p, tasks); const h = L.projectHealth(p, tasks, t, s.state); return '<div class="kcard" data-id="' + p.id + '" data-act="openProject"><div class="row"><span class="health ' + h.level + '" title="' + esc(h.label + (h.reasons.length ? ': ' + h.reasons.join('; ') : '')) + '"></span><div class="t grow">' + esc(p.name) + '</div></div><div class="m">' + esc(O.companyName(p.companyId)) + '</div><div class="progress" style="margin-top:8px"><i style="width:' + pr + '%"></i></div><div class="f"><span class="small faint">' + pr + ' %</span><span class="grow"></span>' + (p.deadline ? '<span class="small ' + (p.deadline < t && p.status !== 'abgeschlossen' ? 'chip bad' : 'faint') + '">' + ic('flag', 's') + ' ' + F.date(p.deadline) + '</span>' : '') + '</div></div>'; };
      if (mode === 'kanban') html += '<div class="kanban" id="proj-board">' + L.PROJECT_STATUS.map(stt => { const xs = ps.filter(p => p.status === stt.id).filter(p => stt.id !== 'abgeschlossen' || showDone || L.diffDays(L.dateOf(p.completedAt || p.updatedAt), t) <= 30); return '<div class="col" data-col="' + stt.id + '"><div class="col-h">' + esc(stt.label) + ' <span class="n">' + xs.length + '</span></div>' + xs.map(card).join('') + '</div>'; }).join('') + '</div>';
      else if (mode === 'tabelle') {
        const rows = H.sortRows(ps, st.sort || 'deadline', st.dir || 'asc', { name: p => p.name, company: p => O.companyName(p.companyId), status: p => L.PROJECT_STATUS.findIndex(x => x.id === p.status), value: p => L.num(p.value), deadline: p => p.deadline || '9999', progress: p => L.projectProgress(p, tasks) });
        html += '<div class="card pad0"><div class="tbl-wrap"><table class="tbl cards"><thead><tr><th></th>' + H.th('projekte', 'name', 'Projekt') + H.th('projekte', 'company', 'Kunde') + H.th('projekte', 'status', 'Status') + H.th('projekte', 'progress', 'Fortschritt') + H.th('projekte', 'value', 'Auftragswert', 'num') + H.th('projekte', 'deadline', 'Deadline') + '<th>Zahlung</th></tr></thead><tbody>' +
          rows.map(p => { const h = L.projectHealth(p, tasks, t, s.state); const pr = L.projectProgress(p, tasks); const inv = D.all('invoices').filter(i => i.projectId === p.id && L.isIssued(i) && i.type !== 'storno' && i.status !== 'storniert'); const billed = inv.reduce((a, i) => a + L.totals(i).net, 0); const open = inv.reduce((a, i) => a + L.openAmount(i), 0);
            return '<tr class="click" data-href="projekt-' + p.id + '"><td class="hide-m"><span class="health ' + h.level + '" title="' + esc(h.label) + '"></span></td><td class="strong">' + esc(p.name) + '</td><td data-l="Kunde">' + esc(O.companyName(p.companyId)) + '</td><td>' + H.pstatus(p.status) + '</td><td data-l="Fortschritt"><div class="row"><div class="progress grow" style="min-width:70px"><i style="width:' + pr + '%"></i></div><span class="small faint">' + pr + '%</span></div></td><td class="num" data-l="Wert">' + F.money(p.value, 0) + '</td><td data-l="Deadline">' + F.date(p.deadline) + '</td><td class="small hide-m">' + (inv.length ? F.money(billed, 0) + ' abgerechnet' + (open ? ' · <span class="chip warn">' + F.money(open, 0) + ' offen</span>' : '') : '<span class="faint">noch nicht abgerechnet</span>') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
      } else if (mode === 'kalender') html += V.calendarHtml({ onlyProjects: true });
      else if (mode === 'zeitstrahl') html += gantt(ps.filter(p => p.startDate || p.deadline), tasks);
      else html += '<div class="grid g3">' + ps.map(p => { const pr = L.projectProgress(p, tasks); const h = L.projectHealth(p, tasks, t, s.state); const open = tasks.filter(x => x.projectId === p.id && x.status !== 'erledigt'); const nextMs = (p.milestones || []).filter(m => !m.done).sort((a, b) => (a.due > b.due ? 1 : -1))[0];
        return '<a class="card" href="#projekt-' + p.id + '" style="color:inherit;text-decoration:none"><div class="row"><span class="health ' + h.level + '"></span><b class="grow ellipsis">' + esc(p.name) + '</b>' + H.pstatus(p.status) + '</div><div class="faint small" style="margin:4px 0 10px">' + esc(O.companyName(p.companyId)) + '</div><div class="row"><div class="progress grow"><i style="width:' + pr + '%"></i></div><b class="small">' + pr + ' %</b></div><div class="small muted" style="margin-top:10px">' + open.length + ' offene Aufgaben' + (open.filter(x => x.assignee === 'kunde').length ? ' · ' + open.filter(x => x.assignee === 'kunde').length + ' beim Kunden' : '') + '</div>' + (nextMs ? '<div class="small" style="margin-top:4px">' + ic('target', 's') + ' ' + esc(nextMs.title) + ' · ' + F.rel(nextMs.due) + '</div>' : '') + (h.reasons.length ? '<div class="small" style="margin-top:6px;color:var(--bad)">' + esc(h.reasons[0]) + '</div>' : '') + '</a>'; }).join('') + '</div>';
      return html;
    },
    mount(el) { if (el.querySelector('#proj-board')) UI.kanban(el, (id, status) => UI.run(() => O.setProjectStatus(id, status), 'Status: ' + L.labelOf(L.PROJECT_STATUS, status))); if (el.querySelector('.cal')) V.calendarMount(el); }
  };
  function gantt(ps, tasks) {
    if (!ps.length) return '<div class="card">' + UI.empty('gantt', 'Keine Projekte mit Zeitraum', 'Lege Beginn und Deadline fest.') + '</div>';
    const t = today(); const starts = ps.map(p => p.startDate || p.deadline), ends = ps.map(p => p.deadline || L.addDays(p.startDate, 30));
    let from = starts.sort()[0], to = ends.sort().slice(-1)[0]; if (t < from) from = t; if (t > to) to = t; from = L.addDays(from, -3); to = L.addDays(to, 7);
    const span = Math.max(14, L.diffDays(from, to)); const pos = d => (100 * L.diffDays(from, d) / span);
    const ticks = []; let m = from.slice(0, 7) + '-01'; while (m <= to) { if (m >= from) ticks.push(m); m = L.addMonths(m, 1); }
    let html = '<div class="card pad0"><div class="gantt"><div class="scale"><div class="gl">Projekt</div><div class="ticks">' + ticks.map(d => '<span style="left:' + pos(d) + '%">' + L.MONTHS_SHORT[Number(d.slice(5, 7)) - 1] + ' ' + d.slice(2, 4) + '</span>').join('') + '</div></div>';
    for (const p of ps.sort((a, b) => ((a.startDate || '') > (b.startDate || '') ? 1 : -1))) {
      const s0 = p.startDate || p.deadline, e0 = p.deadline || L.addDays(s0, 30); const pr = L.projectProgress(p, tasks);
      html += '<div class="gr"><div class="gl"><a href="#projekt-' + p.id + '">' + esc(p.name) + '</a></div><div class="track"><div class="todayline" style="left:' + pos(t) + '%" title="Heute"></div><div class="bar" data-href="projekt-' + p.id + '" style="left:' + pos(s0) + '%;width:' + Math.max(1, pos(e0) - pos(s0)) + '%" title="' + esc(p.name + ': ' + F.date(s0) + ' – ' + F.date(e0) + ' · ' + pr + ' %') + '"><i style="width:' + pr + '%"></i></div>' +
        (p.milestones || []).filter(x => x.due).map(x => '<span class="msd ' + (x.done ? 'done' : '') + '" style="left:' + pos(x.due) + '%" title="' + esc(x.title + ' · ' + F.date(x.due)) + '"></span>').join('') + '</div></div>';
    }
    return html + '</div></div><div class="legend" style="margin-top:8px"><span><i class="sw" style="background:var(--accent)"></i>Fortschritt</span><span><i class="sw" style="background:var(--violet);transform:rotate(45deg)"></i>Meilenstein offen</span><span><i class="sw" style="background:var(--good);transform:rotate(45deg)"></i>erreicht</span><span><i class="sw" style="background:var(--bad)"></i>Heute</span></div>';
  }
  ACT.projDone = el => { App.ui('projekte').done = el.checked ? 'show' : ''; App.saveUi(); App.render(); };
  ACT.newProject = () => E.project(null, App.ctxPre());
  ACT.openProject = el => { const root = UI.$('#app-content'); if (root._suppressClick && Date.now() - root._suppressClick < 300) return; App.go('projekt-' + el.dataset.id); };

  /* ================= Projektakte ================= */
  V.projekt = {
    title: 'Projekt', icon: 'folderKanban', parent: 'projekte',
    crumb(id) { const p = D.get('projects', id); return p ? p.name : ''; },
    render(id) {
      const p = D.get('projects', id); if (!p || p.deletedAt) return '<div class="card">' + UI.empty('folderKanban', 'Projekt nicht gefunden', '', '<a class="btn" href="#projekte">Zu den Projekten</a>') + '</div>';
      const t = today(), s = S(); const tasks = D.all('tasks').filter(x => x.projectId === id); const pr = L.projectProgress(p, D.all('tasks')); const h = L.projectHealth(p, D.all('tasks'), t, s.state);
      const invs = D.all('invoices').filter(i => i.projectId === id); const issued = invs.filter(i => L.isIssued(i) && i.status !== 'storniert' && i.type !== 'storno');
      const billed = L.r2(issued.reduce((a, i) => a + L.totals(i).net, 0)); const paid = L.r2(issued.reduce((a, i) => a + L.paidAmount(i), 0)); const open = L.r2(issued.reduce((a, i) => a + L.openAmount(i), 0));
      const st = App.ui('projekt'); const tab = st.tab || 'aufgaben';
      let html = '<div class="card" style="margin-bottom:14px"><div class="row start wrap gap-12"><div class="grow"><div class="row wrap"><h2 style="margin:0;font-size:21px;letter-spacing:-.02em">' + esc(p.name) + '</h2>' + H.pstatus(p.status) + '<span class="chip ' + ({ green: 'good', yellow: 'warn', red: 'bad' }[h.level] || '') + '"><span class="health ' + h.level + '"></span>' + esc(h.label) + '</span></div>' +
        '<div class="muted small" style="margin-top:4px">' + H.co(p.companyId) + ' · ' + esc(L.labelOf(L.PROJECT_TYPES, p.projectType)) + ' · ' + F.date(p.startDate) + ' – ' + F.date(p.deadline) + (p.deadline && p.status !== 'abgeschlossen' ? ' (' + F.rel(p.deadline) + ')' : '') + '</div>' +
        (h.reasons.length ? '<div class="small" style="margin-top:6px;color:var(--bad)">' + esc(h.reasons.join(' · ')) + '</div>' : '') + '</div>' +
        '<div class="row wrap"><select class="in sm" style="width:auto" data-act-change="projStatus" data-id="' + id + '">' + UI.optList(L.PROJECT_STATUS, p.status) + '</select><button class="btn sm" data-act="editProject" data-id="' + id + '">' + ic('pencil', 's') + 'Bearbeiten</button><button class="btn sm icon" data-act="projectMenu" data-id="' + id + '">' + ic('more') + '</button></div></div>' +
        '<div class="row" style="margin-top:14px"><div class="progress grow" style="height:8px"><i style="width:' + pr + '%"></i></div><b>' + pr + ' %</b></div>' +
        '<div class="kpis" style="margin-top:14px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">' + ['Auftragswert|' + F.money(p.value, 0), 'Abgerechnet|' + F.money(billed, 0), 'Bezahlt (brutto)|' + F.money(paid, 0), 'Offen|' + (open ? F.money(open, 0) : '–'), 'Offene Aufgaben|' + tasks.filter(x => x.status !== 'erledigt').length].map(x => { const [l, v] = x.split('|'); return '<div class="kpi" style="box-shadow:none;background:var(--panel-2);padding:10px 12px"><div class="lbl">' + l + '</div><div class="val" style="font-size:17px">' + v + '</div></div>'; }).join('') + '</div>' +
        '<div class="row wrap" style="margin-top:12px"><button class="btn sm" data-act="newTaskFor" data-project="' + id + '">' + ic('checkSquare', 's') + 'Aufgabe</button><button class="btn sm" data-act="newEventFor" data-project="' + id + '">' + ic('calendar', 's') + 'Termin</button><button class="btn sm" data-act="newNoteFor" data-project="' + id + '">' + ic('note', 's') + 'Notiz</button><button class="btn sm" data-act="projInvoice" data-id="' + id + '">' + ic('receipt', 's') + 'Rechnung</button><button class="btn sm" data-act="projStatusMail" data-id="' + id + '">' + ic('send', 's') + 'Status-Update an Kunden</button>' + (AI.available ? '<button class="btn sm" data-act="aiProject" data-id="' + id + '">' + ic('sparkles', 's') + 'Risiken prüfen</button>' : '') + '</div><div id="ai-proj"></div></div>';
      const tabs = [['aufgaben', 'Aufgaben', tasks.filter(x => x.status !== 'erledigt').length], ['meilensteine', 'Meilensteine', (p.milestones || []).length], ['dokumente', 'Dokumente', D.all('documents').filter(d => d.projectId === id).length], ['rechnungen', 'Rechnungen', invs.length], ['verlauf', 'Verlauf & Kommunikation'], ['notizen', 'Beschreibung & Notizen']];
      html += '<div class="tabs">' + tabs.map(([k, l, n]) => '<button class="' + (tab === k ? 'on' : '') + '" data-act="setUi" data-view="projekt" data-k="tab" data-v="' + k + '">' + l + (n ? ' <span class="n">' + n + '</span>' : '') + '</button>').join('') + '</div>';
      if (tab === 'aufgaben') {
        const phases = []; for (const x of tasks) { const ph = x.phase || 'Weitere Aufgaben'; if (!phases.includes(ph)) phases.push(ph); }
        html += '<div class="card">' + (tasks.length ? phases.map(ph => { const xs = tasks.filter(x => (x.phase || 'Weitere Aufgaben') === ph).sort((a, b) => (a.due > b.due ? 1 : -1)); const dn = xs.filter(x => x.status === 'erledigt').length; return '<div class="nav-group" style="margin:10px 0 2px">' + esc(ph) + ' <span class="faint">' + dn + '/' + xs.length + '</span></div><div class="list">' + xs.map(x => H.taskRow(x, { noLink: true })).join('') + '</div>'; }).join('') : UI.empty('checkSquare', 'Keine Aufgaben', 'Füge Aufgaben hinzu oder wende eine Vorlage an.', '<button class="btn" data-act="applyTpl" data-id="' + id + '">' + ic('layers') + 'Vorlage anwenden</button>')) + '<div style="margin-top:10px"><button class="btn sm" data-act="newTaskFor" data-project="' + id + '">' + ic('plus', 's') + 'Aufgabe hinzufügen</button></div></div>';
      } else if (tab === 'meilensteine') {
        html += '<div class="card">' + ((p.milestones || []).length ? '<div class="list">' + (p.milestones || []).slice().sort((a, b) => (a.due > b.due ? 1 : -1)).map(m => '<div class="li"><button class="check ' + (m.done ? 'on' : '') + '" data-act="toggleMs" data-p="' + id + '" data-m="' + m.id + '">' + ic('check') + '</button><div class="grow"><div class="t ' + (m.done ? 'done-t' : '') + '">' + esc(m.title) + '</div><div class="m">' + (m.phase ? esc(m.phase) + ' · ' : '') + (m.who === 'kunde' ? 'Abnahme durch Kunden · ' : '') + 'fällig ' + F.date(m.due) + (m.done && m.doneAt ? ' · erreicht ' + F.date(m.doneAt) : '') + '</div></div>' + (!m.done && m.due < t ? '<span class="chip bad">überfällig</span>' : '') + '<button class="btn xs icon" data-act="msMenu" data-p="' + id + '" data-m="' + m.id + '">' + ic('more') + '</button></div>').join('') + '</div>' : '<div class="faint small">Keine Meilensteine.</div>') + '<div style="margin-top:10px"><button class="btn sm" data-act="addMs" data-id="' + id + '">' + ic('plus', 's') + 'Meilenstein</button></div></div>';
      } else if (tab === 'dokumente') html += V.docList(D.all('documents').filter(d => d.projectId === id), { projectId: id, companyId: p.companyId });
      else if (tab === 'rechnungen') html += '<div class="card"><div class="card-h"><h3>Rechnungs- und Zahlungsstatus</h3><div class="tools"><button class="btn sm" data-act="projInvoice" data-id="' + id + '">' + ic('plus', 's') + 'Rechnung</button></div></div>' + (invs.length ? '<div class="list">' + invs.map(i => '<a class="li click" href="#rechnung-' + i.id + '" style="color:inherit;text-decoration:none"><span class="grow">' + esc((i.title || 'Rechnung') + ' ' + (i.number || '(Entwurf)')) + '</span>' + H.istatus(i) + '<b class="num small">' + F.money(L.totals(i).gross) + '</b></a>').join('') + '</div>' : '<div class="faint small">Noch keine Rechnungen zu diesem Projekt.</div>') + '</div>';
      else if (tab === 'verlauf') html += '<div class="card">' + H.timeline(H.timelineItems(x => x.projectId === id || (p.dealId && x.dealId === p.dealId))) + '</div>';
      else html += '<div class="card"><div class="card-h"><h3>Beschreibung</h3></div><div style="white-space:pre-wrap">' + (p.description ? esc(p.description) : '<span class="faint">Keine Beschreibung.</span>') + '</div><div class="divider"></div><div class="card-h"><h3>Notizen</h3><div class="tools"><button class="btn sm" data-act="newNoteFor" data-project="' + id + '">' + ic('plus', 's') + 'Notiz</button></div></div>' + D.all('notes').filter(n => n.projectId === id).map(n => '<div class="tl"><div class="ic">' + ic('note') + '</div><div class="b"><div class="m">' + F.date(n.at) + '</div><div class="x">' + esc(n.text) + '</div></div></div>').join('') + '</div>';
      return html;
    }
  };
  ACT.editProject = el => E.project(D.get('projects', el.dataset.id));
  ACT.projStatus = el => UI.run(() => O.setProjectStatus(el.dataset.id, el.value), 'Status geändert');
  ACT.toggleMs = el => UI.run(() => O.toggleMilestone(el.dataset.p, el.dataset.m));
  ACT.addMs = el => UI.form({ title: 'Meilenstein', size: 'narrow', values: { due: L.addWorkdays(today(), 5, S().state), who: 'ich' }, fields: [{ key: 'title', label: 'Titel', required: true, full: true, autofocus: true }, { key: 'due', label: 'Fällig am', type: 'date', required: true }, { key: 'who', label: 'Abnahme durch', type: 'select', options: [['ich', 'Mich'], ['kunde', 'Kunden']] }], onSubmit: async v => { const p = D.get('projects', el.dataset.id); await D.update('projects', p.id, { milestones: (p.milestones || []).concat([Object.assign({ id: 'm' + D.newId(), done: false }, v)]) }); UI.toast('Meilenstein hinzugefügt'); } });
  ACT.msMenu = el => { const p = D.get('projects', el.dataset.p); const m = (p.milestones || []).find(x => x.id === el.dataset.m); UI.menu(el, [{ label: 'Bearbeiten', icon: 'pencil', fn: () => UI.form({ title: 'Meilenstein', size: 'narrow', values: m, fields: [{ key: 'title', label: 'Titel', required: true, full: true }, { key: 'due', label: 'Fällig am', type: 'date', required: true }, { key: 'who', label: 'Abnahme durch', type: 'select', options: [['ich', 'Mich'], ['kunde', 'Kunden']] }], onSubmit: async v => { await D.update('projects', p.id, { milestones: p.milestones.map(x => (x.id === m.id ? Object.assign({}, x, v) : x)) }); } }) }, { label: 'Entfernen', icon: 'trash', danger: true, fn: () => UI.run(() => D.update('projects', p.id, { milestones: p.milestones.filter(x => x.id !== m.id) }), 'Entfernt') }]); };
  ACT.projectMenu = el => { const p = D.get('projects', el.dataset.id); UI.menu(el, [{ label: 'Vorlage anwenden', icon: 'layers', fn: () => ACT.applyTpl({ dataset: { id: p.id } }) }, { label: 'Dokument hochladen', icon: 'upload', fn: () => V.uploadDialog({ projectId: p.id, companyId: p.companyId }) }, { label: 'Als Vorlage speichern', icon: 'copy', fn: () => saveAsTemplate(p) }, { sep: true }, { label: 'In den Papierkorb', icon: 'trash', danger: true, fn: async () => { if (await UI.confirm({ title: 'Projekt löschen?', text: 'Das Projekt kommt in den Papierkorb (Aufgaben bleiben erhalten).', ok: 'Löschen', danger: true })) { await UI.run(() => D.softDelete('projects', p.id), 'Gelöscht'); App.go('projekte'); } } }]); };
  ACT.applyTpl = el => { const p = D.get('projects', el.dataset.id); UI.form({ title: 'Vorlage anwenden', size: 'narrow', values: { tpl: (L.templateForType(D.templates(), p.projectType) || {}).id, start: p.startDate || today() }, fields: [{ key: 'tpl', label: 'Vorlage', type: 'select', options: D.templates().map(t => ({ id: t.id, label: t.name })), full: true }, { key: 'start', label: 'Ab Datum', type: 'date', full: true }], onSubmit: async v => { const tpl = D.templates().find(t => t.id === v.tpl); const r = L.applyTemplate(tpl, v.start, S().state); for (const x of r.tasks) await D.create('tasks', { title: x.title, due: x.due, assignee: x.assignee, phase: x.phase, recurrence: x.recurrence, priority: 'mittel', status: 'offen', projectId: p.id, companyId: p.companyId, kind: 'task', source: 'Vorlage ' + tpl.name }, { silent: true }); await D.update('projects', p.id, { milestones: (p.milestones || []).concat(r.milestones.map(m => Object.assign({}, m, { id: 'm' + D.newId() }))), deadline: p.deadline || r.deadline, templateId: tpl.id }); UI.toast(r.tasks.length + ' Aufgaben & ' + r.milestones.length + ' Meilensteine angelegt'); } }); };
  ACT.projInvoice = el => { const p = D.get('projects', el.dataset.id); UI.menu(el, [{ label: 'Anzahlungsrechnung', icon: 'receipt', fn: () => V.newInvoiceDialog({ projectId: p.id, type: 'anzahlung' }) }, { label: 'Schlussrechnung (Anzahlungen abziehen)', icon: 'receipt', fn: () => V.newInvoiceDialog({ projectId: p.id, type: 'schluss' }) }, { label: 'Einzelrechnung', icon: 'receipt', fn: () => V.newInvoiceDialog({ projectId: p.id, type: 'rechnung' }) }]); };
  ACT.projStatusMail = el => { const p = D.get('projects', el.dataset.id); const ctx = A.context('projects', p.id); const m = O.renderTemplate('statusupdate', ctx.vars); E.emailCompose({ title: 'Status-Update: ' + p.name, to: ctx.recipient.email, subject: m.subject, body: m.body, refs: { companyId: p.companyId, projectId: p.id, contactId: ctx.recipient.contact && ctx.recipient.contact.id }, ai: 'Schreibe ein Status-Update (5–7 Sätze) an den Kunden zum Projekt „' + p.name + '“: Was ist erledigt? Was kommt als Nächstes? Was wird vom Kunden benötigt – bis wann? Steht der Termin ' + F.date(p.deadline) + '? Daten: ' + JSON.stringify({ erledigt: ctx.vars.erledigt, naechstes: ctx.vars.naechstes, zulieferung: ctx.vars.zulieferung }) }); };
  ACT.aiProject = async el => {
    const p = D.get('projects', el.dataset.id); const box = document.getElementById('ai-proj'); box.innerHTML = '<div class="note" style="margin-top:12px">' + ic('sparkles') + '<span class="grow" id="ai-proj-t">KI prüft den Zeitplan …</span></div>'; const out = document.getElementById('ai-proj-t');
    const tasks = D.all('tasks').filter(x => x.projectId === p.id).map(x => ({ titel: x.title, faellig: x.due, status: x.status, zustaendig: x.assignee, phase: x.phase }));
    try { const r = await AI.ask(AI.SYSTEM + '\n\nAnalysiere dieses Webdesign-Projekt auf Verzögerungsrisiken. Heute ist ' + today() + '. Nenne 1) Ampel mit Begründung, 2) bis zu 3 konkrete Risiken (insb. Kundenzulieferungen), 3) bis zu 3 Maßnahmen. Max. 150 Wörter.\n\n' + JSON.stringify({ projekt: { name: p.name, start: p.startDate, deadline: p.deadline, status: p.status, meilensteine: p.milestones }, aufgaben: tasks }), { onText: x => { out.textContent = x.text; } }); out.textContent = r.text; } catch (e) { out.textContent = AI.errorText(e); }
  };
  async function saveAsTemplate(p) {
    const name = await UI.prompt({ title: 'Als Vorlage speichern', label: 'Name der Vorlage', value: L.labelOf(L.PROJECT_TYPES, p.projectType) + ' (aus ' + p.name + ')', required: true }); if (!name) return;
    const tasks = D.all('tasks').filter(x => x.projectId === p.id); const start = p.startDate || today();
    const off = d => Math.max(0, L.workdaysBetween(start, d || start, S().state));
    const phases = {}; for (const x of tasks) { const ph = x.phase || 'Aufgaben'; (phases[ph] = phases[ph] || []).push({ title: x.title, offset: off(x.due), who: x.assignee || 'ich', recurrence: x.recurrence || 'none' }); }
    for (const m of (p.milestones || [])) { const ph = m.phase || 'Meilensteine'; (phases[ph] = phases[ph] || []).push({ title: m.title, offset: off(m.due), who: m.who || 'ich', milestone: true }); }
    const tpl = { id: 'tpl-' + D.newId(), name, projectType: p.projectType || 'website', phases: Object.keys(phases).map(k => ({ name: k, tasks: phases[k].sort((a, b) => a.offset - b.offset) })) };
    await UI.run(() => D.setMeta('templates', { list: D.templates().concat([tpl]) }), 'Vorlage gespeichert');
  }

  /* Vorlagen-Editor (grafisch) */
  ACT.tplEditor = () => {
    const list = JSON.parse(JSON.stringify(D.templates())); let cur = 0;
    const draw = el => {
      const t = list[cur];
      el.querySelector('#tpl-body').innerHTML = '<div class="row wrap" style="margin-bottom:12px"><select class="in" style="max-width:260px" id="tpl-sel">' + list.map((x, i) => '<option value="' + i + '"' + (i === cur ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select><button class="btn sm" id="tpl-new">' + ic('plus', 's') + 'Neue Vorlage</button><button class="btn sm danger" id="tpl-del">' + ic('trash', 's') + 'Vorlage löschen</button></div>' +
        '<div class="form" style="margin-bottom:12px"><div class="field"><label>Name</label><input class="in" data-k="name" value="' + esc(t.name) + '"></div><div class="field"><label>Projektart (Standard für)</label><select class="in" data-k="projectType">' + UI.optList(L.PROJECT_TYPES, t.projectType) + '</select></div></div>' +
        '<div class="note" style="margin-bottom:10px">' + ic('info') + '<span>„Tag“ = Werktage ab Projektbeginn (Wochenenden & Feiertage werden übersprungen). Dauern sind Schätzungen – nach jedem Projekt nachjustieren.</span></div>' +
        t.phases.map((ph, pi) => '<div class="card flat tight" style="margin-bottom:10px"><div class="row" style="margin-bottom:6px"><input class="in sm" style="font-weight:600" data-ph="' + pi + '" value="' + esc(ph.name) + '"><button class="btn xs danger" data-delph="' + pi + '">' + ic('trash', 's') + '</button></div><table class="items-ed"><thead><tr><th>Aufgabe</th><th style="width:70px">Tag</th><th style="width:110px">Zuständig</th><th style="width:110px">Art</th><th style="width:34px"></th></tr></thead><tbody>' +
          ph.tasks.map((x, ti) => '<tr><td><input class="in" data-t="' + pi + ':' + ti + ':title" value="' + esc(x.title) + '"></td><td><input class="in num" type="number" min="0" data-t="' + pi + ':' + ti + ':offset" value="' + (x.offset || 0) + '"></td><td><select class="in" data-t="' + pi + ':' + ti + ':who">' + UI.optList([['ich', 'Ich'], ['kunde', 'Kunde']], x.who) + '</select></td><td><select class="in" data-t="' + pi + ':' + ti + ':kind">' + UI.optList([['task', 'Aufgabe'], ['milestone', 'Meilenstein'], ['monthly', 'Monatlich']], x.milestone ? 'milestone' : x.recurrence === 'monthly' ? 'monthly' : 'task') + '</select></td><td><button class="btn xs icon" data-delt="' + pi + ':' + ti + '">' + ic('x', 's') + '</button></td></tr>').join('') + '</tbody></table><button class="btn xs" data-addt="' + pi + '" style="margin-top:6px">' + ic('plus', 's') + 'Aufgabe</button></div>').join('') +
        '<button class="btn sm" id="tpl-addph">' + ic('plus', 's') + 'Phase hinzufügen</button>';
    };
    const sync = el => {
      const t = list[cur]; el.querySelectorAll('[data-k]').forEach(i => { t[i.dataset.k] = i.value; });
      el.querySelectorAll('[data-ph]').forEach(i => { t.phases[Number(i.dataset.ph)].name = i.value; });
      el.querySelectorAll('[data-t]').forEach(i => { const [pi, ti, k] = i.dataset.t.split(':'); const x = t.phases[pi].tasks[ti]; if (k === 'kind') { x.milestone = i.value === 'milestone'; x.recurrence = i.value === 'monthly' ? 'monthly' : 'none'; } else x[k] = k === 'offset' ? Number(i.value) || 0 : i.value; });
    };
    UI.dialog({
      title: 'Projektvorlagen', size: 'xwide', sticky: true, body: '<div id="tpl-body"></div>', foot: '<button class="btn left" data-reset>Standardvorlagen wiederherstellen</button><button class="btn" data-close>Abbrechen</button><button class="btn primary" data-save>Speichern</button>',
      onMount: (el, close) => {
        draw(el);
        el.addEventListener('click', e => {
          const b = e.target.closest('button'); if (!b) return; sync(el); const t = list[cur];
          if (b.id === 'tpl-new') { list.push({ id: 'tpl-' + D.newId(), name: 'Neue Vorlage', projectType: 'sonstiges', phases: [{ name: 'Phase 1', tasks: [{ title: 'Kick-off', offset: 0, who: 'ich' }] }] }); cur = list.length - 1; }
          else if (b.id === 'tpl-del') { if (list.length > 1) { list.splice(cur, 1); cur = 0; } }
          else if (b.id === 'tpl-addph') t.phases.push({ name: 'Neue Phase', tasks: [] });
          else if (b.dataset.delph) t.phases.splice(Number(b.dataset.delph), 1);
          else if (b.dataset.addt) { const ph = t.phases[Number(b.dataset.addt)]; ph.tasks.push({ title: '', offset: ph.tasks.length ? ph.tasks[ph.tasks.length - 1].offset : 0, who: 'ich' }); }
          else if (b.dataset.delt) { const [pi, ti] = b.dataset.delt.split(':').map(Number); t.phases[pi].tasks.splice(ti, 1); }
          else return;
          draw(el);
        });
        el.addEventListener('change', e => { if (e.target.id === 'tpl-sel') { sync(el); cur = Number(e.target.value); draw(el); } });
        el.querySelector('[data-save]').onclick = async () => { sync(el); for (const t of list) for (const ph of t.phases) ph.tasks = ph.tasks.filter(x => String(x.title).trim()); await UI.run(() => D.setMeta('templates', { list }), 'Vorlagen gespeichert'); close(true); };
        el.querySelector('[data-reset]').onclick = async () => { if (await UI.confirm({ title: 'Standardvorlagen wiederherstellen?', text: 'Eigene Änderungen an den Vorlagen gehen verloren.', ok: 'Wiederherstellen', danger: true })) { await UI.run(() => D.setMeta('templates', { list: L.DEFAULT_TEMPLATES }), 'Standardvorlagen wiederhergestellt'); close(true); } };
      }
    });
  };

  /* ================= Aufgaben ================= */
  V.aufgaben = {
    title: 'Aufgaben', icon: 'checkSquare',
    render() {
      const st = App.ui('aufgaben'); const f = st.f || 'heute'; const t = today(); const s = S();
      const endWeek = L.addDays(t, 6); const all = D.all('tasks');
      const open = all.filter(x => x.status !== 'erledigt');
      const sets = {
        heute: open.filter(x => x.due && x.due <= t), woche: open.filter(x => x.due && x.due <= endWeek), alle: open, kunde: open.filter(x => x.assignee === 'kunde'),
        wiedervorlagen: open.filter(x => x.kind === 'followup'), ohne: open.filter(x => !x.due), erledigt: all.filter(x => x.status === 'erledigt').sort((a, b) => (b.doneAt > a.doneAt ? 1 : -1)).slice(0, 100)
      };
      const list = sets[f] || open;
      let html = '<div class="page-head"><div><h2>Aufgaben</h2><p>Persönliche und projektbezogene Aufgaben, Wiedervorlagen und Kundenzulieferungen – automatisch aus Ereignissen erzeugt oder manuell.</p></div><div class="actions"><button class="btn primary" data-act="newTask">' + ic('plus') + 'Aufgabe</button></div></div>';
      html += '<div class="toolbar"><div class="pill-filter">' + [['heute', 'Heute & überfällig'], ['woche', 'Diese Woche'], ['alle', 'Alle offenen'], ['wiedervorlagen', 'Wiedervorlagen'], ['kunde', 'Beim Kunden'], ['ohne', 'Ohne Datum'], ['erledigt', 'Erledigt']].map(([k, l]) => '<button class="' + (f === k ? 'on' : '') + '" data-act="setUi" data-view="aufgaben" data-k="f" data-v="' + k + '">' + l + ' <span class="faint">' + sets[k].length + '</span></button>').join('') + '</div></div>';
      html += '<div class="card" style="margin-bottom:14px"><form class="row" data-quickadd><input class="in" name="qa" placeholder="Schnell hinzufügen: z. B. „Angebot Krause nachfassen“ und Enter" autocomplete="off"><select class="in" name="qd" style="width:auto">' + UI.optList([[t, 'Heute'], [L.addWorkdays(t, 1, s.state), 'Nächster Werktag'], [L.addWorkdays(t, 5, s.state), 'In einer Woche'], ['', 'Ohne Datum']], t) + '</select><button class="btn primary">' + ic('plus', 's') + '</button></form></div>';
      if (!list.length) return html + '<div class="card">' + UI.empty('checkSquare', f === 'heute' ? 'Alles erledigt für heute' : 'Keine Aufgaben', 'Aufgaben entstehen auch automatisch – z. B. bei neuen Anfragen, versendeten Angeboten oder Projektstarts.') + '</div>';
      if (f === 'woche' || f === 'alle') {
        const groups = {}; for (const x of list.sort((a, b) => ((a.due || '9999') > (b.due || '9999') ? 1 : -1))) { const k = !x.due ? 'Ohne Datum' : x.due < t ? 'Überfällig' : x.due === t ? 'Heute' : F.weekdayName(x.due) + ', ' + F.date(x.due); (groups[k] = groups[k] || []).push(x); }
        html += Object.keys(groups).map(k => '<div class="card" style="margin-bottom:12px"><div class="card-h"><h3>' + esc(k) + '</h3><span class="sub">' + groups[k].length + '</span></div><div class="list">' + groups[k].map(x => H.taskRow(x)).join('') + '</div></div>').join('');
      } else html += '<div class="card"><div class="list">' + list.sort((a, b) => f === 'erledigt' ? 0 : ((a.due || '9999') > (b.due || '9999') ? 1 : -1)).map(x => H.taskRow(x)).join('') + '</div></div>';
      return html;
    },
    mount(el) {
      const fm = el.querySelector('[data-quickadd]'); if (fm) fm.addEventListener('submit', async e => { e.preventDefault(); const v = fm.qa.value.trim(); if (!v) return; await UI.run(() => D.create('tasks', { title: v, due: fm.qd.value || null, priority: 'mittel', status: 'offen', kind: 'task', assignee: 'ich', recurrence: 'none', source: 'manuell' }), 'Aufgabe angelegt'); fm.qa.value = ''; setTimeout(() => { const i = document.querySelector('[name="qa"]'); if (i) i.focus(); }, 50); });
    }
  };
  ACT.newTask = () => E.task(null, App.ctxPre());

  /* ================= Kalender ================= */
  V.kalender = {
    title: 'Kalender', icon: 'calendar',
    render() {
      const st = App.ui('kalender');
      return '<div class="page-head"><div><h2>Kalender</h2><p>Termine, fällige Aufgaben, Meilensteine, Deadlines und Zahlungsfälligkeiten – mit Feiertagen (' + esc(L.labelOf(L.STATES, S().state)) + ').</p></div><div class="actions"><button class="btn primary" data-act="newEvent">' + ic('plus') + 'Termin</button></div></div>' +
        '<div class="toolbar"><div class="seg">' + [['monat', 'Monat'], ['agenda', 'Agenda']].map(([k, l]) => '<button class="' + ((st.mode || 'monat') === k ? 'on' : '') + '" data-act="setUi" data-view="kalender" data-k="mode" data-v="' + k + '">' + l + '</button>').join('') + '</div><div class="pill-filter">' + [['events', 'Termine'], ['tasks', 'Aufgaben'], ['proj', 'Projekte'], ['inv', 'Zahlungen']].map(([k, l]) => '<button class="' + (st['h_' + k] ? '' : 'on') + '" data-act="calLayer" data-k="' + k + '">' + l + '</button>').join('') + '</div></div>' +
        ((st.mode || 'monat') === 'agenda' ? agenda() : V.calendarHtml({}));
    },
    mount(el) { V.calendarMount(el); }
  };
  function calItems(o) {
    const st = App.ui('kalender'); const items = []; const t = today();
    if (!o.onlyProjects && !st.h_events) for (const e of D.all('events')) items.push({ d: L.dateOf(e.start), cls: 'ev', label: F.time(e.start) + ' ' + e.title, act: 'editEvent', id: e.id, sort: e.start });
    if (!o.onlyProjects && !st.h_tasks) for (const x of D.all('tasks').filter(x => x.due)) items.push({ d: x.due, cls: 'ev task' + (x.status === 'erledigt' ? ' done' : ''), label: x.title, act: 'editTaskCal', id: x.id, sort: x.due + 'Z' });
    if (o.onlyProjects || !st.h_proj) for (const p of D.all('projects')) { if (p.deadline) items.push({ d: p.deadline, cls: 'ev dl', label: '⚑ ' + p.name, href: 'projekt-' + p.id, sort: p.deadline + 'A' }); if (p.startDate && o.onlyProjects) items.push({ d: p.startDate, cls: 'ev', label: '▶ ' + p.name, href: 'projekt-' + p.id, sort: p.startDate }); for (const m of (p.milestones || [])) if (m.due) items.push({ d: m.due, cls: 'ev ms', label: '◆ ' + m.title, href: 'projekt-' + p.id, sort: m.due + 'B' }); }
    if (!o.onlyProjects && !st.h_inv) for (const i of D.all('invoices').filter(i => L.openAmount(i) > 0 && i.dueDate)) items.push({ d: i.dueDate, cls: 'ev inv', label: '€ ' + i.number + ' fällig', href: 'rechnung-' + i.id, sort: i.dueDate + 'C' });
    void t; return items;
  }
  V.calendarHtml = function (o) {
    const st = App.ui('kalender'); const t = today(); const base = st.month || t.slice(0, 7); const s = S();
    const first = base + '-01'; const startOff = (L.weekday(first) + 6) % 7; const gridStart = L.addDays(first, -startOff);
    const items = calItems(o); const by = {}; for (const it of items) (by[it.d] = by[it.d] || []).push(it);
    let html = '<div class="toolbar"><button class="btn sm icon" data-act="calNav" data-d="-1" aria-label="Vorheriger Monat">' + ic('chevL') + '</button><b style="min-width:150px;text-align:center">' + L.monthLabel(first) + '</b><button class="btn sm icon" data-act="calNav" data-d="1" aria-label="Nächster Monat">' + ic('chevR') + '</button><button class="btn sm" data-act="calNav" data-d="0">Heute</button></div><div class="cal">' + ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => '<div class="wd">' + d + '</div>').join('');
    const dim = Number(L.addDays(L.addMonths(first, 1), -1).slice(8, 10)); const cells = Math.ceil((startOff + dim) / 7) * 7;
    for (let i = 0; i < cells; i++) {
      const d = L.addDays(gridStart, i);
      const xs = (by[d] || []).sort((a, b) => (a.sort > b.sort ? 1 : -1)); const hol = L.holidayName(d, s.state); const we = [0, 6].includes(L.weekday(d));
      html += '<div class="day ' + (d.slice(0, 7) !== base ? 'out ' : '') + (d === t ? 'today ' : '') + (we || hol ? 'we' : '') + '" data-act="calDay" data-d="' + d + '"><div class="dn"><b>' + Number(d.slice(8)) + '</b>' + (hol ? '<span class="hol" title="' + esc(hol) + '">' + esc(hol) + '</span>' : '') + '</div>' +
        xs.slice(0, 4).map(it => '<div class="' + it.cls + '" ' + (it.href ? 'data-href="' + it.href + '"' : 'data-act="' + it.act + '" data-id="' + it.id + '"') + ' title="' + esc(it.label) + '">' + esc(it.label) + '</div>').join('') + (xs.length > 4 ? '<div class="ev more">+' + (xs.length - 4) + ' weitere</div>' : '') + '</div>';
    }
    return html + '</div>';
  };
  V.calendarMount = function () { };
  function agenda() {
    const t = today(); const items = calItems({}).filter(x => x.d >= t && x.d <= L.addDays(t, 30)).sort((a, b) => (a.sort > b.sort ? 1 : -1)); const s = S();
    if (!items.length) return '<div class="card">' + UI.empty('calendar', 'Nichts in den nächsten 30 Tagen', '') + '</div>';
    const by = {}; for (const it of items) (by[it.d] = by[it.d] || []).push(it);
    return Object.keys(by).map(d => '<div class="card" style="margin-bottom:10px"><div class="card-h"><h3>' + F.weekdayName(d) + ', ' + F.date(d) + '</h3><span class="sub">' + (d === t ? 'Heute' : F.rel(d)) + (L.holidayName(d, s.state) ? ' · ' + esc(L.holidayName(d, s.state)) : '') + '</span></div><div class="stack tight">' + by[d].map(it => '<div class="' + it.cls + '" style="font-size:13px;padding:6px 10px;white-space:normal" ' + (it.href ? 'data-href="' + it.href + '"' : 'data-act="' + it.act + '" data-id="' + it.id + '"') + '>' + esc(it.label) + '</div>').join('') + '</div></div>').join('');
  }
  ACT.calNav = el => { const st = App.ui('kalender'); const d = Number(el.dataset.d); st.month = d === 0 ? today().slice(0, 7) : L.addMonths((st.month || today().slice(0, 7)) + '-01', d).slice(0, 7); App.saveUi(); App.render(); };
  ACT.calLayer = el => { const st = App.ui('kalender'); st['h_' + el.dataset.k] = !st['h_' + el.dataset.k]; App.saveUi(); App.render(); };
  ACT.calDay = (el, e) => { if (e && e.target.closest('.ev')) return; E.event(null, { date: el.dataset.d }); };
  ACT.newEvent = () => E.event(null, App.ctxPre());
  ACT.editEvent = el => E.event(D.get('events', el.dataset.id));
  ACT.editTaskCal = el => E.task(D.get('tasks', el.dataset.id));
})();
