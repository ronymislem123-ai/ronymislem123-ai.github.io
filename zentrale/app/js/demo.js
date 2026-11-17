/* Agentur-Zentrale – Demo-Daten (fiktiv, nur für den getrennten Demo-Arbeitsbereich) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./logic.js'));
  else root.Demo = factory(root.L);
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';
  function build(today) {
    const T = today || L.todayBerlin(); const st = 'SN';
    const iso = (d, h) => d + 'T' + L.pad(h == null ? 10 : h) + ':00:00.000Z';
    const C = {}; for (const k of ['companies', 'contacts', 'inquiries', 'deals', 'projects', 'tasks', 'events', 'notes', 'comms', 'quotes', 'invoices', 'expenses', 'contracts', 'documents', 'approvals', 'notifications', 'scheduled']) C[k] = [];
    const add = (col, o) => { const x = Object.assign({ demo: true, createdAt: o.createdAt || iso(T), updatedAt: o.updatedAt || o.createdAt || iso(T) }, o); C[col].push(x); return x; };
    const d = n => L.addDays(T, n);
    const addr = (street, zip, city) => ({ street, zip, city, country: 'Deutschland' });
    const cos = [
      ['c01', 'Café Lindenblüte', 'Gastronomie', 'kunde', 'empfehlung', 'lindenbluete.example', addr('Lindenauer Markt 4', '04177', 'Leipzig'), ['Sophie', 'Lange', 'Inhaberin'], -300],
      ['c02', 'Physio Vogel', 'Gesundheit', 'kunde', 'website', 'physio-vogel.example', addr('Karl-Heine-Str. 12', '04229', 'Leipzig'), ['Jana', 'Vogel', 'Geschäftsführerin'], -210],
      ['c03', 'Holzwerk Krause Tischlerei', 'Handwerk', 'kunde', 'netzwerk', 'holzwerk-krause.example', addr('Gewerbering 7', '04509', 'Delitzsch'), ['Tom', 'Krause', 'Meister'], -150],
      ['c04', 'Studio Nordlicht Yoga', 'Fitness & Sport', 'kunde', 'social', 'nordlicht-yoga.example', addr('Gohliser Str. 31', '04155', 'Leipzig'), ['Mira', 'Schulz', 'Inhaberin'], -95],
      ['c05', 'Berger Steuerberatung', 'Recht & Steuern', 'interessent', 'website', 'berger-stb.example', addr('Brühl 50', '04109', 'Leipzig'), ['Frank', 'Berger', 'Steuerberater'], -20],
      ['c06', 'Salon Schnittwerk', 'Friseur & Beauty', 'interessent', 'website', 'schnittwerk.example', addr('Eisenbahnstr. 88', '04315', 'Leipzig'), ['Aylin', 'Demir', 'Inhaberin'], -9],
      ['c07', 'Elektro Hoffmann GmbH', 'Handwerk', 'lead', 'akquise', 'elektro-hoffmann.example', addr('Industriestr. 3', '04435', 'Schkeuditz'), ['Lars', 'Hoffmann', 'Geschäftsführer'], -4],
      ['c08', 'Weinhandlung Rebe & Ruhe', 'Handel', 'lead', 'website', 'rebe-ruhe.example', addr('Gottschedstr. 9', '04109', 'Leipzig'), ['Paul', 'Richter', 'Inhaber'], -1],
      ['c09', 'Kita Sonnenblume e.V.', 'Bildung', 'verloren', 'empfehlung', 'kita-sonnenblume.example', addr('Am Park 2', '04509', 'Delitzsch'), ['Heike', 'Möller', 'Vorstand'], -70],
      ['c10', 'Fahrschule Tempo', 'Bildung', 'kunde', 'telefon', 'fahrschule-tempo.example', addr('Georg-Schwarz-Str. 140', '04179', 'Leipzig'), ['Kevin', 'Brandt', 'Inhaber'], -250]
    ];
    const company = {}, contact = {};
    cos.forEach(([id, name, industry, status, source, dom, a, p, ago], i) => {
      company[id] = add('companies', { id, name, type: /e\.V\./.test(name) ? 'verein' : 'firma', status, source, industry, website: 'https://www.' + dom, email: 'info@' + dom, phone: '0341 ' + (500100 + i * 731), address: a, socials: { instagram: '@' + dom.split('.')[0] }, notes: '', tags: [], number: status === 'kunde' ? 'K-' + L.pad(i + 1, 4) : null, becameCustomerAt: status === 'kunde' ? iso(d(ago + 25)) : null, createdAt: iso(d(ago)) });
      const pid = 'p' + id.slice(1);
      contact[id] = add('contacts', { id: pid, companyId: id, firstName: p[0], lastName: p[1], role: p[2], email: p[0].toLowerCase() + '@' + dom, phone: '0170 ' + (2200100 + i * 977), isPrimary: true, createdAt: iso(d(ago)) });
      company[id].primaryContactId = pid;
    });
    add('contacts', { id: 'p03b', companyId: 'c03', firstName: 'Anja', lastName: 'Krause', role: 'Büro', email: 'buero@holzwerk-krause.example', phone: '', isPrimary: false, createdAt: iso(d(-140)) });
    const hist = (stages, start) => stages.map((s, i) => ({ stage: s, at: iso(d(start + i * 4)) }));
    const deals = [
      ['d01', 'c01', 'Website – Café Lindenblüte', 'gewonnen', 3200, 'website', -300, ['neu', 'erstkontakt', 'beratung', 'angebot_versendet', 'gewonnen']],
      ['d02', 'c02', 'Relaunch – Physio Vogel', 'gewonnen', 5400, 'relaunch', -210, ['neu', 'erstkontakt', 'beratung', 'angebot_versendet', 'verhandlung', 'gewonnen']],
      ['d03', 'c03', 'Website & SEO – Holzwerk Krause', 'gewonnen', 6900, 'website', -150, ['neu', 'erstkontakt', 'beratung', 'angebot_versendet', 'gewonnen']],
      ['d04', 'c04', 'Landingpage – Studio Nordlicht', 'gewonnen', 1850, 'landingpage', -95, ['neu', 'erstkontakt', 'angebot_versendet', 'gewonnen']],
      ['d05', 'c05', 'Relaunch – Berger Steuerberatung', 'angebot_versendet', 7800, 'relaunch', -20, ['neu', 'erstkontakt', 'beratung', 'angebot_in_arbeit', 'angebot_versendet']],
      ['d06', 'c06', 'Website mit Buchung – Salon Schnittwerk', 'beratung', 3500, 'website', -9, ['neu', 'erstkontakt', 'beratung']],
      ['d07', 'c07', 'Website – Elektro Hoffmann', 'nicht_kontaktiert', 4000, 'website', -4, ['neu', 'nicht_kontaktiert']],
      ['d08', 'c08', 'Onlineshop – Rebe & Ruhe', 'neu', 9000, 'shop', -1, ['neu']],
      ['d09', 'c09', 'Website – Kita Sonnenblume', 'verloren', 2400, 'website', -70, ['neu', 'erstkontakt', 'angebot_versendet', 'verloren']],
      ['d10', 'c10', 'Website – Fahrschule Tempo', 'gewonnen', 2900, 'website', -250, ['neu', 'erstkontakt', 'angebot_versendet', 'gewonnen']],
      ['d11', 'c01', 'Online-Bestellung – Café Lindenblüte', 'verhandlung', 2200, 'shop', -14, ['neu', 'erstkontakt', 'angebot_versendet', 'verhandlung']]
    ];
    const deal = {};
    for (const [id, cid, title, stage, value, pt, start, stages] of deals) {
      const h = hist(stages, start); const last = h[h.length - 1].at;
      deal[id] = add('deals', { id, title, companyId: cid, contactId: company[cid].primaryContactId, stage, value, projectType: pt, source: company[cid].source, stageHistory: h, openedAt: iso(d(start)), wonAt: stage === 'gewonnen' ? last : null, lostAt: stage === 'verloren' ? last : null, lostReason: stage === 'verloren' ? 'Kein Budget – Fördermittel abgelehnt' : '', createdAt: iso(d(start)), updatedAt: last });
    }
    const inq = (id, cid, did, ago, status, raw, cat) => add('inquiries', { id, receivedAt: iso(d(ago), 9), channel: company[cid].source === 'website' ? 'website' : company[cid].source, raw, category: Object.assign(L.categorizeInquiry(raw, iso(d(ago))), cat || {}), companyId: cid, contactId: company[cid].primaryContactId, dealId: did, status, consent: true, dup: { result: 'neu', reason: '', candidates: [] }, createdAt: iso(d(ago), 9) });
    inq('q01', 'c08', 'd08', -1, 'neu', { name: 'Paul Richter', company: 'Weinhandlung Rebe & Ruhe', email: 'paul@rebe-ruhe.example', phone: '0341 777812', website: 'rebe-ruhe.example', projectType: 'Onlineshop', budget: '8.000 – 10.000 €', deadline: 'vor dem Weihnachtsgeschäft, dringend', message: 'Wir möchten unsere Weine endlich online verkaufen – inkl. Altersprüfung und Versand innerhalb Sachsens. Aktuell haben wir nur eine einfache Visitenkarten-Seite.' });
    inq('q02', 'c07', 'd07', -4, 'neu', { name: 'Lars Hoffmann', company: 'Elektro Hoffmann GmbH', email: 'lars@elektro-hoffmann.example', phone: '034204 55120', website: '', projectType: 'Website', budget: 'ca. 4.000 €', deadline: 'Frühjahr', message: 'Wir suchen Azubis und Fachkräfte und brauchen eine moderne Website mit Karrierebereich.' });
    inq('q03', 'c06', 'd06', -9, 'in_bearbeitung', { name: 'Aylin Demir', company: 'Salon Schnittwerk', email: 'aylin@schnittwerk.example', phone: '0157 4412290', website: 'schnittwerk.example', projectType: 'Website', budget: '3.000 – 4.000 €', deadline: 'in 6 Wochen', message: 'Neue Website mit Online-Terminbuchung und Instagram-Feed.' });
    inq('q04', 'c05', 'd05', -20, 'beantwortet', { name: 'Frank Berger', company: 'Berger Steuerberatung', email: 'frank@berger-stb.example', phone: '0341 9120040', website: 'berger-stb.example', projectType: 'Relaunch', budget: '7.000 – 9.000 €', deadline: 'Q1', message: 'Unsere Kanzlei-Website ist veraltet und nicht mobil. Wir wünschen ein seriöses Design und ein Mandanten-Upload-Portal.' });
    // Projekte
    const proj = (id, did, tplId, start, status, extra) => {
      const dl = deal[did]; const tpl = L.DEFAULT_TEMPLATES.find(t => t.id === tplId); const r = L.applyTemplate(tpl, start, st);
      const p = add('projects', Object.assign({ id, name: L.labelOf(L.PROJECT_TYPES, dl.projectType) + ' ' + company[dl.companyId].name, companyId: dl.companyId, contactId: dl.contactId, dealId: did, value: dl.value, projectType: dl.projectType, status, startDate: start, deadline: r.deadline, templateId: tplId, milestones: r.milestones.map(m => Object.assign({}, m, { id: id + m.id, done: m.due < T, doneAt: m.due < T ? iso(m.due, 15) : null })), description: 'Ziel: mehr Anfragen über die Website, mobil optimiert, schnelle Ladezeiten.', notes: '', createdAt: iso(start) }, extra || {}));
      r.tasks.forEach((t, i) => {
        const late = id === 'pr05' && i === 5;
        add('tasks', { id: id + 't' + i, title: t.title, due: t.due, assignee: t.assignee, phase: t.phase, recurrence: t.recurrence || 'none', priority: 'mittel', status: (t.due < T && !late && !(id === 'pr05' && t.assignee === 'kunde' && t.due > d(-6))) || status === 'abgeschlossen' ? 'erledigt' : 'offen', doneAt: t.due < T ? iso(t.due, 16) : null, projectId: id, companyId: dl.companyId, kind: 'task', source: 'Vorlage ' + tpl.name, createdAt: iso(start) });
      });
      return p;
    };
    proj('pr01', 'd01', 'tpl-website', d(-290), 'abgeschlossen', { completedAt: iso(d(-240)) });
    proj('pr02', 'd02', 'tpl-relaunch', d(-200), 'abgeschlossen', { completedAt: iso(d(-130)) });
    proj('pr03', 'd03', 'tpl-website', d(-30), 'aktiv');
    proj('pr04', 'd04', 'tpl-landingpage', d(-12), 'aktiv');
    proj('pr05', 'd10', 'tpl-website', d(-34), 'review');
    // Angebote
    const items = (rows) => rows.map((r, i) => ({ id: 'i' + i, title: r[0], desc: r[1] || '', qty: r[2] || 1, unit: r[3] || 'pauschal', price: r[4], optional: !!r[5] }));
    const quote = (id, did, no, date, status, rows, extra) => { const dl = deal[did]; return add('quotes', Object.assign({ id, number: no, companyId: dl.companyId, contactId: dl.contactId, dealId: did, title: dl.title, date, validUntil: L.addDays(date, 30), status, items: items(rows), intro: 'Vielen Dank für das angenehme Gespräch. Gern unterbreite ich Ihnen folgendes Angebot:', terms: '50 % Anzahlung bei Auftragserteilung, 50 % nach Abnahme. Zahlungsziel 14 Tage.', discountPct: 0, taxMode: 'regel', taxRate: 19, sentAt: status !== 'entwurf' ? iso(date, 11) : null, acceptedAt: status === 'angenommen' ? iso(L.addDays(date, 6)) : null, createdAt: iso(date) }, extra || {})); };
    quote('a01', 'd01', 'AN-2025-0003', d(-292), 'angenommen', [['Konzept & Sitemap', '', 1, 'pauschal', 450], ['Design & Umsetzung', '5 Seiten, responsiv', 5, 'Seite', 420], ['SEO-Basis & Google-Unternehmensprofil', '', 1, 'pauschal', 650]]);
    quote('a02', 'd03', 'AN-2026-0004', d(-40), 'angenommen', [['Konzept, Sitemap & Botschaftshaus', '', 1, 'pauschal', 900], ['Design-System & 3 Designrichtungen', '', 1, 'pauschal', 1400], ['Umsetzung', '8 Seiten inkl. Referenzgalerie', 8, 'Seite', 390], ['Lokale SEO', 'Schema, Unternehmensprofil, Landingpages Delitzsch/Leipzig', 1, 'pauschal', 1480], ['Wartung & Hosting', 'monatlich', 12, 'Monat', 59, true]]);
    quote('a03', 'd05', 'AN-2026-0011', d(-6), 'versendet', [['Analyse & URL-Inventar', 'inkl. Redirect-Map', 1, 'pauschal', 850], ['Konzept & Design', 'seriös, barrierearm', 1, 'pauschal', 2200], ['Umsetzung', '12 Seiten', 12, 'Seite', 310], ['Mandanten-Upload', 'sichere Dateiübergabe (Anbindung Drittanbieter)', 1, 'pauschal', 1030], ['Schulung Redaktion', '', 2, 'Std.', 90, true]]);
    quote('a04', 'd11', null, d(-2), 'entwurf', [['Online-Bestellung (Abholung)', 'Speisekarte, Warenkorb, Abholzeit', 1, 'pauschal', 1900], ['Einweisung', '', 2, 'Std.', 75]]);
    // Rechnungen
    let no = 0; const inv = (id, cid, pid, did, type, date, rows, pays, extra) => {
      no++; const x = add('invoices', Object.assign({ id, number: 'RE-' + date.slice(0, 4) + '-' + L.pad(no, 4), type, title: L.labelOf(L.INVOICE_TYPES, type), companyId: cid, projectId: pid, dealId: did, contactId: company[cid].primaryContactId, date, dueDate: L.addDays(date, 14), servicePeriod: L.monthLabel(date), status: 'festgeschrieben', items: items(rows), payments: pays.map((p, i) => ({ id: id + 'p' + i, date: p[0], amount: p[1], note: 'Überweisung' })), reminders: [], taxMode: 'regel', taxRate: 19, finalizedAt: iso(date, 12), sentAt: iso(date, 13), customerName: company[cid].name, createdAt: iso(date) }, extra || {}));
      x.status = L.paymentStatus(x); return x;
    };
    const g = n => L.r2(n * 1.19);
    inv('r01', 'c10', null, 'd10', 'rechnung', d(-236), [['Website Fahrschule Tempo', 'gemäß Angebot', 1, 'pauschal', 2900]], [[d(-225), g(2900)]]);
    inv('r02', 'c01', 'pr01', 'd01', 'anzahlung', d(-288), [['Anzahlung 50 % gemäß Angebot AN-2025-0003', '', 1, 'pauschal', 1600]], [[d(-280), g(1600)]]);
    inv('r03', 'c01', 'pr01', 'd01', 'schluss', d(-238), [['Konzept & Sitemap', '', 1, 'pauschal', 450], ['Design & Umsetzung', '', 5, 'Seite', 420], ['SEO-Basis', '', 1, 'pauschal', 650], ['abzüglich Anzahlung RE', '', 1, 'pauschal', -1600]], [[d(-226), g(1600)]]);
    inv('r04', 'c02', 'pr02', 'd02', 'anzahlung', d(-198), [['Anzahlung 50 %', '', 1, 'pauschal', 2700]], [[d(-190), g(2700)]]);
    inv('r05', 'c02', 'pr02', 'd02', 'schluss', d(-128), [['Relaunch Physio Vogel', '', 1, 'pauschal', 5400], ['abzüglich Anzahlung', '', 1, 'pauschal', -2700]], [[d(-112), g(2700)]]);
    inv('r06', 'c04', 'pr04', 'd04', 'anzahlung', d(-11), [['Anzahlung 50 % Landingpage', '', 1, 'pauschal', 925]], [[d(-4), g(925)]]);
    inv('r07', 'c03', 'pr03', 'd03', 'anzahlung', d(-29), [['Anzahlung 50 % gemäß Angebot AN-2026-0004', '', 1, 'pauschal', 3450]], [[d(-20), 2000]]);
    const r08 = inv('r08', 'c10', null, null, 'rechnung', d(-48), [['Zusatzseite „Ferienkurse“', '', 1, 'Seite', 390], ['Bildbearbeitung', '', 2, 'Std.', 75]], [], { reminders: [{ level: 1, date: d(-25) }] });
    for (let m = 1; m <= 9; m++) { const date = L.addDays(L.addMonths(T.slice(0, 7) + '-01', -m), 1); if (date > d(-1)) continue; inv('w' + m, m % 2 ? 'c02' : 'c01', null, null, 'rechnung', date, [['Wartung & Hosting ' + L.monthLabel(date), '', 1, 'Monat', m % 2 ? 79 : 59]], m > 1 ? [[L.addDays(date, 9), g(m % 2 ? 79 : 59)]] : []); }
    // Verträge
    add('contracts', { id: 'k01', title: 'Wartung & Hosting', companyId: 'c01', kind: 'wartung', amount: 59, interval: 'monatlich', start: d(-235), active: true, createdAt: iso(d(-235)) });
    add('contracts', { id: 'k02', title: 'Wartung & Hosting Plus', companyId: 'c02', kind: 'wartung', amount: 79, interval: 'monatlich', start: d(-125), active: true, createdAt: iso(d(-125)) });
    add('contracts', { id: 'k03', title: 'Hosting', companyId: 'c10', kind: 'hosting', amount: 240, interval: 'jaehrlich', start: d(-230), active: true, createdAt: iso(d(-230)) });
    // Ausgaben
    const ex = [['Adobe', 'software', 62.99], ['Hosting-Anbieter', 'hosting', 24.9], ['Figma', 'software', 13.5], ['Google Ads', 'werbung', 120], ['Domainregistrar', 'hosting', 9.6]];
    for (let m = 0; m < 10; m++) ex.forEach(([v, c, n], i) => { if (i === 3 && m % 3) return; const date = L.addDays(L.addMonths(T.slice(0, 7) + '-01', -m), 2 + i); if (date > T) return; add('expenses', { id: 'e' + m + i, vendor: v, category: c, net: n, vat: L.r2(n * 0.19), date, recurring: i !== 3, note: '', createdAt: iso(date) }); });
    add('expenses', { id: 'eHW', vendor: 'Elektronikmarkt', category: 'hardware', net: 1249, vat: 237.31, date: d(-60), note: 'Monitor & Tablet – ggf. Abschreibung, mit Steuerberater klären', createdAt: iso(d(-60)) });
    // Termine, Notizen, Kommunikation, Aufgaben
    add('events', { id: 'v01', title: 'Beratungsgespräch Salon Schnittwerk', kind: 'beratung', start: d(1) + 'T10:00', end: d(1) + 'T10:45', location: 'Video-Call', companyId: 'c06', dealId: 'd06', notes: 'Buchungssystem klären, Bildmaterial', createdAt: iso(d(-8)) });
    add('events', { id: 'v02', title: 'Abnahme Website Fahrschule', kind: 'abnahme', start: d(2) + 'T15:00', end: d(2) + 'T16:00', location: 'Vor Ort', companyId: 'c10', projectId: 'pr05', createdAt: iso(d(-5)) });
    add('events', { id: 'v03', title: 'Kick-off Holzwerk Krause – Fotos', kind: 'kickoff', start: d(4) + 'T09:00', end: d(4) + 'T11:00', location: 'Werkstatt Delitzsch', companyId: 'c03', projectId: 'pr03', createdAt: iso(d(-3)) });
    add('notes', { id: 'n01', kind: 'gespraech', at: d(-8), companyId: 'c06', dealId: 'd06', text: 'Telefonat mit Aylin: möchte Online-Terminbuchung (eigenes Tool oder Anbieter?), Instagram-Feed, 3 Sprachen nicht nötig. Budget bis 4.000 €. Bilder: macht Freundin (Fotografin). Nächster Schritt: Beratungsgespräch, danach Angebot bis Ende nächster Woche.', createdAt: iso(d(-8)) });
    add('notes', { id: 'n02', kind: 'notiz', at: d(-5), companyId: 'c05', dealId: 'd05', text: 'Herr Berger legt Wert auf Datenschutz beim Upload-Portal. Rückfrage zu AVV des Anbieters.', createdAt: iso(d(-5)) });
    add('comms', { id: 'm01', companyId: 'c05', contactId: 'p05', dealId: 'd05', direction: 'out', channel: 'email', subject: 'Ihr Angebot AN-2026-0011', snippet: 'Guten Tag Herr Berger, wie besprochen erhalten Sie anbei Ihr Angebot …', at: iso(d(-6), 11), answered: true, createdAt: iso(d(-6)) });
    add('comms', { id: 'm02', companyId: 'c03', contactId: 'p03', projectId: 'pr03', direction: 'in', channel: 'email', subject: 'Fotos & Logo', snippet: 'Hallo, anbei schon mal das Logo in groß. Fotos machen wir am Donnerstag …', at: iso(d(-2), 8), answered: false, createdAt: iso(d(-2)) });
    add('comms', { id: 'm03', companyId: 'c06', contactId: 'p06', dealId: 'd06', direction: 'out', channel: 'telefon', subject: 'Erstgespräch', snippet: 'Bedarf geklärt, Termin für Beratung vereinbart.', at: iso(d(-8), 14), answered: true, createdAt: iso(d(-8)) });
    add('tasks', { id: 'x01', title: 'Anfrage beantworten: Paul Richter', due: L.addWorkdays(d(-1), 1, st), priority: 'hoch', status: 'offen', kind: 'task', companyId: 'c08', dealId: 'd08', source: 'Regel A · Neue Anfrage', createdAt: iso(d(-1)) });
    add('tasks', { id: 'x02', title: 'Anfrage beantworten: Lars Hoffmann', due: L.addWorkdays(d(-4), 1, st), priority: 'hoch', status: 'offen', kind: 'task', companyId: 'c07', dealId: 'd07', source: 'Regel A · Neue Anfrage', createdAt: iso(d(-4)) });
    add('tasks', { id: 'x03', title: 'Nachfassen: Angebot AN-2026-0011', due: L.addWorkdays(d(-6), 5, st), priority: 'mittel', status: 'offen', kind: 'followup', companyId: 'c05', dealId: 'd05', source: 'Regel B · Angebot versendet', createdAt: iso(d(-6)) });
    add('tasks', { id: 'x04', title: 'Angebot Salon Schnittwerk erstellen', due: d(3), priority: 'mittel', status: 'offen', kind: 'task', companyId: 'c06', dealId: 'd06', source: 'manuell', createdAt: iso(d(-8)) });
    add('tasks', { id: 'x05', title: 'Monatlichen Care-Report verschicken', due: d(5), priority: 'niedrig', status: 'offen', kind: 'task', recurrence: 'monthly', source: 'manuell', createdAt: iso(d(-20)) });
    add('tasks', { id: 'x06', title: 'Offenen Betrag klären: ' + r08.number, due: d(-2), priority: 'hoch', status: 'offen', kind: 'task', companyId: 'c10', source: 'Regel E · Rechnung überfällig', createdAt: iso(d(-3)) });
    add('scheduled', { id: 's01', runAt: L.addWorkdays(d(-6), 5, st), ruleId: 'B', actionIndex: 2, action: { type: 'setDealStage', stage: 'nachfassen', onlyIf: { field: 'deal.stage', op: 'eq', value: 'angebot_versendet' } }, trigger: 'quote.sent', col: 'quotes', recordId: 'a03', status: 'geplant', createdAt: iso(d(-6)) });
    add('approvals', { id: 'ap01', kind: 'email', status: 'offen', title: 'Eingangsbestätigung Anfrage', to: 'paul@rebe-ruhe.example', subject: 'Ihre Anfrage ist angekommen', body: 'Hallo Paul Richter,\n\nvielen Dank für Ihre Anfrage! Ich habe sie erhalten und melde mich spätestens am nächsten Werktag persönlich bei Ihnen.\n\nViele Grüße\nAlex Beispiel\nStudio Beispiel', refs: { companyId: 'c08', contactId: 'p08', dealId: 'd08' }, ruleId: 'A', attachments: [], createdAt: iso(d(-1), 9) });
    add('approvals', { id: 'ap02', kind: 'reminder', level: 2, status: 'offen', title: '1. Mahnung ' + r08.number, to: 'kevin@fahrschule-tempo.example', subject: '1. Mahnung – Rechnung ' + r08.number, body: 'Hallo Kevin Brandt,\n\nzur Rechnung ist leider noch kein Zahlungseingang zu verzeichnen …', refs: { companyId: 'c10', invoiceId: 'r08' }, attachments: [{ type: 'invoice', id: 'r08' }], ruleId: 'E', createdAt: iso(d(-1), 8) });
    add('notifications', { id: 'nt1', title: 'Neue Anfrage von Paul Richter', body: 'A · Neue Anfrage', link: 'anfragen', read: false, createdAt: iso(d(-1), 9) });
    const meta = {
      settings: Object.assign({}, L.DEFAULT_SETTINGS, { businessName: 'Studio Beispiel', ownerName: 'Alex Beispiel', address: { street: 'Musterstraße 1', zip: '04109', city: 'Leipzig', country: 'Deutschland' }, email: 'hallo@studio-beispiel.example', phone: '0341 000000', website: 'studio-beispiel.example', taxNumber: '000/000/00000', taxMode: 'regel', taxRate: 19, bank: { holder: 'Alex Beispiel', iban: 'DE00 0000 0000 0000 0000 00', bic: 'DEMODEXX', bankName: 'Demobank' }, setupDone: true, taxReservePct: 30 }),
      counters: { invoice: { [T.slice(0, 4)]: no + 5 }, quote: { [T.slice(0, 4)]: 11 } }
    };
    const entries = [];
    const ent = (at, action, col, x, title, detail) => entries.push({ at, action, col, id: x.id, title, detail: detail || '', companyId: x.companyId || (col === 'companies' ? x.id : null), projectId: x.projectId || null, dealId: x.dealId || (col === 'deals' ? x.id : null) });
    for (const q of C.inquiries) ent(q.receivedAt, 'create', 'inquiries', q, q.raw.company || q.raw.name);
    for (const dl of C.deals) { const h = dl.stageHistory; for (let i = 1; i < h.length; i++) if (h[i].at >= iso(d(-30))) ent(h[i].at, 'stage', 'deals', dl, dl.title, L.stageLabel(h[i - 1].stage) + ' → ' + L.stageLabel(h[i].stage)); }
    for (const q of C.quotes) if (q.sentAt && q.sentAt >= iso(d(-30))) ent(q.sentAt, 'sent', 'quotes', q, q.number, 'Angebot versendet');
    for (const m of C.comms) ent(m.at, 'create', 'comms', m, m.subject);
    for (const n of C.notes) ent(iso(n.at, 16), 'create', 'notes', n, n.text.slice(0, 60));
    entries.sort((a, b) => (a.at > b.at ? 1 : -1));
    const byMonth = {}; for (const e of entries) (byMonth[e.at.slice(0, 7)] = byMonth[e.at.slice(0, 7)] || []).push(e);
    const activity = Object.keys(byMonth).map(month => ({ month, entries: byMonth[month] }));
    return { collections: C, meta, activity };
  }
  return { build };
});
