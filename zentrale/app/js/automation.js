/* Agentur-Zentrale – Automatisierungs-Engine: Regeln, Freigaben, Protokoll, Zeitpläne */
(function () {
  'use strict';
  const A = { running: false, lastScheduledRun: null };
  const today = () => L.todayBerlin();
  const S = () => D.settings();

  /* Kontext für Bedingungen & Platzhalter */
  A.context = function (col, id, extra) {
    const x = D.get(col, id); if (!x) return null;
    const ctx = Object.assign({}, x, extra || {}); const vars = {};
    const co = x.companyId ? D.get('companies', x.companyId) : (col === 'companies' ? x : null);
    const rcp = O.recipientFor(co && co.id, x.contactId);
    vars.name = rcp.name || (co && co.name) || ''; vars.firma = co ? co.name : '';
    if (col === 'inquiries') { vars.name = (x.raw && (x.raw.name || x.raw.company)) || vars.name; ctx.deal = D.get('deals', x.dealId); }
    if (col === 'deals') { vars.title = x.title; ctx.deal = x; }
    if (col === 'quotes') { ctx.total = L.totals(x).net; ctx.deal = x.dealId ? D.get('deals', x.dealId) : null; vars.number = x.number; vars.gueltig = F.date(x.validUntil); vars.title = x.title; }
    if (col === 'invoices') { ctx.gross = L.totals(x).gross; ctx.daysOverdue = L.daysOverdue(x, today()); Object.assign(vars, O.invoiceVars(x)); }
    if (col === 'projects') {
      vars.name = x.name; vars.projekt = x.name; vars.deadline = F.date(x.deadline);
      const rc = O.recipientFor(x.companyId, x.contactId); vars.kunde = rc.name;
      const tasks = D.all('tasks').filter(t => t.projectId === x.id);
      vars.erledigt = tasks.filter(t => t.status === 'erledigt').slice(-3).map(t => t.title).join(', ') || '–';
      vars.naechstes = tasks.filter(t => t.status !== 'erledigt' && t.assignee !== 'kunde').sort((a, b) => (a.due > b.due ? 1 : -1)).slice(0, 3).map(t => t.title).join(', ') || '–';
      vars.zulieferung = tasks.filter(t => t.status !== 'erledigt' && t.assignee === 'kunde').map(t => t.title + (t.due ? ' (bis ' + F.date(t.due) + ')' : '')).join(', ') || 'aktuell nichts';
    }
    if (col === 'tasks') vars.title = x.title;
    Object.assign(vars, (extra && extra.vars) || {});
    ctx.vars = O.vars(vars); ctx.company = co; ctx.col = col; ctx.recipient = rcp;
    return ctx;
  };

  /* Verarbeitete Ereignisse (genau einmal) */
  let processed = null; let stateTimer = null; let stateWs = null; let dirty = false;
  const loadState = () => { if (!processed) { processed = Object.assign({}, (D.meta.autostate && D.meta.autostate.processed) || {}); stateWs = D.ws; } return processed; };
  const flushState = () => {
    clearTimeout(stateTimer); stateTimer = null; if (!processed || !dirty || !stateWs) return;
    const merged = Object.assign({}, (stateWs === D.ws && D.meta.autostate && D.meta.autostate.processed) || {}, processed);
    const keys = Object.keys(merged).sort((a, b) => merged[a] - merged[b]); const keep = {};
    for (const k of keys.slice(-1500)) keep[k] = merged[k];
    processed = keep; dirty = false; const doc = { processed: keep, updatedAt: D.nowIso() };
    if (stateWs === D.ws) D.meta.autostate = doc;
    D.rawWrite('ws/' + stateWs + '/meta/autostate', 'set', doc).catch(e => console.warn(e));
  };
  A.isProcessed = k => !!loadState()[k];
  A.markProcessed = k => { loadState()[k] = Date.now(); dirty = true; clearTimeout(stateTimer); stateTimer = setTimeout(flushState, 800); };
  A.resetState = () => { flushState(); processed = null; stateWs = null; };

  A.emit = async function (trigger, p) {
    const depth = (p && p.depth) || 0; if (depth > 3) return;
    const key = trigger + ':' + p.id + (p.key != null ? ':' + p.key : '');
    if (A.isProcessed(key)) return; A.markProcessed(key);
    const rules = D.rules().filter(r => r.trigger === trigger && r.mode !== 'pausiert');
    for (const rule of rules) {
      const ctx = A.context(p.col, p.id, p.extra); if (!ctx) continue;
      const condOk = L.evalConditions(rule.conditions, ctx);
      const run = { ruleId: rule.id, rule: rule.name, trigger, col: p.col, recordId: p.id, title: D.titleOf(p.col, D.get(p.col, p.id)) || (p.extra && p.extra.vars && p.extra.vars.subject) || '', mode: rule.mode, conditions: condOk, actions: [], ok: true };
      if (!condOk) { run.actions.push({ type: '–', info: 'Bedingungen nicht erfüllt – keine Aktion' }); D.logRun(run); continue; }
      for (let i = 0; i < (rule.actions || []).length; i++) {
        const act = rule.actions[i];
        if (L.num(act.delayWorkdays) > 0) {
          const runAt = L.addWorkdays(today(), L.num(act.delayWorkdays), S().state);
          if (rule.mode === 'test') { run.actions.push({ type: act.type, info: 'Testlauf: würde am ' + F.date(runAt) + ' ausgeführt' }); continue; }
          await D.create('scheduled', { runAt, ruleId: rule.id, actionIndex: i, action: act, trigger, col: p.col, recordId: p.id, extra: p.extra || null, status: 'geplant' }, { silent: true });
          run.actions.push({ type: act.type, info: 'Geplant für ' + F.date(runAt) });
          continue;
        }
        const res = await A.runAction(rule, act, ctx, depth);
        run.actions.push(res); if (res.ok === false) run.ok = false;
      }
      D.logRun(run);
    }
  };

  A.describe = function (act) {
    const t = L.ACTIONS.find(a => a.id === act.type); let s = t ? t.label : act.type;
    if (act.title) s += ': „' + act.title + '“';
    if (act.stage) s += ': ' + L.stageLabel(act.stage);
    if (act.status) s += ': ' + L.labelOf(L.COMPANY_STATUS, act.status);
    if (act.template) s += ': ' + ((D.emailTemplates()[act.template] || {}).name || act.template);
    if (act.percent) s += ' (' + act.percent + ' %)';
    if (act.dueWorkdays != null && (act.type === 'createTask' || act.type === 'followUp')) s += ' · fällig in ' + act.dueWorkdays + ' Werktag(en)';
    if (L.num(act.delayWorkdays)) s += ' · nach ' + act.delayWorkdays + ' Werktagen';
    if (act.onlyIf) s += ' · nur wenn ' + act.onlyIf.field + ' = ' + (act.onlyIf.field.endsWith('stage') ? L.stageLabel(act.onlyIf.value) : act.onlyIf.value);
    if (act.autoSend) s += ' · AUTOMATISCHER VERSAND';
    return s;
  };

  A.runAction = async function (rule, act, ctx, depth) {
    const v = ctx.vars; const s = S();
    const res = { type: act.type, ok: true, info: '' };
    if (act.onlyIf && !L.evalCondition(act.onlyIf, ctx)) { res.info = 'Übersprungen (Bedingung „' + act.onlyIf.field + '“ nicht mehr erfüllt)'; return res; }
    if (rule.mode === 'test') { res.info = 'Testlauf: ' + A.describe(act); return res; }
    const links = { companyId: ctx.company ? ctx.company.id : (ctx.companyId || null), dealId: ctx.col === 'deals' ? ctx.id : (ctx.dealId || null), projectId: ctx.col === 'projects' ? ctx.id : (ctx.projectId || null) };
    try {
      switch (act.type) {
        case 'createTask': case 'followUp': {
          const t = await D.create('tasks', Object.assign({ title: L.fillTemplate(act.title || 'Aufgabe', Object.assign({}, v, ctx)), due: L.addWorkdays(today(), L.num(act.dueWorkdays), s.state), priority: act.priority || (act.type === 'followUp' ? 'mittel' : 'mittel'), status: 'offen', kind: act.type === 'followUp' ? 'followup' : 'task', source: 'Regel ' + rule.name, invoiceId: ctx.col === 'invoices' ? ctx.id : null, inquiryId: ctx.col === 'inquiries' ? ctx.id : null }, links));
          res.info = (act.type === 'followUp' ? 'Wiedervorlage' : 'Aufgabe') + ' „' + t.title + '“ fällig ' + F.date(t.due); break;
        }
        case 'setDealStage': {
          const dealId = ctx.col === 'deals' ? ctx.id : ctx.dealId; if (!dealId) { res.info = 'Kein Deal verknüpft'; break; }
          await O.setDealStage(dealId, act.stage, { depth: depth + 1 }); res.info = 'Phase → ' + L.stageLabel(act.stage); break;
        }
        case 'setCompanyStatus': {
          if (!links.companyId) { res.info = 'Kein Kunde verknüpft'; break; }
          await O.setCompanyStatus(links.companyId, act.status); res.info = 'Kundenstatus → ' + L.labelOf(L.COMPANY_STATUS, act.status); break;
        }
        case 'createProject': {
          const deal = ctx.col === 'deals' ? D.get('deals', ctx.id) : (ctx.dealId && D.get('deals', ctx.dealId)); if (!deal) { res.info = 'Kein Deal'; break; }
          const p = await O.createProjectFromDeal(deal); res.info = 'Projekt „' + p.name + '“ mit Vorlage angelegt'; break;
        }
        case 'notify': {
          const title = L.fillTemplate(act.title || rule.name, Object.assign({}, v, ctx));
          const link = ctx.col === 'inquiries' ? 'anfragen' : ctx.col === 'projects' ? 'projekt-' + ctx.id : ctx.col === 'invoices' ? 'rechnung-' + ctx.id : ctx.company ? 'kunde-' + ctx.company.id : '';
          await D.notify(title, rule.name, link); res.info = 'Benachrichtigung „' + title + '“'; break;
        }
        case 'draftEmail': {
          const r = ctx.recipient || {}; const m = O.renderTemplate(act.template, Object.assign({}, ctx, v));
          const refs = Object.assign({}, links, { contactId: r.contact ? r.contact.id : null, quoteId: ctx.col === 'quotes' ? ctx.id : null, invoiceId: ctx.col === 'invoices' ? ctx.id : null });
          if (act.autoSend && window.Mail && Mail.available && r.email) {
            try { await Mail.send({ to: r.email, subject: m.subject, body: m.body }); await D.create('comms', Object.assign({ direction: 'out', channel: 'email', subject: m.subject, snippet: m.body.slice(0, 600), at: D.nowIso(), to: r.email, auto: true }, refs), { silent: true }); res.info = 'Automatisch gesendet an ' + r.email + ' (Regel erlaubt Auto-Versand)'; break; }
            catch (e) { res.info = 'Auto-Versand fehlgeschlagen – Entwurf in Freigabe gelegt'; }
          }
          await O.queueEmail({ title: (D.emailTemplates()[act.template] || {}).name || 'E-Mail', to: r.email || '', subject: m.subject, body: m.body, refs, ruleId: rule.id, template: act.template });
          res.info = (res.info ? res.info + ' · ' : '') + 'E-Mail-Entwurf „' + m.subject + '“ wartet auf Freigabe' + (r.email ? '' : ' (Empfänger fehlt)'); break;
        }
        case 'draftInvoice': {
          const dealId = ctx.col === 'deals' ? ctx.id : ctx.dealId; if (!dealId) { res.info = 'Kein Deal'; break; }
          if (D.all('invoices').some(i => i.dealId === dealId && i.type === 'anzahlung')) { res.info = 'Anzahlungsrechnung existiert bereits'; break; }
          const p = D.all('projects').find(x => x.dealId === dealId);
          const inv = await O.newInvoice({ type: 'anzahlung', percent: L.num(act.percent) || 50, dealId, projectId: p ? p.id : null, companyId: links.companyId });
          res.info = 'Anzahlungsrechnung (Entwurf) über ' + F.money(L.totals(inv).gross) + ' angelegt'; break;
        }
        case 'markReminder': {
          const inv = ctx.col === 'invoices' && D.get('invoices', ctx.id); if (!inv) { res.info = 'Keine Rechnung'; break; }
          if (!L.openAmount(inv)) { res.info = 'Bereits bezahlt – keine Erinnerung'; break; }
          const sug = L.dunningSuggestion(inv, today(), s); if (!sug) { res.info = 'Keine Mahnstufe fällig'; break; }
          if (D.all('approvals').some(a => a.kind === 'reminder' && a.status === 'offen' && a.refs && a.refs.invoiceId === inv.id)) { res.info = 'Erinnerung liegt bereits in der Freigabe'; break; }
          const r = O.recipientFor(inv.companyId, inv.contactId); const m = O.renderTemplate(sug.template, O.invoiceVars(inv));
          await D.create('approvals', { kind: 'reminder', level: sug.level, title: sug.label + ' ' + inv.number, to: r.email || '', subject: m.subject, body: m.body, status: 'offen', attachments: [{ type: 'invoice', id: inv.id }], refs: { companyId: inv.companyId, contactId: r.contact ? r.contact.id : null, invoiceId: inv.id, projectId: inv.projectId || null }, ruleId: rule.id });
          res.info = sug.label + ' als Entwurf in der Freigabe'; break;
        }
        default: res.ok = false; res.info = 'Unbekannte Aktion';
      }
    } catch (e) { res.ok = false; res.info = 'Fehler: ' + ((e && (e.message || e.code)) || e); console.error(e); }
    return res;
  };

  /* Zeitgesteuerte Prüfungen (beim Öffnen und alle 10 Minuten, solange die Zentrale offen ist) */
  A.runScheduled = async function () {
    if (A.running || !D.loaded || D.status !== 'ok') return; A.running = true;
    try {
      const t = today(); const s = S();
      for (const job of D.all('scheduled').filter(j => j.status === 'geplant' && j.runAt <= t)) {
        const rule = D.rules().find(r => r.id === job.ruleId);
        const ctx = A.context(job.col, job.recordId, job.extra);
        let res = { type: job.action && job.action.type, info: 'Übersprungen', ok: true };
        if (!rule || rule.mode === 'pausiert') res.info = 'Regel pausiert/entfernt – übersprungen';
        else if (!ctx) res.info = 'Datensatz existiert nicht mehr – übersprungen';
        else res = await A.runAction(rule, Object.assign({}, job.action, { delayWorkdays: 0 }), ctx, 0);
        await D.update('scheduled', job.id, { status: res.ok === false ? 'fehler' : 'erledigt', doneAt: D.nowIso(), result: res.info }, { silent: true });
        D.logRun({ ruleId: job.ruleId, rule: rule ? rule.name : job.ruleId, trigger: job.trigger + ' (geplant)', col: job.col, recordId: job.recordId, title: D.titleOf(job.col, D.get(job.col, job.recordId)), mode: rule ? rule.mode : '', conditions: true, actions: [res], ok: res.ok !== false });
      }
      for (const inv of D.all('invoices')) {
        const sug = L.dunningSuggestion(inv, t, s);
        if (sug) await A.emit('invoice.overdue', { col: 'invoices', id: inv.id, key: 'L' + sug.level });
      }
      for (const task of D.all('tasks').filter(x => x.status !== 'erledigt' && x.due && x.due < t)) await A.emit('task.overdue', { col: 'tasks', id: task.id, key: task.due });
      for (const p of D.all('projects').filter(p => p.status !== 'abgeschlossen')) for (const m of (p.milestones || []).filter(m => !m.done && m.due === t)) await A.emit('milestone.due', { col: 'projects', id: p.id, key: m.id, extra: { milestone: m.title, vars: { milestone: m.title } } });
      if (L.weekday(t) === 1) await A.emitSchedule('schedule.weekly', t);
      if (t.endsWith('-01')) await A.emitSchedule('schedule.monthly', t);
      for (const q of D.all('quotes').filter(q => q.status === 'versendet' && q.validUntil && q.validUntil < t)) await D.update('quotes', q.id, { status: 'abgelaufen' }, { action: 'expired', detail: 'Gültigkeit abgelaufen' });
      if (window.Inbox) await Inbox.pull().catch(e => console.warn('inbox', e));
      if (window.Mail) await Mail.scheduledChecks().catch(e => console.warn('mail', e));
      if (window.Backup) await Backup.auto().catch(e => console.warn('backup', e));
      A.lastScheduledRun = D.nowIso();
    } catch (e) { console.error('scheduler', e); }
    finally { A.running = false; }
  };
  A.emitSchedule = async function (trigger, t) {
    const key = trigger + ':' + t; if (A.isProcessed(key)) return; A.markProcessed(key);
    for (const rule of D.rules().filter(r => r.trigger === trigger && r.mode !== 'pausiert')) {
      const run = { ruleId: rule.id, rule: rule.name, trigger, col: '', recordId: '', title: F.date(t), mode: rule.mode, conditions: true, actions: [], ok: true };
      for (const act of rule.actions || []) run.actions.push(await A.runAction(rule, act, { vars: O.vars({}), col: 'none' }, 0));
      D.logRun(run);
    }
  };
  /* Simulation: zeigt, was eine Regel mit einem Datensatz tun würde – ohne etwas auszuführen */
  A.simulate = async function (rule, col, id) {
    const ctx = A.context(col, id); if (!ctx) return { ok: false, lines: ['Datensatz nicht gefunden'] };
    const lines = []; const condOk = L.evalConditions(rule.conditions, ctx);
    lines.push('Bedingungen: ' + (rule.conditions && rule.conditions.length ? (condOk ? 'erfüllt' : 'NICHT erfüllt') : 'keine (immer erfüllt)'));
    if (condOk) for (const act of rule.actions || []) {
      const delay = L.num(act.delayWorkdays) ? ' (geplant am ' + F.date(L.addWorkdays(today(), L.num(act.delayWorkdays), S().state)) + ')' : '';
      const skip = act.onlyIf && !L.num(act.delayWorkdays) && !L.evalCondition(act.onlyIf, ctx) ? ' → würde übersprungen' : '';
      lines.push('• ' + A.describe(Object.assign({}, act, { title: act.title ? L.fillTemplate(act.title, Object.assign({}, ctx.vars, ctx)) : act.title })) + delay + skip);
    }
    D.logRun({ ruleId: rule.id, rule: rule.name, trigger: rule.trigger + ' (Simulation)', col, recordId: id, title: D.titleOf(col, D.get(col, id)), mode: 'test', conditions: condOk, actions: lines.slice(1).map(l => ({ type: 'sim', info: l })), ok: true });
    return { ok: condOk, lines };
  };
  A.start = function () {
    A.runScheduled();
    if (!A._iv) A._iv = setInterval(() => A.runScheduled(), 10 * 60 * 1000);
  };

  window.A = A;
})();
