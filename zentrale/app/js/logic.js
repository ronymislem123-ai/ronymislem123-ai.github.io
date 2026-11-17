/* Agentur-Zentrale – Fachlogik (rein, ohne DOM/DB; in Node testbar) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.L = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Stammdaten ---------- */
  const STAGES = [
    { id: 'neu', label: 'Neue Anfrage', prob: 5 },
    { id: 'nicht_kontaktiert', label: 'Noch nicht kontaktiert', prob: 5 },
    { id: 'erstkontakt', label: 'Erstkontakt hergestellt', prob: 10 },
    { id: 'beratung', label: 'Beratungsgespräch vereinbart', prob: 20 },
    { id: 'angebot_in_arbeit', label: 'Angebot wird erstellt', prob: 30 },
    { id: 'angebot_versendet', label: 'Angebot versendet', prob: 40 },
    { id: 'nachfassen', label: 'Nachfassaktion erforderlich', prob: 40 },
    { id: 'verhandlung', label: 'Verhandlung', prob: 60 },
    { id: 'gewonnen', label: 'Auftrag gewonnen', prob: 100 },
    { id: 'verloren', label: 'Auftrag verloren', prob: 0 }
  ];
  const OPEN_STAGES = STAGES.filter(s => s.id !== 'gewonnen' && s.id !== 'verloren').map(s => s.id);
  const stageLabel = id => (STAGES.find(s => s.id === id) || { label: id || '–' }).label;

  const COMPANY_STATUS = [
    { id: 'lead', label: 'Lead' }, { id: 'interessent', label: 'Interessent' },
    { id: 'kunde', label: 'Kunde' }, { id: 'inaktiv', label: 'Inaktiv' }, { id: 'verloren', label: 'Kein Auftrag' }
  ];
  const PROJECT_STATUS = [
    { id: 'geplant', label: 'Geplant' }, { id: 'aktiv', label: 'In Arbeit' }, { id: 'review', label: 'Abnahme' },
    { id: 'pausiert', label: 'Pausiert' }, { id: 'abgeschlossen', label: 'Abgeschlossen' }
  ];
  const PROJECT_TYPES = [
    { id: 'landingpage', label: 'One-Pager / Landingpage' }, { id: 'website', label: 'Unternehmenswebsite' },
    { id: 'relaunch', label: 'Relaunch' }, { id: 'shop', label: 'Onlineshop' }, { id: 'wartung', label: 'Wartung / Betreuung' },
    { id: 'seo', label: 'SEO / Sichtbarkeit' }, { id: 'sonstiges', label: 'Sonstiges' }
  ];
  const BUDGET_BANDS = [
    { id: 'unbekannt', label: 'Keine Angabe' }, { id: 'bis2k', label: 'bis 2.000 €' }, { id: '2k5k', label: '2.000–5.000 €' },
    { id: '5k10k', label: '5.000–10.000 €' }, { id: 'ab10k', label: 'über 10.000 €' }
  ];
  const URGENCY = [{ id: 'hoch', label: 'Hoch' }, { id: 'mittel', label: 'Mittel' }, { id: 'niedrig', label: 'Niedrig' }, { id: 'unbekannt', label: 'Unbekannt' }];
  const CHANNELS = [
    { id: 'website', label: 'Website-Formular' }, { id: 'email', label: 'E-Mail' }, { id: 'telefon', label: 'Telefon' },
    { id: 'social', label: 'Social Media' }, { id: 'empfehlung', label: 'Empfehlung' }, { id: 'akquise', label: 'Eigene Akquise' },
    { id: 'netzwerk', label: 'Netzwerk / Event' }, { id: 'sonstiges', label: 'Sonstiges' }
  ];
  const PRIORITIES = [{ id: 'hoch', label: 'Hoch' }, { id: 'mittel', label: 'Mittel' }, { id: 'niedrig', label: 'Niedrig' }];
  const RECURRENCE = [{ id: 'none', label: 'Keine' }, { id: 'daily', label: 'Täglich' }, { id: 'weekly', label: 'Wöchentlich' }, { id: 'monthly', label: 'Monatlich' }];
  const QUOTE_STATUS = [
    { id: 'entwurf', label: 'Entwurf' }, { id: 'freigabe', label: 'Wartet auf Freigabe' }, { id: 'versendet', label: 'Versendet' },
    { id: 'angenommen', label: 'Angenommen' }, { id: 'abgelehnt', label: 'Abgelehnt' }, { id: 'abgelaufen', label: 'Abgelaufen' }
  ];
  const INVOICE_TYPES = [
    { id: 'rechnung', label: 'Rechnung' }, { id: 'anzahlung', label: 'Anzahlungsrechnung' },
    { id: 'schluss', label: 'Schlussrechnung' }, { id: 'storno', label: 'Stornorechnung' }
  ];
  const EXPENSE_CATEGORIES = [
    { id: 'software', label: 'Software & Abos' }, { id: 'hosting', label: 'Hosting & Domains' }, { id: 'werbung', label: 'Werbung & Marketing' },
    { id: 'hardware', label: 'Hardware' }, { id: 'weiterbildung', label: 'Weiterbildung' }, { id: 'buero', label: 'Büro & Material' },
    { id: 'reise', label: 'Reise & Fahrt' }, { id: 'fremdleistung', label: 'Fremdleistungen' }, { id: 'gebuehren', label: 'Gebühren & Versicherungen' },
    { id: 'sonstiges', label: 'Sonstiges' }
  ];
  const DOC_CATEGORIES = [
    { id: 'angebot', label: 'Angebot' }, { id: 'rechnung', label: 'Rechnung' }, { id: 'vertrag', label: 'Vertrag' },
    { id: 'briefing', label: 'Briefing' }, { id: 'design', label: 'Designentwurf' }, { id: 'bild', label: 'Bild / Grafik' },
    { id: 'projektdatei', label: 'Projektdatei' }, { id: 'kundenunterlage', label: 'Kundenunterlage' }, { id: 'beleg', label: 'Beleg' },
    { id: 'backup', label: 'Backup' }, { id: 'sonstiges', label: 'Sonstiges' }
  ];
  const STATES = [
    ['BW', 'Baden-Württemberg'], ['BY', 'Bayern'], ['BE', 'Berlin'], ['BB', 'Brandenburg'], ['HB', 'Bremen'], ['HH', 'Hamburg'],
    ['HE', 'Hessen'], ['MV', 'Mecklenburg-Vorpommern'], ['NI', 'Niedersachsen'], ['NW', 'Nordrhein-Westfalen'], ['RP', 'Rheinland-Pfalz'],
    ['SL', 'Saarland'], ['SN', 'Sachsen'], ['ST', 'Sachsen-Anhalt'], ['SH', 'Schleswig-Holstein'], ['TH', 'Thüringen']
  ].map(([id, label]) => ({ id, label }));
  const labelOf = (list, id) => (list.find(x => x.id === id) || { label: id || '–' }).label;

  /* ---------- Datum (ISO-Strings YYYY-MM-DD, Zeitzone Europe/Berlin) ---------- */
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  function todayBerlin(now) {
    const d = now || new Date();
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    } catch (e) { return d.toISOString().slice(0, 10); }
  }
  const toDate = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const fromDate = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  const addDays = (s, n) => { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return fromDate(d); };
  const addMonths = (s, n) => {
    const d = toDate(s); const day = d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last)); return fromDate(d);
  };
  const diffDays = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000); // b - a
  const weekday = s => toDate(s).getUTCDay(); // 0 So .. 6 Sa
  const monthKey = s => String(s).slice(0, 7);
  const dateOf = iso => (iso ? String(iso).slice(0, 10) : '');
  const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return y + '-' + pad(month) + '-' + pad(day);
  }
  const _hcache = {};
  function holidays(year, state) {
    const key = year + (state || '');
    if (_hcache[key]) return _hcache[key];
    const E = easter(year); const H = {};
    const add = (d, n) => { H[d] = n; };
    add(year + '-01-01', 'Neujahr'); add(addDays(E, -2), 'Karfreitag'); add(addDays(E, 1), 'Ostermontag');
    add(year + '-05-01', 'Tag der Arbeit'); add(addDays(E, 39), 'Christi Himmelfahrt'); add(addDays(E, 50), 'Pfingstmontag');
    add(year + '-10-03', 'Tag der Deutschen Einheit'); add(year + '-12-25', '1. Weihnachtstag'); add(year + '-12-26', '2. Weihnachtstag');
    const s = state || '';
    if (['BW', 'BY', 'ST'].includes(s)) add(year + '-01-06', 'Heilige Drei Könige');
    if (s === 'BE' || (s === 'MV' && year >= 2023)) add(year + '-03-08', 'Internationaler Frauentag');
    if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL'].includes(s)) add(addDays(E, 60), 'Fronleichnam');
    if (s === 'SL') add(year + '-08-15', 'Mariä Himmelfahrt');
    if (s === 'TH') add(year + '-09-20', 'Weltkindertag');
    if (['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'].includes(s)) add(year + '-10-31', 'Reformationstag');
    if (['BW', 'BY', 'NW', 'RP', 'SL'].includes(s)) add(year + '-11-01', 'Allerheiligen');
    if (s === 'SN') { const n22 = year + '-11-22'; add(addDays(n22, -((weekday(n22) - 3 + 7) % 7)), 'Buß- und Bettag'); }
    return (_hcache[key] = H);
  }
  const holidayName = (s, state) => holidays(Number(s.slice(0, 4)), state)[s] || '';
  const isWorkday = (s, state) => { const w = weekday(s); return w !== 0 && w !== 6 && !holidayName(s, state); };
  function addWorkdays(s, n, state) {
    let d = s; let left = n;
    if (n === 0) { while (!isWorkday(d, state)) d = addDays(d, 1); return d; }
    const step = n > 0 ? 1 : -1; left = Math.abs(n);
    while (left > 0) { d = addDays(d, step); if (isWorkday(d, state)) left--; }
    return d;
  }
  function workdaysBetween(a, b, state) { // Werktage nach a bis einschließlich b
    if (b <= a) return 0; let n = 0, d = a;
    while (d < b) { d = addDays(d, 1); if (isWorkday(d, state)) n++; }
    return n;
  }
  function nextRecurrence(s, rec) {
    if (rec === 'daily') return addDays(s, 1);
    if (rec === 'weekly') return addDays(s, 7);
    if (rec === 'monthly') return addMonths(s, 1);
    return null;
  }

  /* ---------- Zeiträume ---------- */
  function periodRange(kind, today, offset = 0) {
    const y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7));
    if (kind === 'monat') {
      const from = addMonths(y + '-' + pad(m) + '-01', offset); const to = addDays(addMonths(from, 1), -1);
      return { from, to, label: monthLabel(from) };
    }
    if (kind === 'quartal') {
      const q0 = Math.floor((m - 1) / 3); const from = addMonths(y + '-' + pad(q0 * 3 + 1) + '-01', offset * 3);
      const to = addDays(addMonths(from, 3), -1); const q = Math.floor((Number(from.slice(5, 7)) - 1) / 3) + 1;
      return { from, to, label: 'Q' + q + ' ' + from.slice(0, 4) };
    }
    const yy = y + offset; return { from: yy + '-01-01', to: yy + '-12-31', label: String(yy) };
  }
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const monthLabel = s => MONTHS[Number(s.slice(5, 7)) - 1] + ' ' + s.slice(0, 4);
  const inRange = (d, r) => !!d && d >= r.from && d <= r.to;
  function lastMonths(today, n) {
    const out = []; const first = today.slice(0, 7) + '-01';
    for (let i = n - 1; i >= 0; i--) { const f = addMonths(first, -i); out.push({ key: f.slice(0, 7), from: f, to: addDays(addMonths(f, 1), -1), label: MONTHS_SHORT[Number(f.slice(5, 7)) - 1] + ' ' + f.slice(2, 4) }); }
    return out;
  }

  /* ---------- Geld ---------- */
  const r2 = n => Math.round((Number(n) || 0) * 100 + Number.EPSILON * 100) / 100;
  const num = v => { if (typeof v === 'number') return isFinite(v) ? v : 0; const s = String(v || '').replace(/\s|€/g, ''); if (!s) return 0; const t = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s; const n = parseFloat(t); return isFinite(n) ? n : 0; };

  /* ---------- Normalisierung & Dubletten ---------- */
  const FREEMAIL = ['gmail.com', 'googlemail.com', 'gmx.de', 'gmx.net', 'gmx.at', 'gmx.ch', 'web.de', 'yahoo.com', 'yahoo.de', 'outlook.com', 'outlook.de', 'hotmail.com', 'hotmail.de', 'live.com', 'live.de', 't-online.de', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'freenet.de', 'posteo.de', 'mailbox.org', 'protonmail.com', 'proton.me', 'arcor.de', '1und1.de', 'online.de', 'mail.de', 'vodafone.de', 'email.de'];
  const normEmail = e => String(e || '').trim().toLowerCase();
  const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
  function normPhone(p) {
    let s = String(p || '').trim(); if (!s) return '';
    s = s.replace(/[^\d+]/g, '');
    if (s.startsWith('+49')) s = '0' + s.slice(3); else if (s.startsWith('0049')) s = '0' + s.slice(4); else if (s.startsWith('+')) s = '00' + s.slice(1);
    s = s.replace(/^0+(?=0)/, '0');
    return s.replace(/\D/g, '').length >= 6 ? s : '';
  }
  function normDomain(u) {
    let s = String(u || '').trim().toLowerCase(); if (!s) return '';
    if (s.includes('@') && !s.includes('/')) s = s.split('@').pop();
    s = s.replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[\/?#:]/)[0];
    return /\.[a-z]{2,}$/.test(s) ? s : '';
  }
  const emailDomain = e => { const d = normDomain(normEmail(e).split('@')[1] || ''); return d && !FREEMAIL.includes(d) ? d : ''; };
  const LEGAL = /\b(gmbh\s*&\s*co\.?\s*kg|gmbh|ug|haftungsbeschränkt|ag|kg|ohg|gbr|e\.?\s?k\.?|e\.?\s?v\.?|mbh|inh\.?|inhaber(in)?|ltd|inc|co)\b/g;
  function normName(n) {
    return String(n || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[()]/g, ' ').replace(LEGAL, ' ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }
  function jaroWinkler(a, b) {
    if (!a || !b) return 0; if (a === b) return 1;
    const md = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
    const am = new Array(a.length).fill(false), bm = new Array(b.length).fill(false); let m = 0;
    for (let i = 0; i < a.length; i++) {
      for (let j = Math.max(0, i - md); j < Math.min(b.length, i + md + 1); j++) { if (!bm[j] && a[i] === b[j]) { am[i] = bm[j] = true; m++; break; } }
    }
    if (!m) return 0; let t = 0, k = 0;
    for (let i = 0; i < a.length; i++) { if (am[i]) { while (!bm[k]) k++; if (a[i] !== b[k]) t++; k++; } }
    const j = (m / a.length + m / b.length + (m - t / 2) / m) / 3; let p = 0;
    while (p < 4 && a[p] === b[p]) p++;
    return j + p * 0.1 * (1 - j);
  }
  function findDuplicates(c, companies, contacts) {
    const em = normEmail(c.email), ph = normPhone(c.phone), web = normDomain(c.website), edom = emailDomain(c.email);
    const cn = normName(c.company), pn = normName(c.name);
    const live = x => !x.deletedAt;
    const comps = companies.filter(live), cons = contacts.filter(live);
    if (em) {
      const ct = cons.find(x => normEmail(x.email) === em);
      if (ct) return { result: 'zugeordnet', companyId: ct.companyId || null, contactId: ct.id, reason: 'Gleiche E-Mail-Adresse' };
      const co = comps.find(x => normEmail(x.email) === em);
      if (co) return { result: 'zugeordnet', companyId: co.id, contactId: null, reason: 'Gleiche E-Mail-Adresse' };
    }
    if (ph) {
      const ct = cons.find(x => normPhone(x.phone) === ph);
      if (ct) return { result: 'zugeordnet', companyId: ct.companyId || null, contactId: ct.id, reason: 'Gleiche Telefonnummer' };
      const co = comps.find(x => normPhone(x.phone) === ph);
      if (co) return { result: 'zugeordnet', companyId: co.id, contactId: null, reason: 'Gleiche Telefonnummer' };
    }
    for (const d of [web, edom].filter(Boolean)) {
      const co = comps.find(x => normDomain(x.website) === d || emailDomain(x.email) === d);
      if (co) return { result: 'zugeordnet', companyId: co.id, contactId: null, reason: 'Gleiche Domain (' + d + ')' };
      const ct = cons.find(x => emailDomain(x.email) === d && x.companyId);
      if (ct) return { result: 'zugeordnet', companyId: ct.companyId, contactId: null, reason: 'Gleiche E-Mail-Domain (' + d + ')' };
    }
    const cands = [];
    if (cn && cn.length >= 3) {
      for (const co of comps) {
        const s = jaroWinkler(cn, normName(co.name));
        if (s >= 0.9) cands.push({ companyId: co.id, score: Math.round(s * 100), reason: s === 1 ? 'Gleicher Firmenname' : 'Ähnlicher Firmenname' });
      }
    }
    if (pn && pn.includes(' ')) {
      for (const ct of cons) {
        const s = jaroWinkler(pn, normName((ct.firstName || '') + ' ' + (ct.lastName || '')));
        if (s >= 0.95 && !cands.find(x => x.companyId === ct.companyId)) cands.push({ companyId: ct.companyId, contactId: ct.id, score: Math.round(s * 100), reason: 'Gleicher Personenname' });
      }
    }
    if (cands.length) return { result: 'unsicher', candidates: cands.sort((a, b) => b.score - a.score).slice(0, 5) };
    return { result: 'neu' };
  }

  /* ---------- Anfragen: Parser & Kategorisierung ---------- */
  const FIELD_ALIASES = {
    name: ['name', 'vor- und nachname', 'vorname und nachname', 'ihr name', 'ansprechpartner', 'kontaktperson'],
    company: ['firma', 'unternehmen', 'firmenname', 'company', 'betrieb'],
    email: ['e-mail', 'email', 'mail', 'e-mail-adresse', 'emailadresse'],
    phone: ['telefon', 'tel', 'telefonnummer', 'phone', 'mobil', 'handy'],
    website: ['website', 'webseite', 'homepage', 'url', 'aktuelle website', 'domain'],
    projectType: ['projektart', 'projekt', 'leistung', 'anliegen', 'art des projekts', 'interesse', 'worum geht es'],
    budget: ['budget', 'budgetrahmen', 'preisrahmen'],
    deadline: ['zeitrahmen', 'deadline', 'wunschtermin', 'termin', 'fertigstellung', 'zeitplan', 'start'],
    industry: ['branche'],
    message: ['nachricht', 'message', 'beschreibung', 'ihre nachricht', 'details', 'projektbeschreibung', 'ihr vorhaben', 'vorhaben']
  };
  function parseInquiryText(text, sender) {
    const out = { name: '', company: '', email: '', phone: '', website: '', projectType: '', budget: '', deadline: '', industry: '', message: '' };
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    let inMsg = false, fields = 0; const msg = [], loose = [];
    const empty = v => /^[\s\-–—]*$/.test(v) || /^(k\.?\s?a\.?|keine angabe|n\/a)$/i.test(v.trim());
    for (const raw of lines) {
      const line = raw.replace(/^\s*[*>\-•]\s*/, '');
      const m = line.match(/^\s*([A-Za-zÄÖÜäöüß \-]{2,32})\s*:\s*(.*)$/);
      if (m) {
        const key = m[1].trim().toLowerCase(); const f = Object.keys(FIELD_ALIASES).find(k => FIELD_ALIASES[k].includes(key));
        if (f) { fields++; if (f === 'message') { inMsg = true; if (m[2].trim()) msg.push(m[2].trim()); } else { inMsg = false; out[f] = empty(m[2]) ? '' : m[2].trim(); } continue; }
      }
      if (inMsg) msg.push(raw); else if (fields) loose.push(raw);
    }
    out.message = (msg.length ? msg : loose).join('\n').trim();
    if (!out.message && !Object.values(out).some(Boolean)) out.message = String(text || '').trim();
    if (sender) {
      const sm = String(sender).match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
      const sEmail = sm ? sm[2] : (validEmail(sender) ? sender : '');
      if (!out.email && sEmail) out.email = sEmail.trim();
      if (!out.name && sm && sm[1].trim()) out.name = sm[1].trim();
    }
    if (out.email) out.email = normEmail(out.email.replace(/^mailto:/, ''));
    return out;
  }
  const INDUSTRY_WORDS = [
    ['Friseur & Beauty', /friseur|salon|kosmetik|beauty|nagel|barber/], ['Gastronomie', /restaurant|gastro|café|cafe|bistro|bar\b|catering|imbiss/],
    ['Handwerk', /handwerk|tischler|schreiner|elektri|maler|dachdecker|sanitär|heizung|bau\b|zimmerei|metallbau/],
    ['Gesundheit', /praxis|arzt|zahnarzt|physio|therap|pflege|heilpraktik/], ['Immobilien', /immobilie|makler|hausverwalt/],
    ['Fitness & Sport', /fitness|gym|personal trainer|yoga|sport/], ['Recht & Steuern', /anwalt|kanzlei|steuerberat|notar/],
    ['Finanzen & Versicherung', /versicherung|finanz|bank|vermögen/], ['Handel', /einzelhandel|laden|boutique|shop|händler/],
    ['Beratung & Coaching', /berat|coach|consult/], ['Hotellerie & Tourismus', /hotel|pension|ferienwohnung|reise/],
    ['Kreativ & Medien', /fotograf|agentur|design|musik|künstler|video/]
  ];
  function budgetValue(b) {
    const s = String(b || '').toLowerCase().replace(/(\d)\.(\d{3})/g, '$1$2').replace(/(\d+(?:,\d+)?)\s*(k|tsd|tausend)/g, (m, x) => String(num(x) * 1000));
    const ns = (s.match(/\d+(?:[.,]\d+)?/g) || []).map(num).filter(n => n >= 100);
    if (!ns.length) return 0; return Math.max(...ns);
  }
  function budgetBand(v, over) { if (!v) return 'unbekannt'; if (over && v >= 10000) return 'ab10k'; if (v <= 2000) return 'bis2k'; if (v <= 5000) return '2k5k'; if (v <= 10000) return '5k10k'; return 'ab10k'; }
  function detectProjectType(t) {
    const s = String(t || '').toLowerCase();
    if (/shop|e-commerce|ecommerce|online-shop|onlineshop|woocommerce|shopify/.test(s)) return 'shop';
    if (/relaunch|überarbeit|neu gestalt|modernisier|redesign|veraltet/.test(s)) return 'relaunch';
    if (/landing ?page|one-?pager|onepager|einzelseite/.test(s)) return 'landingpage';
    if (/wartung|pflege|betreuung|hosting|updates/.test(s)) return 'wartung';
    if (/\bseo\b|google|sichtbar|ranking|ads\b/.test(s)) return 'seo';
    if (/website|webseite|homepage|internetseite|webauftritt/.test(s)) return 'website';
    return '';
  }
  function categorizeInquiry(raw, receivedAt) {
    const all = [raw.projectType, raw.message, raw.company, raw.industry].join(' ');
    const projectType = detectProjectType(raw.projectType) || detectProjectType(all) || 'website';
    const bv = budgetValue(raw.budget); const band = budgetBand(bv, /über|ueber|ab\s|mehr als|>|\+/i.test(String(raw.budget || '')));
    const low = all.toLowerCase() + ' ' + String(raw.deadline || '').toLowerCase();
    let urgency = 'unbekannt';
    const dl = String(raw.deadline || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (/dringend|asap|so schnell|so bald|sofort|zeitnah|eilig|kurzfristig/.test(low)) urgency = 'hoch';
    else if (dl && receivedAt) {
      const y = dl[3].length === 2 ? '20' + dl[3] : dl[3]; const d = y + '-' + pad(dl[2]) + '-' + pad(dl[1]);
      if (isDate(d)) { const days = diffDays(dateOf(receivedAt), d); urgency = days <= 30 ? 'hoch' : days <= 90 ? 'mittel' : 'niedrig'; }
    } else if (/(nächste|naechste|kommende)n? (woche|wochen)|diesen monat|in \d+ wochen/.test(low)) urgency = 'hoch';
    else if (/(nächste|naechste|kommende)n? monat|in [\d\s–-]+ monaten|quartal/.test(low)) urgency = 'mittel';
    else if (/keine eile|irgendwann|später|spaeter|nächstes jahr|naechstes jahr/.test(low)) urgency = 'niedrig';
    let industry = raw.industry || '';
    if (!industry) { const hit = INDUSTRY_WORDS.find(([, re]) => re.test(all.toLowerCase())); industry = hit ? hit[0] : ''; }
    let score = 20;
    score += { unbekannt: 5, bis2k: 5, '2k5k': 15, '5k10k': 25, ab10k: 30 }[band];
    score += { hoch: 20, mittel: 12, niedrig: 4, unbekannt: 6 }[urgency];
    if (raw.phone) score += 8; if (raw.company) score += 6; if (raw.website) score += 4;
    if (String(raw.message || '').length > 120) score += 10;
    score = Math.min(100, score);
    const priority = score >= 65 ? 'A' : score >= 45 ? 'B' : 'C';
    return { projectType, budgetValue: bv, budgetBand: band, urgency, industry, score, priority };
  }
  function splitName(full) {
    const s = String(full || '').trim().replace(/\s+/g, ' '); if (!s) return { firstName: '', lastName: '' };
    const p = s.split(' '); if (p.length === 1) return { firstName: '', lastName: p[0] };
    return { firstName: p.slice(0, -1).join(' '), lastName: p[p.length - 1] };
  }

  /* ---------- Angebote & Rechnungen ---------- */
  function itemsNet(items) {
    return r2((items || []).filter(i => !i.optional).reduce((s, i) => s + r2(num(i.qty) * num(i.price)), 0));
  }
  function totals(doc) {
    const base = itemsNet(doc.items);
    const disc = r2(base * (num(doc.discountPct) / 100));
    const net = r2(base - disc);
    const klein = doc.taxMode === 'klein';
    const rate = klein ? 0 : (doc.taxRate == null ? 19 : num(doc.taxRate));
    const tax = klein ? 0 : r2(net * rate / 100);
    return { base, discount: disc, net, rate, tax, gross: r2(net + tax), optionalNet: r2((doc.items || []).filter(i => i.optional).reduce((s, i) => s + num(i.qty) * num(i.price), 0)) };
  }
  const ISSUED = ['festgeschrieben', 'versendet', 'teilbezahlt', 'bezahlt', 'storniert'];
  const isIssued = inv => ISSUED.includes(inv.status);
  const paidAmount = inv => r2((inv.payments || []).reduce((s, p) => s + num(p.amount), 0));
  function openAmount(inv) {
    if (!isIssued(inv) || inv.status === 'storniert' || inv.type === 'storno') return 0;
    return Math.max(0, r2(totals(inv).gross - paidAmount(inv)));
  }
  function paymentStatus(inv) {
    if (!isIssued(inv)) return inv.status;
    if (inv.status === 'storniert' || inv.type === 'storno') return inv.status;
    const g = totals(inv).gross, p = paidAmount(inv);
    if (p >= g - 0.005 && g > 0) return 'bezahlt';
    if (p > 0) return 'teilbezahlt';
    return inv.sentAt ? 'versendet' : 'festgeschrieben';
  }
  const daysOverdue = (inv, today) => (openAmount(inv) > 0 && inv.dueDate && today > inv.dueDate) ? diffDays(inv.dueDate, today) : 0;
  function dunningSuggestion(inv, today, cfg) {
    cfg = cfg || {}; const d = daysOverdue(inv, today); if (!d) return null;
    const lvl = (inv.reminders || []).length; const last = (inv.reminders || []).slice(-1)[0];
    const sinceLast = last ? diffDays(last.date, today) : d;
    const first = num(cfg.reminderAfterDays ?? 5), step = num(cfg.dunningStepDays ?? 10);
    if (lvl === 0 && d >= first) return { level: 1, label: 'Zahlungserinnerung', template: 'zahlungserinnerung' };
    if (lvl === 1 && sinceLast >= step) return { level: 2, label: '1. Mahnung', template: 'mahnung1' };
    if (lvl === 2 && sinceLast >= step) return { level: 3, label: 'Letzte Mahnung', template: 'mahnung_letzte' };
    return null;
  }
  const DUNNING_LABELS = ['–', 'Zahlungserinnerung', '1. Mahnung', 'Letzte Mahnung'];
  function invoiceChecklist(inv, settings, company) {
    const s = settings || {}, c = company || {}, a = c.address || {}, sa = s.address || {}, t = totals(inv);
    const smallInvoice = t.gross > 0 && t.gross <= 250;
    const list = [
      { label: 'Name & Anschrift des Leistenden', ok: !!(s.businessName && sa.street && sa.zip && sa.city) },
      { label: 'Name & Anschrift des Kunden', ok: smallInvoice || !!(c.name && a.street && a.zip && a.city), note: smallInvoice ? 'Kleinbetragsrechnung' : '' },
      { label: 'Steuernummer oder USt-IdNr.', ok: smallInvoice || !!(s.taxNumber || s.vatId) },
      { label: 'Ausstellungsdatum', ok: isDate(inv.date) },
      { label: 'Fortlaufende Rechnungsnummer', ok: true, note: inv.number ? '' : 'wird beim Festschreiben vergeben' },
      { label: 'Menge und Art der Leistung', ok: (inv.items || []).some(i => String(i.title || '').trim() && num(i.qty)) },
      { label: 'Leistungszeitpunkt/-zeitraum', ok: !!String(inv.servicePeriod || '').trim() || inv.type === 'anzahlung' },
      { label: s.taxMode === 'klein' ? 'Hinweis § 19 UStG' : 'Entgelt, Steuersatz & Steuerbetrag', ok: inv.taxMode === s.taxMode || !s.taxMode },
      { label: 'Fälligkeitsdatum', ok: isDate(inv.dueDate) }
    ];
    return list;
  }

  /* ---------- Projekte ---------- */
  function projectProgress(p, tasks) {
    const t = tasks.filter(x => x.projectId === p.id && !x.deletedAt);
    const ms = p.milestones || [];
    const total = t.length + ms.length; if (!total) return p.status === 'abgeschlossen' ? 100 : 0;
    const done = t.filter(x => x.status === 'erledigt').length + ms.filter(m => m.done).length;
    return Math.round((done / total) * 100);
  }
  function projectHealth(p, tasks, today, state) {
    if (p.status === 'abgeschlossen') return { level: 'done', label: 'Abgeschlossen', reasons: [] };
    if (p.status === 'pausiert') return { level: 'paused', label: 'Pausiert', reasons: [] };
    const t = tasks.filter(x => x.projectId === p.id && !x.deletedAt && x.status !== 'erledigt');
    const reasons = []; let level = 'green';
    const late = t.filter(x => x.due && workdaysBetween(x.due, today, state) > 2);
    if (late.length) { level = 'yellow'; reasons.push(late.length + ' Aufgabe(n) > 2 Werktage überfällig'); }
    const clientLate = late.filter(x => x.assignee === 'kunde');
    if (clientLate.length) reasons.push(clientLate.length + ' Zulieferung(en) des Kunden überfällig');
    for (const m of (p.milestones || []).filter(m => !m.done && m.due)) {
      const before = t.filter(x => x.due && x.due <= m.due).length;
      const left = Math.max(0, workdaysBetween(today, m.due, state));
      if (m.due < today || (before > 0 && before > left * 3)) { level = 'red'; reasons.push('Meilenstein „' + m.title + '“ gefährdet'); }
    }
    if (p.deadline && p.deadline < today) { level = 'red'; reasons.push('Deadline überschritten'); }
    return { level, label: { green: 'Im Plan', yellow: 'Achtung', red: 'Kritisch' }[level], reasons };
  }
  // Zeitplan 17.11.2026: Laufzeiten auf ein Drittel verkürzt (Offsets = Werktage ab Auftrag; Nachbetreuung behält ihren Abstand zum Livegang)
  const DEFAULT_TEMPLATES = [
    {
      id: 'tpl-landingpage', name: 'One-Pager / Landingpage', projectType: 'landingpage', phases: [
        { name: 'Onboarding', tasks: [{ title: 'Kick-off & Fragebogen versenden', offset: 0, who: 'ich' }, { title: 'Fragebogen & Zugänge liefern', offset: 1, who: 'kunde' }] },
        { name: 'Konzept & Design', tasks: [{ title: 'Botschaft & Seitenaufbau', offset: 1, who: 'ich' }, { title: 'Designentwurf Hero', offset: 2, who: 'ich' }, { title: 'Abnahme 1: Design', offset: 2, who: 'kunde', milestone: true }] },
        { name: 'Inhalte', tasks: [{ title: 'Texte & Bilder liefern', offset: 2, who: 'kunde' }] },
        { name: 'Entwicklung', tasks: [{ title: 'Umsetzung & Animationen', offset: 3, who: 'ich' }, { title: 'Formular & Tracking (mit Einwilligung)', offset: 3, who: 'ich' }] },
        { name: 'Test & Launch', tasks: [{ title: 'Pre-Launch-Check', offset: 4, who: 'ich' }, { title: 'Abnahme 2: Launch-Freigabe', offset: 4, who: 'kunde', milestone: true }, { title: 'Livegang & Search Console', offset: 4, who: 'ich', milestone: true }] },
        { name: 'Nachbetreuung', tasks: [{ title: 'Kundenstimme & Wartungsangebot', offset: 14, who: 'ich' }] }
      ]
    },
    {
      id: 'tpl-website', name: 'Unternehmenswebsite', projectType: 'website', phases: [
        { name: '0 Onboarding', tasks: [{ title: 'Kick-off, Fragebogen & Content-Checkliste', offset: 0, who: 'ich' }, { title: 'Fragebogen, Zugänge & Logo liefern', offset: 1, who: 'kunde' }] },
        { name: '1 Konzept', tasks: [{ title: 'Sitemap & Seitenplan', offset: 2, who: 'ich' }, { title: 'Botschaftshaus', offset: 2, who: 'ich' }] },
        { name: '2 Design', tasks: [{ title: 'Drei Designrichtungen', offset: 3, who: 'ich' }, { title: 'Design-System & Hero', offset: 4, who: 'ich' }, { title: 'Abnahme 1: Design', offset: 4, who: 'kunde', milestone: true }] },
        { name: '3 Inhalte', tasks: [{ title: 'Texte schreiben / abstimmen', offset: 5, who: 'ich' }, { title: 'Fotos & Unterlagen liefern', offset: 5, who: 'kunde' }] },
        { name: '4 Entwicklung', tasks: [{ title: 'Seiten & Komponenten umsetzen', offset: 7, who: 'ich' }, { title: 'Animationen & Formulare', offset: 8, who: 'ich' }] },
        { name: '5 Sichtbarkeit', tasks: [{ title: 'SEO-Basis, Schema & Unternehmensprofil', offset: 8, who: 'ich' }] },
        { name: '6 Test', tasks: [{ title: 'Pre-Launch-Prüfung', offset: 8, who: 'ich' }, { title: 'Abnahme 2: Launch-Freigabe', offset: 9, who: 'kunde', milestone: true }] },
        { name: '7 Launch', tasks: [{ title: 'Livegang & Search Console', offset: 9, who: 'ich', milestone: true }] },
        { name: '8 Nachbetreuung', tasks: [{ title: 'Kundenstimme & Wartungsangebot', offset: 19, who: 'ich' }] }
      ]
    },
    {
      id: 'tpl-relaunch', name: 'Relaunch', projectType: 'relaunch', phases: [
        { name: '0 Onboarding', tasks: [{ title: 'Kick-off & Fragebogen', offset: 0, who: 'ich' }, { title: 'Zugänge (Hosting, CMS, Analytics) liefern', offset: 1, who: 'kunde' }] },
        { name: '1 Analyse & Konzept', tasks: [{ title: 'URL-Inventar der alten Website', offset: 2, who: 'ich' }, { title: 'Redirect-Map (alt → neu)', offset: 3, who: 'ich' }, { title: 'Sitemap & Seitenplan', offset: 3, who: 'ich' }] },
        { name: '2 Design', tasks: [{ title: 'Designrichtungen & Design-System', offset: 5, who: 'ich' }, { title: 'Abnahme 1: Design', offset: 6, who: 'kunde', milestone: true }] },
        { name: '3 Inhalte', tasks: [{ title: 'Inhalte übernehmen & überarbeiten', offset: 7, who: 'ich' }, { title: 'Neue Fotos & Texte liefern', offset: 6, who: 'kunde' }] },
        { name: '4 Entwicklung', tasks: [{ title: 'Umsetzung', offset: 10, who: 'ich' }, { title: 'Weiterleitungen einrichten', offset: 11, who: 'ich' }] },
        { name: '5 Test & Launch', tasks: [{ title: 'Pre-Launch-Prüfung inkl. Redirects', offset: 11, who: 'ich' }, { title: 'Abnahme 2: Launch-Freigabe', offset: 12, who: 'kunde', milestone: true }, { title: 'Livegang & Monitoring', offset: 12, who: 'ich', milestone: true }] },
        { name: '6 Nachbetreuung', tasks: [{ title: '404-/Ranking-Kontrolle nach 14 Tagen', offset: 22, who: 'ich' }] }
      ]
    },
    {
      id: 'tpl-shop', name: 'Onlineshop', projectType: 'shop', phases: [
        { name: '0 Onboarding', tasks: [{ title: 'Kick-off & Fragebogen', offset: 0, who: 'ich' }, { title: 'Zugänge & Zahlungsanbieter-Daten liefern', offset: 2, who: 'kunde' }] },
        { name: '1 Konzept', tasks: [{ title: 'Kategorien, Sitemap & Shop-Struktur', offset: 2, who: 'ich' }] },
        { name: '2 Design', tasks: [{ title: 'Shop-Design & Produktseite', offset: 5, who: 'ich' }, { title: 'Abnahme 1: Design', offset: 5, who: 'kunde', milestone: true }] },
        { name: '3 Inhalte', tasks: [{ title: 'Produktdaten & Bilder liefern', offset: 7, who: 'kunde' }, { title: 'Rechtliche Shop-Texte bereitstellen (AGB, Widerruf, Versand)', offset: 8, who: 'kunde' }] },
        { name: '4 Entwicklung', tasks: [{ title: 'Shop-Setup & Produkte', offset: 11, who: 'ich' }, { title: 'Zahlungsarten & Versand konfigurieren', offset: 12, who: 'ich' }] },
        { name: '5 Test & Launch', tasks: [{ title: 'Testbestellungen & Pre-Launch-Prüfung', offset: 13, who: 'ich' }, { title: 'Abnahme 2: Launch-Freigabe', offset: 14, who: 'kunde', milestone: true }, { title: 'Livegang', offset: 14, who: 'ich', milestone: true }] },
        { name: '6 Nachbetreuung', tasks: [{ title: 'Kundenstimme & Wartungsangebot', offset: 24, who: 'ich' }] }
      ]
    },
    {
      id: 'tpl-wartung', name: 'Wartung / Betreuung', projectType: 'wartung', phases: [
        { name: 'Start', tasks: [{ title: 'Zugänge & Backup-Status prüfen', offset: 0, who: 'ich' }, { title: 'Wartungsumfang bestätigen', offset: 2, who: 'kunde', milestone: true }] },
        { name: 'Laufend', tasks: [{ title: 'Updates, Backup & Sicherheit prüfen', offset: 5, who: 'ich', recurrence: 'monthly' }, { title: 'Monatlicher Care-Report', offset: 20, who: 'ich', recurrence: 'monthly' }] }
      ]
    }
  ];
  function applyTemplate(tpl, start, state) {
    const tasks = [], milestones = []; let maxOff = 0; let i = 0;
    for (const ph of tpl.phases || []) {
      for (const t of ph.tasks || []) {
        const due = addWorkdays(start, num(t.offset), state); maxOff = Math.max(maxOff, num(t.offset));
        if (t.milestone) milestones.push({ id: 'm' + (++i), title: t.title, due, done: false, who: t.who || 'ich', phase: ph.name });
        else tasks.push({ title: t.title, due, assignee: t.who || 'ich', phase: ph.name, recurrence: t.recurrence || 'none' });
      }
    }
    return { tasks, milestones, deadline: addWorkdays(start, maxOff, state) };
  }
  const templateForType = (templates, type) => templates.find(t => t.projectType === type) || templates.find(t => t.projectType === 'website') || templates[0];

  /* ---------- Kennzahlen (Definitionen nach Finanz-Cockpit) ---------- */
  const live = arr => (arr || []).filter(x => !x.deletedAt);
  function stageProb(stage, settings) {
    const p = settings && settings.stageProb && settings.stageProb[stage];
    return p != null && p !== '' ? num(p) : (STAGES.find(s => s.id === stage) || { prob: 0 }).prob;
  }
  function paymentNet(inv, amount) { const t = totals(inv); return t.gross ? r2(amount * t.net / t.gross) : 0; }
  function expenseCost(e, settings) { const net = num(e.net), vat = num(e.vat); return settings && settings.taxMode === 'klein' ? r2(net + vat) : r2(net); }
  function mrr(contracts, today) {
    return r2(live(contracts).filter(c => c.active !== false && (!c.start || c.start <= today) && (!c.end || c.end >= today))
      .reduce((s, c) => s + (c.interval === 'jaehrlich' ? num(c.amount) / 12 : c.interval === 'quartal' ? num(c.amount) / 3 : num(c.amount)), 0));
  }
  function revenue(invoices, r) { return r2(live(invoices).filter(i => isIssued(i) && inRange(i.date, r)).reduce((s, i) => s + totals(i).net, 0)); }
  function paymentsIn(invoices, r) {
    let gross = 0, net = 0;
    for (const i of live(invoices)) for (const p of (i.payments || [])) if (inRange(p.date, r)) { gross += num(p.amount); net += paymentNet(i, num(p.amount)); }
    return { gross: r2(gross), net: r2(net) };
  }
  function receivables(invoices, today) {
    const out = { total: 0, count: 0, notDue: 0, d0_30: 0, d31_60: 0, d60: 0, overdue: 0, overdueCount: 0 };
    for (const i of live(invoices)) {
      const o = openAmount(i); if (!o) continue; out.total += o; out.count++;
      const d = daysOverdue(i, today);
      if (!d) out.notDue += o; else { out.overdue += o; out.overdueCount++; if (d <= 30) out.d0_30 += o; else if (d <= 60) out.d31_60 += o; else out.d60 += o; }
    }
    for (const k of Object.keys(out)) if (typeof out[k] === 'number' && !k.endsWith('ount')) out[k] = r2(out[k]);
    return out;
  }
  function expensesIn(expenses, r, settings) {
    const byCat = {}; let total = 0;
    for (const e of live(expenses)) if (inRange(e.date, r)) { const c = expenseCost(e, settings); total += c; byCat[e.category || 'sonstiges'] = r2((byCat[e.category || 'sonstiges'] || 0) + c); }
    return { total: r2(total), byCat };
  }
  function backlog(projects, deals, invoices) {
    let sum = 0; const inv = live(invoices).filter(i => isIssued(i) && i.status !== 'storniert' && i.type !== 'storno');
    const invoicedFor = (key, id) => inv.filter(i => i[key] === id).reduce((s, i) => s + totals(i).net, 0);
    const P = live(projects);
    for (const p of P) if (num(p.value) > 0) sum += Math.max(0, num(p.value) - invoicedFor('projectId', p.id));
    for (const d of live(deals)) if (d.stage === 'gewonnen' && num(d.value) > 0 && !P.some(p => p.dealId === d.id)) sum += Math.max(0, num(d.value) - invoicedFor('dealId', d.id));
    return r2(sum);
  }
  function pipeline(deals, settings) {
    const open = live(deals).filter(d => OPEN_STAGES.includes(d.stage));
    const byStage = {};
    for (const s of STAGES) byStage[s.id] = { count: 0, value: 0 };
    for (const d of live(deals)) { const b = byStage[d.stage]; if (b) { b.count++; b.value = r2(b.value + num(d.value)); } }
    return {
      count: open.length, value: r2(open.reduce((s, d) => s + num(d.value), 0)),
      weighted: r2(open.reduce((s, d) => s + num(d.value) * stageProb(d.stage, settings) / 100, 0)), byStage
    };
  }
  function salesStats(deals, inquiries, r) {
    const D = live(deals);
    const won = D.filter(d => d.stage === 'gewonnen' && inRange(dateOf(d.wonAt), r));
    const lost = D.filter(d => d.stage === 'verloren' && inRange(dateOf(d.lostAt), r));
    const inq = live(inquiries).filter(q => inRange(dateOf(q.receivedAt), r));
    const newLeads = D.filter(d => inRange(dateOf(d.createdAt), r)).length;
    const cycle = won.map(d => diffDays(dateOf(d.openedAt || d.createdAt), dateOf(d.wonAt))).filter(n => n >= 0);
    return {
      newLeads, inquiries: inq.length, won: won.length, lost: lost.length,
      wonValue: r2(won.reduce((s, d) => s + num(d.value), 0)),
      winRate: won.length + lost.length ? won.length / (won.length + lost.length) : null,
      avgDeal: won.length ? r2(won.reduce((s, d) => s + num(d.value), 0) / won.length) : null,
      avgCycleDays: cycle.length ? Math.round(cycle.reduce((a, b) => a + b, 0) / cycle.length) : null,
      conversion: inq.length ? won.length / inq.length : null
    };
  }
  function kleinunternehmer(invoices, today) {
    const y = Number(today.slice(0, 4));
    const yr = yy => ({ from: yy + '-01-01', to: yy + '-12-31' });
    const gross = r => r2(live(invoices).filter(i => isIssued(i) && inRange(i.date, r)).reduce((s, i) => s + totals(i).gross, 0));
    const prev = gross(yr(y - 1)), cur = gross(yr(y));
    return { prev, cur, prevLimit: 25000, curLimit: 100000, warnPrev: prev > 25000, warnCur: cur > 80000, overCur: cur > 100000 };
  }
  function forecast(today, projects, deals, invoices, contracts, settings) {
    const b = backlog(projects, deals, invoices), p = pipeline(deals, settings), m = mrr(contracts, today);
    return { backlog: b, weightedPipeline: p.weighted, recurring3: r2(m * 3), total: r2(b + p.weighted + m * 3) };
  }
  function monthlySeries(data, today, n) {
    return lastMonths(today, n).map(m => ({
      ...m, revenue: revenue(data.invoices, m), payments: paymentsIn(data.invoices, m).gross,
      expenses: expensesIn(data.expenses, m, data.settings).total,
      newCustomers: live(data.companies).filter(c => inRange(dateOf(c.becameCustomerAt), m)).length,
      inquiries: live(data.inquiries).filter(q => inRange(dateOf(q.receivedAt), m)).length,
      won: live(data.deals).filter(d => d.stage === 'gewonnen' && inRange(dateOf(d.wonAt), m)).length
    }));
  }

  /* ---------- Automatisierungen: Regel-Modell ---------- */
  const TRIGGERS = [
    { id: 'inquiry.created', label: 'Anfrage eingegangen', entity: 'inquiry' },
    { id: 'contact.created', label: 'Kontakt angelegt', entity: 'company' },
    { id: 'deal.stageChanged', label: 'Deal-Phase geändert', entity: 'deal' },
    { id: 'quote.sent', label: 'Angebot versendet', entity: 'quote' },
    { id: 'quote.accepted', label: 'Angebot angenommen', entity: 'quote' },
    { id: 'quote.rejected', label: 'Angebot abgelehnt', entity: 'quote' },
    { id: 'deal.won', label: 'Auftrag gewonnen', entity: 'deal' },
    { id: 'deal.lost', label: 'Auftrag verloren', entity: 'deal' },
    { id: 'milestone.due', label: 'Meilenstein fällig (täglich geprüft)', entity: 'project' },
    { id: 'project.completed', label: 'Projekt abgeschlossen', entity: 'project' },
    { id: 'invoice.finalized', label: 'Rechnung festgeschrieben', entity: 'invoice' },
    { id: 'invoice.overdue', label: 'Rechnung überfällig (täglich geprüft)', entity: 'invoice' },
    { id: 'payment.received', label: 'Zahlung eingegangen', entity: 'invoice' },
    { id: 'invoice.paid', label: 'Rechnung vollständig bezahlt', entity: 'invoice' },
    { id: 'task.overdue', label: 'Aufgabe überfällig (täglich geprüft)', entity: 'task' },
    { id: 'email.unanswered', label: 'E-Mail unbeantwortet (Gmail, geprüft beim Öffnen)', entity: 'email' },
    { id: 'schedule.weekly', label: 'Zeitplan: wöchentlich (montags)', entity: 'none' },
    { id: 'schedule.monthly', label: 'Zeitplan: monatlich (am 1.)', entity: 'none' }
  ];
  const COND_FIELDS = {
    inquiry: [['category.projectType', 'Projektart', PROJECT_TYPES], ['category.budgetBand', 'Budget', BUDGET_BANDS], ['category.urgency', 'Dringlichkeit', URGENCY], ['category.priority', 'Priorität (A/B/C)'], ['channel', 'Kanal', CHANNELS], ['category.industry', 'Branche'], ['dup.result', 'Dubletten-Ergebnis']],
    deal: [['stage', 'Phase', STAGES], ['value', 'Wert (€)'], ['source', 'Quelle', CHANNELS], ['projectType', 'Projektart', PROJECT_TYPES]],
    quote: [['total', 'Summe netto (€)'], ['deal.stage', 'Deal-Phase', STAGES]],
    invoice: [['type', 'Rechnungsart', INVOICE_TYPES], ['gross', 'Betrag brutto (€)'], ['daysOverdue', 'Tage überfällig']],
    project: [['projectType', 'Projektart', PROJECT_TYPES], ['value', 'Auftragswert (€)']],
    task: [['priority', 'Priorität', PRIORITIES], ['assignee', 'Zuständig']],
    company: [['status', 'Status', COMPANY_STATUS], ['source', 'Quelle', CHANNELS]],
    email: [['workdays', 'Werktage unbeantwortet']], none: []
  };
  const OPS = [['eq', 'ist'], ['ne', 'ist nicht'], ['gt', 'größer als'], ['lt', 'kleiner als'], ['contains', 'enthält'], ['empty', 'ist leer'], ['notempty', 'ist nicht leer']];
  const ACTIONS = [
    { id: 'createTask', label: 'Aufgabe anlegen', params: ['title', 'dueWorkdays', 'priority'] },
    { id: 'followUp', label: 'Wiedervorlage setzen', params: ['title', 'dueWorkdays'] },
    { id: 'setDealStage', label: 'Deal-Phase setzen', params: ['stage'] },
    { id: 'setCompanyStatus', label: 'Kundenstatus setzen', params: ['status'] },
    { id: 'createProject', label: 'Projekt aus Vorlage anlegen', params: [] },
    { id: 'notify', label: 'Benachrichtigung', params: ['title'] },
    { id: 'draftEmail', label: 'E-Mail-Entwurf → Freigabe', params: ['template'], external: true },
    { id: 'draftInvoice', label: 'Anzahlungsrechnung als Entwurf', params: ['percent'] },
    { id: 'markReminder', label: 'Zahlungserinnerung vorbereiten → Freigabe', params: [], external: true }
  ];
  const getPath = (o, p) => String(p).split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  function evalCondition(c, rec) {
    const v = getPath(rec, c.field); const w = c.value;
    const isNum = v != null && v !== '' && !isNaN(Number(v)) && w !== '' && !isNaN(Number(w));
    switch (c.op) {
      case 'eq': return String(v ?? '') === String(w ?? '');
      case 'ne': return String(v ?? '') !== String(w ?? '');
      case 'gt': return isNum && Number(v) > Number(w);
      case 'lt': return isNum && Number(v) < Number(w);
      case 'contains': return String(v ?? '').toLowerCase().includes(String(w ?? '').toLowerCase());
      case 'empty': return v == null || v === '';
      case 'notempty': return !(v == null || v === '');
      default: return false;
    }
  }
  const evalConditions = (conds, rec) => (conds || []).every(c => evalCondition(c, rec));
  const DEFAULT_RULES = [
    {
      id: 'A', name: 'A · Neue Anfrage', trigger: 'inquiry.created', mode: 'aktiv', builtin: true, conditions: [], actions: [
        { type: 'createTask', title: 'Anfrage beantworten: {{name}}', dueWorkdays: 1, priority: 'hoch' },
        { type: 'followUp', title: 'Wiedervorlage: Rückmeldung zu Anfrage von {{name}}', dueWorkdays: 3 },
        { type: 'notify', title: 'Neue Anfrage von {{name}}' },
        { type: 'draftEmail', template: 'eingangsbestaetigung', autoSend: false }
      ]
    },
    {
      id: 'B', name: 'B · Angebot versendet', trigger: 'quote.sent', mode: 'aktiv', builtin: true, conditions: [], actions: [
        { type: 'setDealStage', stage: 'angebot_versendet' },
        { type: 'followUp', title: 'Nachfassen: Angebot {{number}}', dueWorkdays: 5 },
        { type: 'setDealStage', stage: 'nachfassen', delayWorkdays: 5, onlyIf: { field: 'deal.stage', op: 'eq', value: 'angebot_versendet' } },
        { type: 'draftEmail', template: 'nachfassen_angebot', delayWorkdays: 5, onlyIf: { field: 'deal.stage', op: 'eq', value: 'nachfassen' } }
      ]
    },
    {
      id: 'C', name: 'C · Auftrag gewonnen', trigger: 'deal.won', mode: 'aktiv', builtin: true, conditions: [], actions: [
        { type: 'setCompanyStatus', status: 'kunde' },
        { type: 'createProject' },
        { type: 'draftEmail', template: 'willkommen' },
        { type: 'draftInvoice', percent: 50 },
        { type: 'notify', title: 'Auftrag gewonnen: {{title}}' }
      ]
    },
    {
      id: 'D', name: 'D · Rechnung bezahlt', trigger: 'invoice.paid', mode: 'aktiv', builtin: true, conditions: [], actions: [
        { type: 'notify', title: 'Zahlung vollständig: {{number}}' }
      ]
    },
    {
      id: 'E', name: 'E · Rechnung überfällig', trigger: 'invoice.overdue', mode: 'aktiv', builtin: true, conditions: [], actions: [
        { type: 'markReminder' },
        { type: 'createTask', title: 'Offenen Betrag klären: {{number}}', dueWorkdays: 0, priority: 'hoch' }
      ]
    },
    {
      id: 'F', name: 'F · Projekt abgeschlossen', trigger: 'project.completed', mode: 'aktiv', builtin: true, conditions: [], actions: [
        { type: 'createTask', title: 'Abschlussdokumentation & Nachkalkulation: {{name}}', dueWorkdays: 2, priority: 'mittel' },
        { type: 'draftEmail', template: 'feedback', delayWorkdays: 3 },
        { type: 'followUp', title: 'Folgeauftrag / Wartung anbieten: {{name}}', dueWorkdays: 20 }
      ]
    },
    {
      id: 'G', name: 'G · Unbeantwortete E-Mail', trigger: 'email.unanswered', mode: 'aktiv', builtin: true, conditions: [{ field: 'workdays', op: 'gt', value: '1' }], actions: [
        { type: 'createTask', title: 'Antworten: {{subject}}', dueWorkdays: 0, priority: 'hoch' }
      ]
    },
    {
      id: 'H', name: 'Auftrag verloren', trigger: 'deal.lost', mode: 'aktiv', builtin: true, conditions: [], actions: [
        { type: 'followUp', title: 'Später erneut melden: {{title}}', dueWorkdays: 60 }
      ]
    },
    {
      id: 'I', name: 'Meilenstein fällig', trigger: 'milestone.due', mode: 'aktiv', builtin: true, conditions: [], actions: [
        { type: 'notify', title: 'Meilenstein heute fällig: {{milestone}} ({{name}})' },
        { type: 'draftEmail', template: 'statusupdate' }
      ]
    }
  ];
  function fillTemplate(str, vars) { return String(str || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (vars && vars[k] != null && vars[k] !== '' ? String(vars[k]) : '')); }

  const DEFAULT_EMAIL_TEMPLATES = {
    eingangsbestaetigung: { name: 'Eingangsbestätigung Anfrage', subject: 'Ihre Anfrage ist angekommen', body: 'Hallo {{name}},\n\nvielen Dank für Ihre Anfrage! Ich habe sie erhalten und melde mich spätestens am nächsten Werktag persönlich bei Ihnen – mit ersten Gedanken und einem Terminvorschlag für ein kurzes Kennenlerngespräch.\n\nViele Grüße\n{{absender}}\n{{agentur}}' },
    antwort_anfrage: { name: 'Antwort auf Anfrage mit Terminvorschlag', subject: 'Ihr Website-Projekt – Terminvorschlag', body: 'Hallo {{name}},\n\ndanke für Ihre Nachricht und die Einblicke in Ihr Vorhaben. Damit ich Ihnen ein passendes Angebot machen kann, würde ich gern 20 Minuten mit Ihnen sprechen.\n\nPasst Ihnen einer dieser Termine?\n– {{termin1}}\n– {{termin2}}\n\nViele Grüße\n{{absender}}' },
    nachfassen_angebot: { name: 'Nachfassen Angebot', subject: 'Kurze Rückfrage zu Ihrem Angebot {{number}}', body: 'Hallo {{name}},\n\nich wollte kurz nachfragen, ob Sie Gelegenheit hatten, sich mein Angebot {{number}} anzusehen. Gibt es Fragen oder Punkte, die wir noch anpassen sollen? Gern können wir das auch kurz telefonisch klären.\n\nViele Grüße\n{{absender}}' },
    angebot_versand: { name: 'Angebot versenden', subject: 'Ihr Angebot {{number}}', body: 'Hallo {{name}},\n\nwie besprochen erhalten Sie anbei Ihr Angebot {{number}}. Es ist gültig bis {{gueltig}}. Bei Fragen melden Sie sich jederzeit.\n\nViele Grüße\n{{absender}}\n{{agentur}}' },
    willkommen: { name: 'Willkommen / Projektstart', subject: 'Willkommen an Bord – so starten wir {{projekt}}', body: 'Hallo {{name}},\n\nich freue mich sehr auf unsere Zusammenarbeit! In den nächsten Tagen erhalten Sie von mir einen kurzen Fragebogen und eine Checkliste mit den Inhalten, die ich von Ihnen benötige. Zugangsdaten bitte nie per E-Mail senden – dafür schicke ich Ihnen einen sicheren Weg.\n\nNächster Schritt: Kick-off-Termin. Passt Ihnen ein Termin in dieser oder der nächsten Woche?\n\nViele Grüße\n{{absender}}' },
    feedback: { name: 'Feedback-Anfrage', subject: 'Wie zufrieden sind Sie mit Ihrer neuen Website?', body: 'Hallo {{name}},\n\nIhre Website ist jetzt einige Tage online – ich hoffe, sie macht Ihnen Freude! Hätten Sie zwei Minuten für ein kurzes Feedback? Was hat Ihnen an der Zusammenarbeit gefallen, was kann ich besser machen?\n\nWenn Sie zufrieden waren, würde mir eine kurze Google-Bewertung sehr helfen.\n\nViele Grüße\n{{absender}}' },
    statusupdate: { name: 'Status-Update an Kunden', subject: 'Projektstand {{projekt}}', body: 'Hallo {{name}},\n\nhier ein kurzer Stand zu {{projekt}}:\n\nErledigt: {{erledigt}}\nAls Nächstes: {{naechstes}}\nVon Ihnen benötigt: {{zulieferung}}\n\nDer geplante Termin {{deadline}} steht.\n\nViele Grüße\n{{absender}}' },
    rechnung_versand: { name: 'Rechnung versenden', subject: 'Rechnung {{number}}', body: 'Hallo {{name}},\n\nanbei erhalten Sie die Rechnung {{number}} über {{betrag}}, fällig am {{faellig}}. Vielen Dank für den Auftrag!\n\nViele Grüße\n{{absender}}\n{{agentur}}' },
    zahlungserinnerung: { name: 'Zahlungserinnerung', subject: 'Zahlungserinnerung zur Rechnung {{number}}', body: 'Hallo {{name}},\n\nvielleicht ist es im Alltag untergegangen: Die Rechnung {{number}} über {{offen}} war am {{faellig}} fällig. Ich hänge sie Ihnen gern noch einmal an. Falls Sie bereits überwiesen haben, betrachten Sie diese Nachricht bitte als gegenstandslos.\n\nViele Grüße\n{{absender}}' },
    mahnung1: { name: '1. Mahnung', subject: '1. Mahnung – Rechnung {{number}}', body: 'Hallo {{name}},\n\nzur Rechnung {{number}} vom {{datum}} ist leider noch kein Zahlungseingang zu verzeichnen. Offen ist ein Betrag von {{offen}}. Bitte überweisen Sie diesen bis zum {{neueFrist}}.\n\nBei Fragen zur Rechnung melden Sie sich gern direkt bei mir.\n\nViele Grüße\n{{absender}}' },
    mahnung_letzte: { name: 'Letzte Mahnung', subject: 'Letzte Mahnung – Rechnung {{number}}', body: 'Hallo {{name}},\n\ntrotz Erinnerung und Mahnung ist die Rechnung {{number}} über {{offen}} weiterhin offen. Ich bitte Sie, den Betrag bis spätestens {{neueFrist}} zu begleichen. Sollte bis dahin keine Zahlung eingehen, werde ich weitere Schritte prüfen.\n\nViele Grüße\n{{absender}}' }
  };

  const DEFAULT_SETTINGS = {
    businessName: '', ownerName: '', address: { street: '', zip: '', city: '', country: 'Deutschland' }, email: '', phone: '', website: '',
    taxNumber: '', vatId: '', taxMode: '', taxRate: 19, bank: { holder: '', iban: '', bic: '', bankName: '' },
    paymentTermDays: 14, quoteValidDays: 30, state: 'SN', reminderAfterDays: 5, dunningStepDays: 10, taxReservePct: '',
    stageProb: {}, invoicePrefix: 'RE', quotePrefix: 'AN', inquirySubjectKeyword: 'Projektanfrage', gmailImport: false, gmailUnanswered: false,
    dashboardWidgets: null, setupDone: false
  };

  const formatNo = (prefix, year, n, padLen = 4) => (prefix ? prefix + '-' : '') + year + '-' + pad(n, padLen);

  return {
    STAGES, OPEN_STAGES, stageLabel, COMPANY_STATUS, PROJECT_STATUS, PROJECT_TYPES, BUDGET_BANDS, URGENCY, CHANNELS, PRIORITIES, RECURRENCE,
    QUOTE_STATUS, INVOICE_TYPES, EXPENSE_CATEGORIES, DOC_CATEGORIES, STATES, labelOf,
    pad, todayBerlin, addDays, addMonths, diffDays, weekday, monthKey, dateOf, isDate, easter, holidays, holidayName, isWorkday, addWorkdays,
    workdaysBetween, nextRecurrence, periodRange, MONTHS, MONTHS_SHORT, monthLabel, inRange, lastMonths,
    r2, num, normEmail, validEmail, normPhone, normDomain, emailDomain, normName, jaroWinkler, findDuplicates, FREEMAIL,
    parseInquiryText, categorizeInquiry, budgetValue, budgetBand, detectProjectType, splitName,
    itemsNet, totals, isIssued, paidAmount, openAmount, paymentStatus, daysOverdue, dunningSuggestion, DUNNING_LABELS, invoiceChecklist,
    projectProgress, projectHealth, DEFAULT_TEMPLATES, applyTemplate, templateForType,
    live, stageProb, paymentNet, expenseCost, mrr, revenue, paymentsIn, receivables, expensesIn, backlog, pipeline, salesStats, kleinunternehmer, forecast, monthlySeries,
    TRIGGERS, COND_FIELDS, OPS, ACTIONS, getPath, evalCondition, evalConditions, DEFAULT_RULES, fillTemplate, DEFAULT_EMAIL_TEMPLATES, DEFAULT_SETTINGS, formatNo
  };
});
