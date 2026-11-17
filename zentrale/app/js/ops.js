/* Agentur-Zentrale – Geschäftsvorgänge (verknüpfen Datensätze, lösen Automatisierungen aus) */
(function () {
  'use strict';
  const O = {};
  const today = () => L.todayBerlin();
  const S = () => D.settings();
  const emit = (t, p) => (window.A ? A.emit(t, p) : Promise.resolve());

  /* ---------- Hilfen ---------- */
  O.companyName = id => { const c = D.get('companies', id); return c ? c.name : ''; };
  O.primaryContact = companyId => {
    const c = D.get('companies', companyId); const all = D.all('contacts').filter(x => x.companyId === companyId);
    return (c && c.primaryContactId && D.get('contacts', c.primaryContactId)) || all.find(x => x.isPrimary) || all[0] || null;
  };
  O.recipientFor = (companyId, contactId) => {
    const ct = (contactId && D.get('contacts', contactId)) || O.primaryContact(companyId); const co = D.get('companies', companyId);
    return { email: (ct && ct.email) || (co && co.email) || '', name: (ct && F.personName(ct)) || (co && co.name) || '', contact: ct, company: co };
  };
  O.vars = function (extra) {
    const s = S(); const t = today();
    return Object.assign({ agentur: s.businessName || '', absender: s.ownerName || s.businessName || '', neueFrist: F.date(L.addDays(t, 7)), heute: F.date(t) }, extra || {});
  };
  O.renderTemplate = function (key, vars) {
    const tpl = D.emailTemplates()[key]; if (!tpl) return { subject: '', body: '' };
    return { subject: L.fillTemplate(tpl.subject, vars), body: L.fillTemplate(tpl.body, vars).replace(/\n{3,}/g, '\n\n') };
  };

  /* ---------- Anfrage-Eingang (Workflow A, Kern) ---------- */
  O.intakeInquiry = async function (raw, opt) {
    opt = opt || {};
    const receivedAt = opt.receivedAt || D.nowIso();
    const r = Object.assign({ name: '', company: '', email: '', phone: '', website: '', projectType: '', budget: '', deadline: '', industry: '', message: '' }, raw || {});
    if (r.email) r.email = L.normEmail(r.email);
    if (r.email && !L.validEmail(r.email)) r.email = '';
    const category = L.categorizeInquiry(r, receivedAt);
    const dup = L.findDuplicates(r, D.all('companies'), D.all('contacts'));
    let company = null, contact = null, isNew = false;
    if (dup.result === 'zugeordnet') {
      company = dup.companyId ? D.get('companies', dup.companyId) : null;
      contact = dup.contactId ? D.get('contacts', dup.contactId) : null;
      if (!company && contact && contact.companyId) company = D.get('companies', contact.companyId);
    }
    if (!company) {
      isNew = true;
      const nm = L.splitName(r.name);
      company = await D.create('companies', {
        name: r.company || r.name || r.email || 'Neuer Lead', type: r.company ? 'firma' : 'privat', status: 'lead', source: opt.channel || 'website',
        industry: category.industry || '', website: r.website || '', email: r.company ? '' : r.email, phone: r.company ? '' : r.phone,
        address: { street: '', zip: '', city: '', country: 'Deutschland' }, socials: {}, notes: '', tags: [], number: null
      });
      if (r.name || r.email) {
        contact = await D.create('contacts', { companyId: company.id, firstName: nm.firstName, lastName: nm.lastName, email: r.email, phone: r.phone, role: '', isPrimary: true });
        await D.update('companies', company.id, { primaryContactId: contact.id }, { silent: true });
      }
    } else {
      // neue Informationen dem bestehenden Datensatz zuordnen (nur leere Felder ergänzen)
      const patch = {};
      if (!company.website && r.website) patch.website = r.website;
      if (!company.industry && category.industry) patch.industry = category.industry;
      if (company.status === 'verloren' || company.status === 'inaktiv') patch.status = 'interessent';
      if (Object.keys(patch).length) company = await D.update('companies', company.id, patch, { detail: 'Daten aus neuer Anfrage ergänzt' });
      if (!contact && (r.email || r.name)) {
        const nm = L.splitName(r.name);
        contact = await D.create('contacts', { companyId: company.id, firstName: nm.firstName, lastName: nm.lastName, email: r.email, phone: r.phone, role: '', isPrimary: !O.primaryContact(company.id) });
      } else if (contact) {
        const p = {}; if (!contact.phone && r.phone) p.phone = r.phone; if (Object.keys(p).length) contact = await D.update('contacts', contact.id, p, { silent: true });
      }
    }
    const deal = await D.create('deals', {
      title: (L.labelOf(L.PROJECT_TYPES, category.projectType)) + ' – ' + company.name, companyId: company.id, contactId: contact ? contact.id : null,
      stage: 'neu', value: category.budgetValue || 0, source: opt.channel || 'website', projectType: category.projectType,
      stageHistory: [{ stage: 'neu', at: D.nowIso() }], openedAt: receivedAt, expectedClose: null, lostReason: '', notes: ''
    });
    const inquiry = await D.create('inquiries', {
      receivedAt, channel: opt.channel || 'website', raw: r, category, companyId: company.id, contactId: contact ? contact.id : null, dealId: deal.id,
      status: 'neu', consent: !!opt.consent, gmailThreadId: opt.gmailThreadId || null, inboxId: opt.inboxId || null, dup: { result: dup.result, reason: dup.reason || '', candidates: dup.candidates || [] }
    });
    await D.update('deals', deal.id, { inquiryId: inquiry.id }, { silent: true });
    if (r.message || opt.gmailThreadId) await D.create('comms', { companyId: company.id, contactId: contact ? contact.id : null, dealId: deal.id, direction: 'in', channel: opt.channel === 'email' || opt.gmailThreadId ? 'email' : (opt.channel || 'website'), subject: opt.subject || 'Projektanfrage', snippet: String(r.message || '').slice(0, 600), at: receivedAt, gmailThreadId: opt.gmailThreadId || null, answered: false }, { silent: true });
    if (dup.result === 'unsicher') {
      await D.create('tasks', { title: 'Mögliches Duplikat prüfen: ' + company.name, kind: 'duplicate', due: L.addWorkdays(today(), 0, S().state), priority: 'mittel', status: 'offen', companyId: company.id, candidates: dup.candidates, source: 'Dubletten-Check' });
    }
    if (isNew) await emit('contact.created', { col: 'companies', id: company.id });
    await emit('inquiry.created', { col: 'inquiries', id: inquiry.id });
    return { inquiry, company, contact, deal, dup, isNew };
  };

  /* ---------- Vertrieb ---------- */
  O.setDealStage = async function (dealId, stage, opt) {
    opt = opt || {};
    const d = D.get('deals', dealId); if (!d || d.stage === stage) return d;
    const patch = { stage, stageHistory: (d.stageHistory || []).concat([{ stage, at: D.nowIso() }]) };
    if (stage === 'gewonnen') { patch.wonAt = D.nowIso(); patch.lostAt = null; }
    if (stage === 'verloren') { patch.lostAt = D.nowIso(); patch.wonAt = null; if (opt.reason) patch.lostReason = opt.reason; }
    if (stage !== 'gewonnen' && stage !== 'verloren') { patch.wonAt = null; patch.lostAt = null; }
    const nd = await D.update('deals', dealId, patch, { action: 'stage', detail: L.stageLabel(d.stage) + ' → ' + L.stageLabel(stage) });
    if (d.inquiryId) { const q = D.get('inquiries', d.inquiryId); if (q && q.status === 'neu' && stage !== 'neu') await D.update('inquiries', q.id, { status: 'in_bearbeitung' }, { silent: true }); }
    const c = D.get('companies', d.companyId);
    if (c && c.status === 'lead' && ['erstkontakt', 'beratung', 'angebot_in_arbeit', 'angebot_versendet', 'nachfassen', 'verhandlung'].includes(stage)) await D.update('companies', c.id, { status: 'interessent' }, { silent: true });
    await emit('deal.stageChanged', { col: 'deals', id: dealId, key: (nd.stageHistory || []).length, depth: opt.depth });
    if (stage === 'gewonnen') await emit('deal.won', { col: 'deals', id: dealId, depth: opt.depth });
    if (stage === 'verloren') {
      if (c && c.status !== 'kunde' && !D.all('deals').some(x => x.companyId === c.id && x.id !== dealId && x.stage !== 'verloren')) await D.update('companies', c.id, { status: 'verloren' }, { silent: true });
      await emit('deal.lost', { col: 'deals', id: dealId, depth: opt.depth });
    }
    return nd;
  };
  O.setCompanyStatus = async function (companyId, status) {
    const c = D.get('companies', companyId); if (!c || c.status === status) return c;
    const patch = { status }; if (status === 'kunde' && !c.becameCustomerAt) patch.becameCustomerAt = D.nowIso();
    if (status === 'kunde' && !c.number) patch.number = 'K-' + L.pad(D.all('companies').filter(x => x.number).length + 1, 4);
    return D.update('companies', companyId, patch, { action: 'status', detail: 'Status: ' + L.labelOf(L.COMPANY_STATUS, status) });
  };

  /* ---------- Projekte ---------- */
  O.createProject = async function (data, templateId) {
    const s = S(); const start = data.startDate || today();
    const tpl = templateId ? D.templates().find(t => t.id === templateId) : null;
    const applied = tpl ? L.applyTemplate(tpl, start, s.state) : { tasks: [], milestones: [], deadline: data.deadline || null };
    const p = await D.create('projects', Object.assign({ status: 'geplant', milestones: applied.milestones, templateId: tpl ? tpl.id : null, notes: '', description: '' }, data, {
      startDate: start, deadline: data.deadline || applied.deadline || null
    }));
    for (const t of applied.tasks) await D.create('tasks', { title: t.title, due: t.due, assignee: t.assignee, phase: t.phase, recurrence: t.recurrence || 'none', priority: 'mittel', status: 'offen', projectId: p.id, companyId: p.companyId, kind: 'task', source: 'Vorlage ' + tpl.name }, { silent: true });
    return p;
  };
  O.createProjectFromDeal = async function (deal, templateId) {
    const exists = D.all('projects').find(p => p.dealId === deal.id); if (exists) return exists;
    const tpl = templateId ? { id: templateId } : L.templateForType(D.templates(), deal.projectType || 'website');
    const q = D.all('quotes').find(x => x.dealId === deal.id && x.status === 'angenommen');
    return O.createProject({ name: (L.labelOf(L.PROJECT_TYPES, deal.projectType || 'website')) + ' ' + O.companyName(deal.companyId), companyId: deal.companyId, contactId: deal.contactId, dealId: deal.id, value: q ? L.totals(q).net : (L.num(deal.value) || 0), projectType: deal.projectType || 'website', status: 'aktiv' }, tpl && tpl.id);
  };
  O.setProjectStatus = async function (id, status) {
    const p = D.get('projects', id); if (!p || p.status === status) return p;
    const np = await D.update('projects', id, { status, completedAt: status === 'abgeschlossen' ? D.nowIso() : null }, { action: 'status', detail: 'Status: ' + L.labelOf(L.PROJECT_STATUS, status) });
    if (status === 'abgeschlossen') await emit('project.completed', { col: 'projects', id });
    return np;
  };
  O.toggleMilestone = async function (projectId, mid) {
    const p = D.get('projects', projectId); if (!p) return;
    const ms = (p.milestones || []).map(m => (m.id === mid ? Object.assign({}, m, { done: !m.done, doneAt: !m.done ? D.nowIso() : null }) : m));
    const m = ms.find(x => x.id === mid);
    return D.update('projects', projectId, { milestones: ms }, { action: 'milestone', detail: 'Meilenstein „' + (m && m.title) + '“ ' + (m && m.done ? 'erreicht' : 'wieder offen') });
  };

  /* ---------- Aufgaben ---------- */
  O.completeTask = async function (id, done) {
    const t = D.get('tasks', id); if (!t) return;
    const isDone = done == null ? t.status !== 'erledigt' : done;
    const nt = await D.update('tasks', id, { status: isDone ? 'erledigt' : 'offen', doneAt: isDone ? D.nowIso() : null }, { action: isDone ? 'done' : 'reopen' });
    if (isDone && t.recurrence && t.recurrence !== 'none' && !t.nextCreated) {
      const next = L.nextRecurrence(t.due || today(), t.recurrence);
      const copy = Object.assign({}, t); delete copy.id; delete copy.createdAt; delete copy.updatedAt; delete copy.doneAt; delete copy.nextCreated;
      await D.create('tasks', Object.assign(copy, { status: 'offen', due: next < today() ? L.nextRecurrence(today(), t.recurrence) : next }), { silent: true });
      await D.update('tasks', id, { nextCreated: true }, { silent: true });
    }
    return nt;
  };

  /* ---------- Angebote ---------- */
  O.newQuote = async function (pre) {
    const s = S(); const d = pre.dealId ? D.get('deals', pre.dealId) : null;
    const companyId = pre.companyId || (d && d.companyId) || null;
    return D.create('quotes', Object.assign({
      number: null, companyId, dealId: d ? d.id : null, contactId: (d && d.contactId) || null, date: today(), validUntil: L.addDays(today(), L.num(s.quoteValidDays) || 30),
      status: 'entwurf', items: [], intro: 'Vielen Dank für Ihr Interesse. Gern unterbreite ich Ihnen folgendes Angebot:', terms: '50 % Anzahlung bei Auftragserteilung, 50 % nach Abnahme. Zahlungsziel ' + (s.paymentTermDays || 14) + ' Tage.',
      discountPct: 0, taxMode: s.taxMode || 'regel', taxRate: L.num(s.taxRate) || 19, title: d ? d.title : 'Angebot'
    }, pre));
  };
  O.ensureQuoteNumber = async function (q) {
    if (q.number) return q;
    const year = (q.date || today()).slice(0, 4); let nq = q;
    await D.allocateNumber('quote', year, async n => { nq = await D.update('quotes', q.id, { number: L.formatNo(S().quotePrefix || 'AN', year, n) }, { detail: 'Nummer vergeben' }); });
    return nq;
  };
  O.markQuoteSent = async function (id) {
    let q = await O.ensureQuoteNumber(D.get('quotes', id));
    q = await D.update('quotes', id, { status: 'versendet', sentAt: D.nowIso() }, { action: 'sent', detail: 'Angebot versendet' });
    if (q.dealId) { const d = D.get('deals', q.dealId); if (d) await D.update('deals', d.id, { value: L.totals(q).net }, { silent: true }); }
    await emit('quote.sent', { col: 'quotes', id });
    return q;
  };
  O.acceptQuote = async function (id) {
    const q = await D.update('quotes', id, { status: 'angenommen', acceptedAt: D.nowIso() }, { action: 'accepted', detail: 'Angebot angenommen' });
    await emit('quote.accepted', { col: 'quotes', id });
    if (q.dealId) { await D.update('deals', q.dealId, { value: L.totals(q).net }, { silent: true }); await O.setDealStage(q.dealId, 'gewonnen'); }
    return q;
  };
  O.rejectQuote = async function (id, reason) {
    const q = await D.update('quotes', id, { status: 'abgelehnt', rejectedAt: D.nowIso(), rejectReason: reason || '' }, { action: 'rejected', detail: 'Angebot abgelehnt' });
    await emit('quote.rejected', { col: 'quotes', id });
    return q;
  };

  /* ---------- Rechnungen ---------- */
  O.newInvoice = async function (pre) {
    const s = S(); pre = pre || {};
    let items = pre.items || [], companyId = pre.companyId || null, title = '', projectId = pre.projectId || null, dealId = pre.dealId || null, quoteId = pre.quoteId || null;
    const p = projectId ? D.get('projects', projectId) : null; if (p) { companyId = companyId || p.companyId; dealId = dealId || p.dealId; }
    const q = quoteId ? D.get('quotes', quoteId) : (dealId ? D.all('quotes').find(x => x.dealId === dealId && x.status === 'angenommen') : null);
    if (q) { quoteId = q.id; companyId = companyId || q.companyId; }
    const type = pre.type || 'rechnung';
    if (!items.length && type === 'anzahlung') {
      const pct = L.num(pre.percent) || 50; const baseNet = q ? L.totals(q).net : L.num(p ? p.value : (dealId && D.get('deals', dealId) || {}).value);
      items = [{ id: D.newId(), title: 'Anzahlung ' + pct + ' %' + (q && q.number ? ' gemäß Angebot ' + q.number : ''), desc: p ? p.name : '', qty: 1, unit: 'pauschal', price: L.r2(baseNet * pct / 100) }];
    } else if (!items.length && type === 'schluss') {
      const src = q ? q.items.filter(i => !i.optional) : [{ title: p ? p.name : 'Leistung gemäß Auftrag', qty: 1, unit: 'pauschal', price: L.num(p && p.value) }];
      items = src.map(i => Object.assign({}, i, { id: D.newId() }));
      for (const a of D.all('invoices').filter(x => x.type === 'anzahlung' && L.isIssued(x) && x.status !== 'storniert' && ((projectId && x.projectId === projectId) || (dealId && x.dealId === dealId)))) {
        items.push({ id: D.newId(), title: 'abzüglich Anzahlung ' + a.number + ' vom ' + F.date(a.date), qty: 1, unit: 'pauschal', price: -L.totals(a).net, deduction: true });
      }
    } else if (!items.length && q) items = q.items.filter(i => !i.optional).map(i => Object.assign({}, i, { id: D.newId() }));
    const c = companyId ? D.get('companies', companyId) : null;
    title = { anzahlung: 'Anzahlungsrechnung', schluss: 'Schlussrechnung', rechnung: 'Rechnung', storno: 'Stornorechnung' }[type];
    return D.create('invoices', {
      number: null, type, title, companyId, projectId, dealId, quoteId, contactId: pre.contactId || (q && q.contactId) || null, date: today(), dueDate: L.addDays(today(), L.num(s.paymentTermDays) || 14),
      servicePeriod: pre.servicePeriod || (type === 'anzahlung' ? '' : L.monthLabel(today())), status: 'entwurf', items, payments: [], reminders: [],
      taxMode: s.taxMode || 'regel', taxRate: L.num(s.taxRate) || 19, notes: '', intro: '', customerName: c ? c.name : ''
    });
  };
  O.finalizeInvoice = async function (id) {
    const inv = D.get('invoices', id); if (!inv || inv.status !== 'entwurf') throw { message: 'Nur Entwürfe können festgeschrieben werden.' };
    const s = S(); const c = D.get('companies', inv.companyId);
    if (!s.taxMode) throw { message: 'Bitte zuerst in den Einstellungen die Besteuerungsart festlegen (Kleinunternehmer oder Regelbesteuerung).' };
    const missing = L.invoiceChecklist(Object.assign({}, inv, { taxMode: s.taxMode }), s, c).filter(x => !x.ok);
    if (missing.length) throw { message: 'Pflichtangaben fehlen: ' + missing.map(m => m.label).join(', ') };
    const year = inv.date.slice(0, 4); let out = null;
    await D.allocateNumber('invoice', year, async n => {
      const number = L.formatNo(s.invoicePrefix || 'RE', year, n);
      // Entwurf -> festgeschrieben: einmalig alle Felder mit Momentaufnahme von Leistendem & Kunde schreiben
      const cur = D.get('invoices', id);
      const snapshot = { seller: { name: s.businessName, owner: s.ownerName, address: s.address, email: s.email, phone: s.phone, website: s.website, taxNumber: s.taxNumber, vatId: s.vatId, bank: s.bank },
        buyer: c ? { name: c.name, address: c.address, vatId: c.vatId || '', number: c.number || '' } : null };
      const next = Object.assign({}, cur, { number, status: 'festgeschrieben', finalizedAt: D.nowIso(), taxMode: s.taxMode, snapshot, updatedAt: D.nowIso() });
      D.cols.invoices.set(id, next);
      await D.rawWrite('ws/' + D.ws + '/invoices/' + id, 'set', JSON.parse(JSON.stringify(next)));
      D.log('finalize', 'invoices', next, 'Rechnung ' + number + ' festgeschrieben');
      out = next;
    });
    try { if (window.Pdf) await Pdf.archiveInvoice(out); } catch (e) { console.warn('PDF-Archiv', e); }
    await emit('invoice.finalized', { col: 'invoices', id });
    return D.get('invoices', id);
  };
  O.cancelInvoice = async function (id, reason) {
    const inv = D.get('invoices', id); if (!inv || !L.isIssued(inv) || inv.status === 'storniert' || inv.type === 'storno') throw { message: 'Diese Rechnung kann nicht storniert werden.' };
    if (L.paidAmount(inv) > 0) throw { message: 'Es sind bereits Zahlungen erfasst. Bitte erst mit dem Steuerberater klären (Erstattung/Verrechnung).' };
    const s = S();
    const storno = await D.create('invoices', {
      number: null, type: 'storno', title: 'Stornorechnung', companyId: inv.companyId, projectId: inv.projectId, dealId: inv.dealId, quoteId: inv.quoteId, contactId: inv.contactId,
      date: today(), dueDate: today(), servicePeriod: inv.servicePeriod, status: 'entwurf', cancelsInvoiceId: inv.id, cancelsNumber: inv.number, reason: reason || '',
      items: (inv.items || []).map(i => Object.assign({}, i, { id: D.newId(), price: -L.num(i.price) })), payments: [], reminders: [], taxMode: inv.taxMode, taxRate: inv.taxRate, notes: 'Storno zu Rechnung ' + inv.number + (reason ? ' – ' + reason : '')
    });
    const year = storno.date.slice(0, 4);
    await D.allocateNumber('invoice', year, async n => {
      const number = L.formatNo(s.invoicePrefix || 'RE', year, n);
      const cur = D.get('invoices', storno.id);
      const next = Object.assign({}, cur, { number, status: 'festgeschrieben', finalizedAt: D.nowIso(), snapshot: inv.snapshot || null, updatedAt: D.nowIso() });
      D.cols.invoices.set(storno.id, next);
      await D.rawWrite('ws/' + D.ws + '/invoices/' + storno.id, 'set', JSON.parse(JSON.stringify(next)));
    });
    await D.update('invoices', inv.id, { status: 'storniert', cancelledById: storno.id }, { action: 'cancel', detail: 'Storniert durch ' + D.get('invoices', storno.id).number });
    try { if (window.Pdf) await Pdf.archiveInvoice(D.get('invoices', storno.id)); } catch (e) { console.warn(e); }
    return D.get('invoices', storno.id);
  };
  O.addPayment = async function (id, pay) {
    const inv = D.get('invoices', id); if (!inv || !L.isIssued(inv)) throw { message: 'Zahlungen nur für festgeschriebene Rechnungen.' };
    const amount = L.r2(L.num(pay.amount)); if (!(amount > 0)) throw { message: 'Bitte einen Betrag größer 0 eingeben.' };
    const payments = (inv.payments || []).concat([{ id: D.newId(), date: pay.date || today(), amount, note: pay.note || '' }]);
    const tmp = Object.assign({}, inv, { payments }); const status = L.paymentStatus(tmp);
    const ni = await D.update('invoices', id, { payments, status, paidAt: status === 'bezahlt' ? D.nowIso() : null }, { action: 'payment', detail: 'Zahlung ' + F.money(amount) + ' erfasst' });
    await emit('payment.received', { col: 'invoices', id, key: payments.length });
    if (status === 'bezahlt') await emit('invoice.paid', { col: 'invoices', id });
    return ni;
  };
  O.removePayment = async function (id, pid) {
    const inv = D.get('invoices', id); const payments = (inv.payments || []).filter(p => p.id !== pid);
    const status = L.paymentStatus(Object.assign({}, inv, { payments }));
    return D.update('invoices', id, { payments, status, paidAt: status === 'bezahlt' ? inv.paidAt : null }, { action: 'payment', detail: 'Zahlung entfernt' });
  };
  O.invoiceVars = function (inv) {
    const r = O.recipientFor(inv.companyId, inv.contactId); const t = L.totals(inv);
    return O.vars({ name: r.name, firma: r.company ? r.company.name : '', number: inv.number || '', betrag: F.money(t.gross), offen: F.money(L.openAmount(inv) || t.gross), faellig: F.date(inv.dueDate), datum: F.date(inv.date) });
  };

  /* ---------- Freigabe-Warteschlange ---------- */
  O.queueEmail = async function (o) {
    return D.create('approvals', Object.assign({ kind: 'email', status: 'offen', to: '', subject: '', body: '', attachments: [], refs: {} }, o));
  };
  O.approve = async function (id, mode) {
    const a = D.get('approvals', id); if (!a || a.status !== 'offen') return;
    let result = '';
    if (a.kind === 'delete') {
      const r = a.refs || {}; const x = D.get(r.col, r.id);
      if (r.col === 'documents' && x && x.assetId && window.Docs) { if (!Docs.assets) await Docs.init(); if (Docs.assets) await Docs.assets.delete(x.assetId).catch(e => console.warn(e)); }
      if (r.col === 'companies' && x && D.all('invoices', { withDeleted: true }).some(i => i.companyId === x.id && L.isIssued(i))) throw { message: 'Zu diesem Kunden gibt es festgeschriebene Rechnungen (Aufbewahrungspflicht 8 Jahre). Der Kunde bleibt im Papierkorb erhalten.' };
      await D.hardDelete(r.col, r.id); result = 'Endgültig gelöscht';
    } else {
      if (!a.to || !L.validEmail(a.to)) throw { message: 'Bitte eine gültige Empfänger-Adresse eintragen.' };
      const attachments = [];
      for (const at of (a.attachments || [])) {
        if (at.type === 'invoice') { const inv = D.get('invoices', at.id); if (inv) attachments.push(await Pdf.invoiceAttachment(inv)); }
        if (at.type === 'quote') { const q = D.get('quotes', at.id); if (q) attachments.push(await Pdf.quoteAttachment(q)); }
      }
      if (mode === 'gmail') { const r = await Mail.send({ to: a.to, subject: a.subject, body: a.body, attachments, threadId: a.threadId }); result = 'Über Gmail gesendet'; a.gmailId = r && r.id; }
      else if (mode === 'draft') { await Mail.draft({ to: a.to, subject: a.subject, body: a.body, attachments }); result = 'Als Gmail-Entwurf gespeichert'; }
      else result = 'Manuell versendet (markiert)';
      if (mode !== 'draft') {
        const r = a.refs || {};
        await D.create('comms', { companyId: r.companyId || null, contactId: r.contactId || null, dealId: r.dealId || null, projectId: r.projectId || null, direction: 'out', channel: 'email', subject: a.subject, snippet: String(a.body || '').slice(0, 600), at: D.nowIso(), to: a.to, answered: true }, { silent: true });
        if (r.quoteId) await O.markQuoteSent(r.quoteId);
        if (r.invoiceId && a.kind === 'invoice') await D.update('invoices', r.invoiceId, { sentAt: D.nowIso(), status: L.paymentStatus(Object.assign({}, D.get('invoices', r.invoiceId), { sentAt: 'x' })) }, { action: 'sent', detail: 'Rechnung versendet' });
        if (r.invoiceId && a.kind === 'reminder') {
          const inv = D.get('invoices', r.invoiceId);
          await D.update('invoices', inv.id, { reminders: (inv.reminders || []).concat([{ level: a.level, date: today(), via: mode }]) }, { action: 'reminder', detail: L.DUNNING_LABELS[a.level] + ' versendet' });
        }
      }
    }
    await D.update('approvals', id, { status: mode === 'draft' ? 'entwurf' : 'freigegeben', decidedAt: D.nowIso(), result }, { action: 'approve', detail: result });
    return result;
  };
  O.rejectApproval = async (id, why) => D.update('approvals', id, { status: 'abgelehnt', decidedAt: D.nowIso(), result: why || 'Abgelehnt' }, { action: 'reject' });

  /* ---------- Löschen mit Papierkorb ---------- */
  O.requestPurge = async function (col, id) {
    const x = D.get(col, id);
    if (col === 'invoices' && x && L.isIssued(x)) throw { message: 'Festgeschriebene Rechnungen unterliegen der Aufbewahrungspflicht und können nicht gelöscht werden.' };
    return D.create('approvals', { kind: 'delete', status: 'offen', title: 'Endgültig löschen: ' + D.LABELS[col] + ' „' + D.titleOf(col, x) + '“', refs: { col, id } });
  };

  /* ---------- Dubletten zusammenführen ---------- */
  O.mergeCompanies = async function (keepId, dropId) {
    const keep = D.get('companies', keepId), drop = D.get('companies', dropId); if (!keep || !drop || keepId === dropId) return;
    const patch = {};
    for (const k of ['email', 'phone', 'website', 'industry', 'vatId', 'notes', 'source']) if (!keep[k] && drop[k]) patch[k] = drop[k];
    if (!keep.address || !keep.address.street) if (drop.address && drop.address.street) patch.address = drop.address;
    if (drop.notes && keep.notes && drop.notes !== keep.notes) patch.notes = keep.notes + '\n\n— übernommen aus ' + drop.name + ':\n' + drop.notes;
    if (Object.keys(patch).length) await D.update('companies', keepId, patch, { silent: true });
    for (const col of ['contacts', 'inquiries', 'deals', 'projects', 'tasks', 'events', 'notes', 'comms', 'quotes', 'invoices', 'contracts', 'documents']) {
      for (const x of D.all(col, { withDeleted: true }).filter(x => x.companyId === dropId)) {
        if (col === 'invoices' && L.isIssued(x)) continue; // unveränderbar – bleibt mit Momentaufnahme erhalten
        await D.update(col, x.id, { companyId: keepId }, { silent: true });
      }
    }
    await D.update('companies', dropId, { deletedAt: D.nowIso(), mergedInto: keepId }, { action: 'merge', detail: 'Zusammengeführt in ' + keep.name });
    D.log('merge', 'companies', keep, drop.name + ' zusammengeführt');
    for (const t of D.all('tasks').filter(t => t.kind === 'duplicate' && (t.companyId === dropId || t.companyId === keepId) && t.status !== 'erledigt')) await O.completeTask(t.id, true);
  };

  window.O = O;
})();
