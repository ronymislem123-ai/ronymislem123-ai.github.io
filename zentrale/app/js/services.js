/* Agentur-Zentrale – Dienste: Website-Anfragen, E-Mail (optional), KI (optional), PDF, Dokumente, Backups */
(function () {
  'use strict';
  const use = name => (window.Runtime ? Runtime.use(name).catch(() => null) : Promise.resolve(null));

  /* ================= Optionales E-Mail-Modul (Gmail über eine eigene Server-Funktion; ohne Modul: Mailprogramm) ================= */
  const Mail = { status: 'unknown', available: false, mcp: null, lastError: '', SERVER: 'Gmail' };
  Mail.init = async function () {
    Mail.mcp = await use('mcp');
    if (!Mail.mcp) { Mail.status = 'unavailable'; Mail.available = false; return; }
    try {
      const r = await Mail.mcp.listTools(Mail.SERVER);
      const s = (r && r.servers || []).find(x => x.server === Mail.SERVER);
      if (!s || (s.authStatus !== 'unknown' && !(s.tools || []).length)) { Mail.status = 'not_connected'; Mail.available = false; }
      else { Mail.status = s.authStatus === 'needs_reauth' ? 'needs_reauth' : (s.authStatus === 'unknown' ? 'consent' : 'connected'); Mail.available = s.authStatus !== 'needs_reauth'; }
    } catch (e) { Mail.status = 'not_connected'; Mail.available = false; }
  };
  Mail.errorText = function (e) {
    const c = e && e.code;
    return {
      needs_reauth: 'Gmail-Verbindung abgelaufen – bitte neu verbinden.',
      server_not_connected: 'Das E-Mail-Modul ist nicht eingerichtet.',
      not_in_manifest: 'Gmail-Zugriff wurde für die Zentrale nicht erlaubt.', approval_required: 'Diese Gmail-Aktion braucht deine Bestätigung.',
      selection_required: 'Mehrere Gmail-Konten verbunden – bitte eines auswählen.', blocked_by_policy: 'Gmail ist durch eine Richtlinie gesperrt.',
      server_unavailable: 'Gmail ist gerade nicht erreichbar. Bitte später erneut versuchen.', tool_error: 'Gmail meldet einen Fehler: ' + (e && e.message || ''),
      not_granted: 'Connector-Zugriff ist in dieser Ansicht nicht verfügbar.', capability_disabled: 'Connector-Zugriff ist in dieser Ansicht nicht verfügbar.'
    }[c] || ('Gmail-Fehler (' + (c || (e && e.message) || 'unbekannt') + ')');
  };
  Mail.call = async function (tool, input) {
    if (!Mail.mcp) throw { code: 'not_granted', message: 'Kein Connector-Zugriff' };
    try { const r = await Mail.mcp.callTool(Mail.SERVER, tool, input); Mail.status = 'connected'; Mail.available = true; return r && r.payload !== undefined ? r.payload : r; }
    catch (e) {
      if (['needs_reauth', 'server_not_connected', 'not_in_manifest', 'blocked_by_policy', 'not_granted', 'capability_disabled'].includes(e && e.code)) { Mail.available = false; Mail.status = e.code === 'needs_reauth' ? 'needs_reauth' : 'not_connected'; }
      Mail.lastError = Mail.errorText(e); throw Object.assign({}, e, { friendly: Mail.lastError, message: Mail.lastError });
    }
  };
  const addr = x => {
    if (!x) return { email: '', name: '' };
    if (typeof x === 'string') { const m = x.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/); return m ? { name: m[1].trim(), email: m[2].trim().toLowerCase() } : { name: '', email: x.trim().toLowerCase() }; }
    return { email: String(x.email || x.emailAddress || x.address || '').toLowerCase(), name: x.name || x.displayName || '' };
  };
  const toDateIso = d => { if (!d) return ''; if (/^\d{10,13}$/.test(String(d))) return new Date(Number(String(d).length === 10 ? d * 1000 : d)).toISOString(); const t = new Date(d); return isNaN(t) ? String(d) : t.toISOString(); };
  Mail.normMessage = m => ({ id: m.id, threadId: m.threadId, subject: m.subject || '', snippet: m.snippet || '', from: addr(m.sender || m.from), to: (m.toRecipients || m.to || []).map(addr), date: toDateIso(m.date || m.internalDate), body: m.plaintextBody || m.body || m.snippet || '', labels: m.labelIds || [], viewUrl: m.viewUrl || '', attachments: (m.attachments || []).map(a => a.filename || a.name || 'Anhang') });
  Mail.search = async function (query, pageSize, view) {
    const p = await Mail.call('search_threads', { query, pageSize: pageSize || 20, view: view || 'THREAD_VIEW_SUMMARY' });
    const threads = (p && (p.threads || p.items)) || (Array.isArray(p) ? p : []);
    return threads.map(t => { const msgs = (t.messages || []).map(Mail.normMessage); const last = msgs[msgs.length - 1] || {}; return { id: t.id, count: t.messageCount || msgs.length, viewUrl: t.viewUrl || last.viewUrl || '', last, messages: msgs, subject: last.subject || t.subject || '', snippet: last.snippet || t.snippet || '' }; });
  };
  Mail.thread = async function (id) {
    const p = await Mail.call('get_thread', { threadId: id, messageFormat: 'PLAIN_TEXT' });
    return { id: (p && p.id) || id, viewUrl: (p && p.viewUrl) || '', messages: ((p && p.messages) || []).map(Mail.normMessage) };
  };
  Mail.send = async function (o) {
    const input = { to: [o.to], subject: o.subject || '', body: o.body || '' };
    if (o.attachments && o.attachments.length) input.attachments = o.attachments;
    if (o.threadId) input.replyThreadId = o.threadId;
    return Mail.call('send_message', input);
  };
  Mail.draft = async function (o) {
    const input = { to: [o.to], subject: o.subject || '', body: o.body || '' };
    if (o.attachments && o.attachments.length) input.attachments = o.attachments;
    return Mail.call('create_draft', input);
  };
  Mail.knownEmail = function (email) {
    const e = L.normEmail(email); if (!e) return null;
    const ct = D.all('contacts').find(c => L.normEmail(c.email) === e); if (ct) return { companyId: ct.companyId, contactId: ct.id };
    const co = D.all('companies').find(c => L.normEmail(c.email) === e); if (co) return { companyId: co.id, contactId: null };
    return null;
  };
  Mail.importInquiries = async function (manual) {
    const s = D.settings(); const kw = (s.inquirySubjectKeyword || 'Projektanfrage').replace(/"/g, '');
    const threads = await Mail.search('subject:"' + kw + '" newer_than:30d -in:sent', 25, 'THREAD_VIEW_MINIMAL');
    let n = 0;
    for (const t of threads) {
      const key = 'gmail:' + t.id; if (A.isProcessed(key) || D.all('inquiries', { withDeleted: true }).some(q => q.gmailThreadId === t.id)) { A.markProcessed(key); continue; }
      const th = await Mail.thread(t.id); const first = th.messages[0]; if (!first) continue;
      const raw = L.parseInquiryText(first.body, (first.from.name ? '"' + first.from.name + '" ' : '') + '<' + first.from.email + '>');
      A.markProcessed(key);
      await O.intakeInquiry(raw, { channel: 'website', receivedAt: first.date || D.nowIso(), gmailThreadId: t.id, subject: first.subject, consent: true });
      n++;
    }
    await D.setMeta('system', { lastGmailImportAt: D.nowIso(), lastGmailImportCount: n });
    return n;
  };
  Mail.checkUnanswered = async function () {
    const s = D.settings(); const threads = await Mail.search('in:inbox -in:sent newer_than:21d', 30, 'THREAD_VIEW_SUMMARY'); let n = 0;
    for (const t of threads) {
      const last = t.last; const known = last && Mail.knownEmail(last.from.email); if (!known || !last.date) continue;
      const wd = L.workdaysBetween(L.dateOf(last.date), L.todayBerlin(), s.state); if (wd < 1) continue;
      const before = D.all('tasks').length;
      await A.emit('email.unanswered', { col: known.contactId ? 'contacts' : 'companies', id: known.contactId || known.companyId, key: last.id || t.id, extra: { workdays: wd, subject: t.subject, threadId: t.id, vars: { subject: t.subject || '(ohne Betreff)' } } });
      if (D.all('tasks').length > before) n++;
    }
    return n;
  };
  Mail.scheduledChecks = async function () {
    const s = D.settings(); if (D.ws !== 'live' || !Mail.available || (!s.gmailImport && !s.gmailUnanswered)) return;
    if (s.gmailImport) await Mail.importInquiries().catch(e => console.warn(e));
    if (s.gmailUnanswered) await Mail.checkUnanswered().catch(e => console.warn(e));
  };

  /* ================= Optionales KI-Modul (eigene Server-Funktion, siehe supabase/functions/zentrale-ai) ================= */
  const AI = { sample: null, available: false, tools: false };
  AI.init = async function () {
    AI.sample = await use('sample'); AI.available = !!AI.sample;
    if (AI.sample) { try { const lim = await AI.sample.limits(); AI.tools = !!(lim && lim.tools); } catch (e) { AI.tools = false; } }
  };
  AI.errorText = function (e) {
    const c = e && e.code;
    return {
      not_granted: 'Die KI-Nutzung wurde für die Zentrale nicht erlaubt.', sampling_disabled: 'Das KI-Modul ist nicht eingerichtet.',
      rate_limited: 'Gerade zu viele Anfragen oder Nutzungslimit erreicht – bitte später erneut versuchen.', session_expired: 'Sitzung abgelaufen – bitte neu anmelden.',
      refused: 'Die KI hat diese Anfrage abgelehnt. Bitte anders formulieren.', empty_completion: 'Keine Antwort erhalten – bitte die Frage vereinfachen.',
      invalid_json: 'Die Antwort ließ sich nicht auswerten – bitte erneut versuchen.', prompt_too_large: 'Zu viele Daten auf einmal – bitte enger eingrenzen.',
      upstream_error: 'Verbindungsproblem – bitte erneut versuchen.', cancelled: 'Abgebrochen.'
    }[c] || ('KI-Fehler (' + (c || 'unbekannt') + ')');
  };
  AI.ask = (input, opts) => { if (!AI.sample) return Promise.reject({ code: 'not_granted' }); return AI.sample(input, opts || {}); };
  AI.json = (input, opts) => { if (!AI.sample) return Promise.reject({ code: 'not_granted' }); return AI.sample.json(input, opts || {}); };
  AI.businessContext = function () {
    const t = L.todayBerlin(); const s = D.settings(); const snap = D.snapshot();
    const m = L.periodRange('monat', t);
    return {
      heute: t, agentur: s.businessName || '(Name nicht hinterlegt)', besteuerung: s.taxMode || 'nicht festgelegt',
      kunden: snap.companies.filter(c => c.status === 'kunde').length, interessenten: snap.companies.filter(c => ['lead', 'interessent'].includes(c.status)).length,
      offeneDeals: snap.deals.filter(d => L.OPEN_STAGES.includes(d.stage)).map(d => ({ id: d.id, titel: d.title, phase: L.stageLabel(d.stage), wert: d.value, seit: L.dateOf(d.openedAt || d.createdAt), letzteAenderung: L.dateOf(d.updatedAt) })).slice(0, 40),
      neueAnfragen: snap.inquiries.filter(q => q.status === 'neu').map(q => ({ id: q.id, von: q.raw && (q.raw.company || q.raw.name), projektart: q.category && q.category.projectType, budget: q.raw && q.raw.budget, prioritaet: q.category && q.category.priority, eingang: L.dateOf(q.receivedAt) })).slice(0, 30),
      projekte: snap.projects.filter(p => p.status !== 'abgeschlossen').map(p => ({ id: p.id, name: p.name, status: p.status, deadline: p.deadline, fortschritt: L.projectProgress(p, snap.tasks), ampel: L.projectHealth(p, snap.tasks, t, s.state) })).slice(0, 30),
      ueberfaelligeAufgaben: snap.tasks.filter(x => x.status !== 'erledigt' && x.due && x.due < t).map(x => ({ titel: x.title, faellig: x.due, projekt: x.projectId })).slice(0, 40),
      finanzenMonat: { umsatzNetto: L.revenue(snap.invoices, m), zahlungseingangBrutto: L.paymentsIn(snap.invoices, m).gross, ausgaben: L.expensesIn(snap.expenses, m, s).total },
      forderungen: L.receivables(snap.invoices, t), wiederkehrendMonatlich: L.mrr(snap.contracts, t), pipeline: L.pipeline(snap.deals, s),
      umsatzLetzte12Monate: L.monthlySeries(snap, t, 12).map(x => ({ monat: x.key, umsatz: x.revenue, zahlungen: x.payments, ausgaben: x.expenses, anfragen: x.inquiries, gewonnen: x.won }))
    };
  };
  AI.SYSTEM = 'Du bist der KI-Assistent in der internen Agentur-Zentrale eines selbstständigen Webdesigners in Deutschland. Antworte auf Deutsch, knapp, konkret und strukturiert. Nutze ausschließlich die übergebenen Daten bzw. Werkzeuge; erfinde keine Kunden, Zahlen oder Fakten. Wenn Daten fehlen, sag das. Unterscheide Umsatz (Rechnungsdatum, netto), Zahlungseingang, offene Forderungen und vorläufigen Gewinn. Keine Steuer- oder Rechtsberatung. Externe Nachrichten formulierst du nur als Entwurf – versendet wird nur nach Freigabe durch den Nutzer.';

  /* ================= PDF (pdf-lib, lokal mitgeliefert) ================= */
  const Pdf = {};
  let pdfLibLoading = null;
  Pdf.load = function () {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (!pdfLibLoading) pdfLibLoading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/pdf-lib.min.js'; s.onload = () => res(window.PDFLib); s.onerror = () => rej(new Error('PDF-Bibliothek konnte nicht geladen werden')); document.head.appendChild(s); });
    return pdfLibLoading;
  };
  const WIN = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  const safe = s => String(s == null ? '' : s).replace(/\t/g, ' ').replace(/→/g, '->').replace(/[   ]/g, ' ').split('').map(ch => { const c = ch.charCodeAt(0); return (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || WIN.includes(ch) || ch === '\n' ? ch : '?'; }).join('');
  Pdf.safe = safe;
  Pdf.render = async function (kind, doc) {
    const { PDFDocument, StandardFonts, rgb } = await Pdf.load();
    const s = D.settings(); const snap = doc.snapshot || null;
    const seller = (snap && snap.seller) || { name: s.businessName, owner: s.ownerName, address: s.address, email: s.email, phone: s.phone, website: s.website, taxNumber: s.taxNumber, vatId: s.vatId, bank: s.bank };
    const co = D.get('companies', doc.companyId) || {}; const buyer = (snap && snap.buyer) || { name: co.name || doc.customerName || '', address: co.address || {}, vatId: co.vatId || '', number: co.number || '' };
    const ct = doc.contactId ? D.get('contacts', doc.contactId) : O.primaryContact(doc.companyId);
    const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    pdf.setTitle(safe((kind === 'quote' ? 'Angebot ' : (doc.title || 'Rechnung') + ' ') + (doc.number || 'Entwurf'))); pdf.setAuthor(safe(seller.name || '')); pdf.setCreator('Agentur-Zentrale');
    const W = 595.28, H = 841.89, ML = 70, MR = 56, CW = W - ML - MR;
    const ink = rgb(0.07, 0.07, 0.07), mute = rgb(0.38, 0.38, 0.36), line = rgb(0.85, 0.85, 0.83), accent = rgb(0.18, 0.36, 0.92);
    let page, y;
    const txt = (t, x, yy, o) => { o = o || {}; const f = o.bold ? bold : font; const sz = o.size || 9.5; let str = safe(t); let xx = x; if (o.align === 'right') xx = x - f.widthOfTextAtSize(str, sz); page.drawText(str, { x: xx, y: yy, size: sz, font: f, color: o.color || ink }); };
    const wrap = (t, width, sz, f) => { const out = []; for (const para of safe(t).split('\n')) { let cur = ''; for (const w of para.split(' ')) { const tryS = cur ? cur + ' ' + w : w; if ((f || font).widthOfTextAtSize(tryS, sz) > width && cur) { out.push(cur); cur = w; } else cur = tryS; } out.push(cur); } return out; };
    const footer = () => {
      page.drawLine({ start: { x: ML, y: 62 }, end: { x: W - MR, y: 62 }, thickness: 0.5, color: line });
      const a = seller.address || {}, b = seller.bank || {};
      const cols = [[seller.name, seller.owner && seller.owner !== seller.name ? 'Inh. ' + seller.owner : '', a.street, [a.zip, a.city].filter(Boolean).join(' ')],
      [seller.email, seller.phone, seller.website], [seller.taxNumber ? 'St.-Nr. ' + seller.taxNumber : '', seller.vatId ? 'USt-IdNr. ' + seller.vatId : ''], [b.bankName, b.iban ? 'IBAN ' + b.iban : '', b.bic ? 'BIC ' + b.bic : '']];
      cols.forEach((c, i) => { let yy = 50; for (const l of c.filter(Boolean)) { txt(l, ML + i * (CW / 4), yy, { size: 7, color: mute }); yy -= 9; } });
    };
    const newPage = first => {
      page = pdf.addPage([W, H]); y = H - 60; footer();
      if (doc.status === 'entwurf' || (kind === 'quote' && !doc.number)) page.drawText('ENTWURF', { x: 150, y: 380, size: 90, font: bold, color: rgb(0.93, 0.93, 0.92), rotate: { type: 'degrees', angle: 35 } });
      if (!first) { txt((kind === 'quote' ? 'Angebot ' : 'Rechnung ') + (doc.number || 'Entwurf') + ' – Fortsetzung', ML, y, { size: 8, color: mute }); y -= 24; }
    };
    newPage(true);
    txt(seller.name || 'Firmenname fehlt (Einstellungen)', ML, y, { bold: true, size: 15 });
    txt(seller.website || seller.email || '', W - MR, y + 2, { size: 8.5, color: mute, align: 'right' });
    y -= 70;
    const sa = seller.address || {}; txt([seller.name, sa.street, [sa.zip, sa.city].filter(Boolean).join(' ')].filter(Boolean).join(' · '), ML, y, { size: 7, color: mute });
    y -= 16;
    const ba = buyer.address || {};
    const rec = [buyer.name, ct && F.personName(ct) && F.personName(ct) !== buyer.name ? 'z. Hd. ' + F.personName(ct) : '', ba.street, [ba.zip, ba.city].filter(Boolean).join(' '), ba.country && ba.country !== 'Deutschland' ? ba.country : ''].filter(Boolean);
    let ry = y; for (const l of rec) { txt(l, ML, ry, { size: 10 }); ry -= 13; }
    const info = kind === 'quote'
      ? [['Angebotsnr.', doc.number || 'Entwurf'], ['Datum', F.date(doc.date)], ['Gültig bis', F.date(doc.validUntil)], buyer.number ? ['Kundennr.', buyer.number] : null]
      : [[doc.type === 'storno' ? 'Storno-Nr.' : 'Rechnungsnr.', doc.number || 'Entwurf'], ['Rechnungsdatum', F.date(doc.date)], doc.servicePeriod ? ['Leistungszeitraum', doc.servicePeriod] : null, buyer.number ? ['Kundennr.', buyer.number] : null, doc.type !== 'storno' ? ['Fällig am', F.date(doc.dueDate)] : null, doc.cancelsNumber ? ['Storno zu', doc.cancelsNumber] : null];
    let iy = y; for (const r of info.filter(Boolean)) { txt(r[0], W - MR - 170, iy, { size: 8.5, color: mute }); txt(r[1], W - MR, iy, { size: 8.5, align: 'right', bold: r[0].includes('nr.') || r[0].includes('Nr.') }); iy -= 13; }
    y = Math.min(ry, iy) - 34;
    txt(kind === 'quote' ? 'Angebot' + (doc.title && doc.title !== 'Angebot' ? ': ' + doc.title : '') : (doc.title || 'Rechnung') + (doc.number ? ' ' + doc.number : ''), ML, y, { bold: true, size: 14 });
    y -= 20;
    const intro = doc.intro || (kind === 'quote' ? '' : (doc.type === 'storno' ? 'Hiermit stornieren wir die Rechnung ' + (doc.cancelsNumber || '') + ' vollständig.' : 'Vielen Dank für Ihren Auftrag. Wir berechnen Ihnen folgende Leistungen:'));
    for (const l of wrap(intro, CW, 9.5)) { txt(l, ML, y); y -= 13; }
    y -= 8;
    const cx = { pos: ML, desc: ML + 26, qty: ML + CW - 205, unit: ML + CW - 170, price: ML + CW - 80, total: ML + CW };
    const head = () => { page.drawRectangle({ x: ML, y: y - 5, width: CW, height: 18, color: rgb(0.96, 0.96, 0.95) }); txt('Pos.', cx.pos + 2, y, { size: 8, bold: true }); txt('Beschreibung', cx.desc, y, { size: 8, bold: true }); txt('Menge', cx.qty + 26, y, { size: 8, bold: true, align: 'right' }); txt('Einheit', cx.unit, y, { size: 8, bold: true }); txt('Einzelpreis', cx.price, y, { size: 8, bold: true, align: 'right' }); txt('Gesamt', cx.total - 2, y, { size: 8, bold: true, align: 'right' }); y -= 22; };
    head();
    const items = (doc.items || []); const main = items.filter(i => !i.optional), opt = items.filter(i => i.optional);
    const drawItems = (list, startNo, optional) => {
      let n = startNo;
      for (const it of list) {
        const descLines = wrap(it.desc || '', cx.qty - cx.desc - 40, 8);
        const titleLines = wrap(it.title || '', cx.qty - cx.desc - 40, 9.5, bold);
        const need = titleLines.length * 12 + descLines.length * 10.5 + 10;
        if (y - need < 120) { newPage(false); head(); }
        txt(String(n), cx.pos + 2, y); let yy = y;
        for (const l of titleLines) { txt(l, cx.desc, yy, { bold: true }); yy -= 12; }
        for (const l of descLines) { txt(l, cx.desc, yy, { size: 8, color: mute }); yy -= 10.5; }
        txt(String(it.qty).replace('.', ','), cx.qty + 26, y, { align: 'right' }); txt(it.unit || '', cx.unit, y);
        txt(F.money(L.num(it.price)), cx.price, y, { align: 'right' });
        txt((optional ? '(' : '') + F.money(L.r2(L.num(it.qty) * L.num(it.price))) + (optional ? ')' : ''), cx.total - 2, y, { align: 'right', color: optional ? mute : ink });
        y = Math.min(yy, y - 12) - 6; page.drawLine({ start: { x: ML, y: y + 2 }, end: { x: W - MR, y: y + 2 }, thickness: 0.4, color: line }); y -= 8; n++;
      }
      return n;
    };
    const next = drawItems(main, 1, false);
    const t = L.totals(doc);
    if (y < 200) newPage(false);
    const sumRow = (label, val, o) => { txt(label, cx.price - 10, y, Object.assign({ align: 'right' }, o)); txt(val, cx.total - 2, y, Object.assign({ align: 'right' }, o)); y -= 15; };
    y -= 4;
    if (t.discount) { sumRow('Zwischensumme', F.money(t.base)); sumRow('Rabatt ' + String(doc.discountPct).replace('.', ',') + ' %', '- ' + F.money(t.discount)); }
    if (doc.taxMode === 'klein') sumRow('Gesamtbetrag', F.money(t.gross), { bold: true, size: 11 });
    else { sumRow('Summe netto', F.money(t.net)); sumRow('zzgl. ' + t.rate + ' % USt.', F.money(t.tax)); page.drawLine({ start: { x: cx.price - 120, y: y + 10 }, end: { x: W - MR, y: y + 10 }, thickness: 0.6, color: ink }); sumRow('Gesamtbetrag', F.money(t.gross), { bold: true, size: 11 }); }
    y -= 6;
    if (opt.length) { if (y < 200) newPage(false); txt('Optionale Leistungen (nicht in der Summe enthalten)', ML, y, { bold: true, size: 9.5 }); y -= 18; head(); drawItems(opt, next, true); y -= 6; }
    const notes = [];
    if (doc.taxMode === 'klein') notes.push('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.');
    if (kind === 'quote') { if (doc.terms) notes.push(doc.terms); notes.push('Dieses Angebot ist gültig bis ' + F.date(doc.validUntil) + '.'); }
    else if (doc.type !== 'storno') {
      const b = seller.bank || {};
      notes.push('Bitte überweisen Sie den Betrag bis zum ' + F.date(doc.dueDate) + (b.iban ? ' auf das Konto ' + (b.holder ? b.holder + ', ' : '') + 'IBAN ' + b.iban + (b.bic ? ', BIC ' + b.bic : '') + (b.bankName ? ' (' + b.bankName + ')' : '') : '') + '. Verwendungszweck: ' + (doc.number || 'Rechnungsnummer') + '.');
      if (doc.type === 'anzahlung') notes.push('Anzahlungsrechnung – die Leistung wird nach Fertigstellung mit der Schlussrechnung abgerechnet; erhaltene Anzahlungen werden dort abgezogen.');
    }
    if (doc.notes) notes.push(doc.notes);
    for (const n of notes) { for (const l of wrap(n, CW, 9)) { if (y < 90) newPage(false); txt(l, ML, y, { size: 9 }); y -= 12; } y -= 6; }
    if (y < 110) newPage(false);
    y -= 6; txt('Mit freundlichen Grüßen', ML, y, { size: 9.5 }); y -= 14; txt(seller.owner || seller.name || '', ML, y, { size: 9.5 });
    const pages = pdf.getPages(); pages.forEach((p, i) => p.drawText('Seite ' + (i + 1) + ' von ' + pages.length, { x: W - MR - 60, y: 24, size: 7, font, color: mute }));
    void accent;
    return pdf.save();
  };
  Pdf.fileName = (kind, doc) => (kind === 'quote' ? 'Angebot_' : (doc.type === 'storno' ? 'Storno_' : 'Rechnung_')) + (doc.number || 'Entwurf') + '.pdf';
  Pdf.download = async (kind, doc) => F.download(Pdf.fileName(kind, doc), await Pdf.render(kind, doc));
  const b64 = bytes => { let s = ''; const c = 0x8000; for (let i = 0; i < bytes.length; i += c) s += String.fromCharCode.apply(null, bytes.subarray(i, i + c)); return btoa(s); };
  Pdf.invoiceAttachment = async inv => ({ filename: Pdf.fileName('invoice', inv), mimeType: 'application/pdf', content: b64(await Pdf.render('invoice', inv)) });
  Pdf.quoteAttachment = async q => ({ filename: Pdf.fileName('quote', q), mimeType: 'application/pdf', content: b64(await Pdf.render('quote', q)) });
  Pdf.archiveInvoice = async function (inv) {
    const bytes = await Pdf.render('invoice', inv);
    const doc = await Docs.uploadBlob(new Blob([bytes], { type: 'application/pdf' }), { name: Pdf.fileName('invoice', inv), category: 'rechnung', invoiceId: inv.id, companyId: inv.companyId, projectId: inv.projectId, archived: true, contentType: 'application/pdf' });
    if (doc) await D.update('invoices', inv.id, { pdfDocId: doc.id }, { silent: true });
    return doc;
  };

  /* ================= Dokumente (privater Dateispeicher, Abruf nur mit Sitzung) ================= */
  const Docs = { assets: null };
  const TEXT_TYPES = { csv: 'text/csv', md: 'text/markdown', markdown: 'text/markdown', json: 'application/json', txt: 'text/plain' };
  const OK_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'application/pdf', 'text/csv', 'text/markdown', 'application/json', 'text/plain'];
  Docs.ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.webm,.csv,.md,.json,.txt';
  Docs.init = async () => { Docs.assets = await use('assets'); return !!Docs.assets; };
  Docs.typeFor = file => {
    const ext = (String(file.name || '').split('.').pop() || '').toLowerCase();
    if (TEXT_TYPES[ext]) return TEXT_TYPES[ext];
    const t = String(file.type || '').split(';')[0].trim(); if (OK_TYPES.includes(t)) return t;
    return { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', webm: 'video/webm' }[ext] || '';
  };
  Docs.errorText = e => ({ too_large: 'Datei zu groß (max. 20 MB, SVG 2 MB).', unsupported_type: 'Dateityp nicht unterstützt. Erlaubt: PDF, Bilder, Videos (MP4/WebM), Text, CSV, JSON, Markdown.', quota_or_state: 'Speicherplatz erschöpft.', rate_limited: 'Zu viele Uploads – bitte kurz warten.', not_granted: 'Uploads sind in dieser Ansicht nicht erlaubt.', invalid_request: 'Datei konnte nicht gelesen werden (Textdateien bitte als UTF-8).' }[e && e.code] || ('Upload fehlgeschlagen (' + ((e && (e.code || e.message)) || 'unbekannt') + ')'));
  Docs.uploadBlob = async function (blob, meta) {
    if (!Docs.assets) await Docs.init(); if (!Docs.assets) throw { code: 'not_granted' };
    const type = meta.contentType || Docs.typeFor(blob); if (!type) throw { code: 'unsupported_type' };
    let r; try { r = await Docs.assets.upload(blob, { type }); } catch (e) { if (e && e.code === 'store_unavailable') { await new Promise(x => setTimeout(x, 900)); r = await Docs.assets.upload(blob, { type }); } else throw e; }
    return D.create('documents', Object.assign({ name: meta.name || blob.name || 'Datei', category: 'sonstiges', size: r.sizeBytes, contentType: r.contentType, assetId: r.id, uploadedAt: D.nowIso() }, meta, { contentType: r.contentType }));
  };
  Docs.url = d => (d && d.assetId && window.Runtime ? Runtime.assets.url(d.assetId) : '');
  Docs.guessCategory = name => { const n = String(name).toLowerCase(); if (/angebot/.test(n)) return 'angebot'; if (/rechnung|invoice/.test(n)) return 'rechnung'; if (/vertrag|avv|agb/.test(n)) return 'vertrag'; if (/briefing|fragebogen/.test(n)) return 'briefing'; if (/entwurf|design|mockup|figma/.test(n)) return 'design'; if (/beleg|quittung|receipt/.test(n)) return 'beleg'; if (/\.(png|jpe?g|gif|webp|svg)$/.test(n)) return 'bild'; return 'sonstiges'; };

  /* ================= Backups ================= */
  const Backup = {};
  Backup.make = async function (auto) {
    const data = D.exportAll(); const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' }); const name = 'zentrale-backup-' + D.ws + '-' + L.todayBerlin() + '.json';
    if (!Docs.assets) await Docs.init(); if (!Docs.assets) throw { code: 'not_granted' };
    const r = await Docs.assets.upload(blob, { type: 'application/json' });
    const sys = D.meta.system || {}; const list = (sys.backups || []).concat([{ assetId: r.id, at: D.nowIso(), size: r.sizeBytes, records: D.counts(), name, auto: !!auto }]).slice(-30);
    await D.setMeta('system', { lastBackupAt: D.nowIso(), backups: list });
    return list[list.length - 1];
  };
  Backup.auto = async function () {
    if (D.ws !== 'live' || !D.loaded) return; const sys = D.meta.system || {};
    const last = sys.lastBackupAt ? L.dateOf(sys.lastBackupAt) : null; const t = L.todayBerlin();
    const hasData = D.COLS.some(c => D.cols[c].size > 0); if (!hasData) return;
    if (!last || L.diffDays(last, t) >= 7) await Backup.make(true);
  };
  Backup.fetchAsset = async function (assetId) { let b; try { b = await Runtime.assets.fetchBlob(assetId); } catch (e) { throw { message: 'Sicherung nicht abrufbar (' + ((e && e.code) || 'Fehler') + ')' }; } return JSON.parse(await b.text()); };
  Backup.download = async () => F.download('zentrale-export-' + D.ws + '-' + L.todayBerlin() + '.json', JSON.stringify(D.exportAll(), null, 1));

  /* ================= Website-Anfragen (Formular-Eingang im eigenen Backend) ================= */
  const Inbox = { lastRun: null, lastCount: 0, error: '', busy: false };
  Inbox.pull = async function () {
    if (!window.Runtime || !Runtime.inbox || D.ws !== 'live' || !D.loaded || Inbox.busy) return 0;
    Inbox.busy = true; let n = 0;
    try {
      const rows = await Runtime.inbox.pending();
      for (const r of rows) {
        const key = 'inbox:' + r.id;
        if (!A.isProcessed(key) && !D.all('inquiries', { withDeleted: true }).some(q => q.inboxId === r.id)) {
          const raw = L.parseInquiryText(r.body, (r.name ? '"' + String(r.name).replace(/"/g, '') + '" ' : '') + '<' + r.email + '>');
          await O.intakeInquiry(raw, { channel: 'website', receivedAt: r.created_at, inboxId: r.id, subject: r.subject, consent: true });
          A.markProcessed(key); n++;
        }
        await Runtime.inbox.remove(r.id);
      }
      Inbox.lastRun = D.nowIso(); Inbox.lastCount = n; Inbox.error = '';
      if (n) await D.setMeta('system', { lastInboxImportAt: D.nowIso(), lastInboxImportCount: n });
      return n;
    } catch (e) { Inbox.error = (e && e.message) || (e && e.code) || 'Fehler'; throw e; }
    finally { Inbox.busy = false; }
  };

  window.Inbox = Inbox; window.Mail = Mail; window.AI = AI; window.Pdf = Pdf; window.Docs = Docs; window.Backup = Backup;
})();
