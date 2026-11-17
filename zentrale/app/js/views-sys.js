/* Agentur-Zentrale – Ansichten: Dokumente, E-Mail, Automatisierungen, Freigaben, KI-Assistent, Einstellungen, System, Papierkorb, Protokoll */
(function () {
  'use strict';
  const V = window.V; const ACT = window.ACT; const esc = F.esc; const today = () => L.todayBerlin(); const S = () => D.settings();

  /* ================= Dokumente ================= */
  const docIcon = d => /^image\//.test(d.contentType) ? 'eye' : d.contentType === 'application/pdf' ? 'fileText' : /^video\//.test(d.contentType) ? 'play' : 'paperclip';
  V.docList = function (docs, links) {
    links = links || {};
    const up = '<button class="btn sm primary" data-act="uploadDoc" data-company="' + (links.companyId || '') + '" data-project="' + (links.projectId || '') + '">' + ic('upload', 's') + 'Hochladen</button>';
    if (!docs.length) return '<div class="card">' + UI.empty('folder', 'Noch keine Dokumente', 'Lade Angebote, Verträge, Briefings, Designentwürfe, Bilder oder Kundenunterlagen hoch. Erlaubt: PDF, Bilder, Videos, Text/CSV/JSON/Markdown (max. 20 MB).', up) + '</div>';
    return '<div class="card"><div class="card-h"><h3>Dokumente</h3><span class="sub">' + docs.length + '</span><div class="tools">' + up + '</div></div><div class="list">' + docs.sort((a, b) => ((b.uploadedAt || b.createdAt) > (a.uploadedAt || a.createdAt) ? 1 : -1)).map(d => {
      const url = Docs.url(d); const img = /^image\//.test(d.contentType);
      return '<div class="li">' + (img ? '<img src="' + esc(url) + '" alt="" loading="lazy" style="width:38px;height:38px;object-fit:cover;border-radius:8px;background:var(--sunken)">' : '<span class="avatar" style="background:var(--sunken);color:var(--ink-2)">' + ic(docIcon(d)) + '</span>') +
        '<div class="grow"><div class="t ellipsis"><a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(d.name) + '</a></div><div class="m row wrap gap-4"><span class="chip">' + esc(L.labelOf(L.DOC_CATEGORIES, d.category)) + '</span>' + (d.archived ? '<span class="chip info">' + ic('lock', 's') + 'Archiv</span>' : '') + (links.companyId ? '' : (d.companyId ? H.co(d.companyId) : '')) + (d.projectId && !links.projectId ? ' · <a href="#projekt-' + d.projectId + '">' + esc((D.get('projects', d.projectId) || {}).name || '') + '</a>' : '') + '<span>' + F.size(d.size) + ' · ' + F.date(d.uploadedAt || d.createdAt) + '</span></div></div>' +
        '<a class="btn xs icon" href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="Öffnen">' + ic('external', 's') + '</a><button class="btn xs icon" data-act="docMenu" data-id="' + d.id + '" aria-label="Mehr">' + ic('more', 's') + '</button></div>';
    }).join('') + '</div></div>';
  };
  V.uploadDialog = function (links) {
    links = links || {};
    UI.form({
      title: 'Dokumente hochladen', values: { companyId: links.companyId || null, projectId: links.projectId || null, category: '' }, submit: 'Hochladen',
      intro: '<div class="field full" style="margin-bottom:12px"><input type="file" class="in" name="_files" multiple accept="' + Docs.ACCEPT + '" style="padding-top:6px;height:auto;min-height:40px"><div class="help">PDF, PNG/JPG/GIF/WebP/SVG, MP4/WebM, TXT/CSV/JSON/Markdown · max. 20 MB je Datei. Word/ZIP bitte vorher als PDF speichern.</div></div>',
      fields: [{ key: 'category', label: 'Kategorie', type: 'select', options: L.DOC_CATEGORIES, empty: '– automatisch erkennen –' }, { key: 'companyId', label: 'Kunde', type: 'company' }, { key: 'projectId', label: 'Projekt', type: 'project' }],
      onSubmit: async (v, el) => {
        const files = Array.from(el.querySelector('[name="_files"]').files || []); if (!files.length) throw { message: 'Bitte mindestens eine Datei wählen.' };
        let ok = 0; const errs = [];
        for (const f of files) { try { await Docs.uploadBlob(f, { name: f.name, category: v.category || Docs.guessCategory(f.name), companyId: v.companyId, projectId: v.projectId || null }); ok++; } catch (e) { errs.push(f.name + ': ' + Docs.errorText(e)); } }
        if (ok) UI.toast(ok + ' Datei(en) hochgeladen'); if (errs.length) UI.toast(errs.join(' · '), { bad: true, ms: 9000 });
      }
    });
  };
  ACT.uploadDoc = el => V.uploadDialog({ companyId: el.dataset.company || null, projectId: el.dataset.project || null });
  ACT.docMenu = el => {
    const d = D.get('documents', el.dataset.id);
    UI.menu(el, [{ label: 'Zuordnung & Kategorie ändern', icon: 'pencil', fn: () => UI.form({ title: 'Dokument', size: 'narrow', values: d, fields: [{ key: 'name', label: 'Name', required: true, full: true }, { key: 'category', label: 'Kategorie', type: 'select', options: L.DOC_CATEGORIES, full: true }, { key: 'companyId', label: 'Kunde', type: 'company', full: true }, { key: 'projectId', label: 'Projekt', type: 'project', full: true }], onSubmit: async v => { await D.update('documents', d.id, v); UI.toast('Gespeichert'); } }) },
      { label: 'Herunterladen', icon: 'download', fn: () => UI.run(async () => { const b = await Runtime.assets.fetchBlob(d.assetId); await F.download(d.name || 'Datei', b); }, 'Download gestartet') },
      d.archived ? null : { sep: true }, d.archived ? null : { label: 'In den Papierkorb', icon: 'trash', danger: true, fn: () => UI.run(() => D.softDelete('documents', d.id), 'In den Papierkorb verschoben') }]);
  };
  V.dokumente = {
    title: 'Dokumente', icon: 'folder',
    render() {
      const st = App.ui('dokumente'); const cat = st.cat || ''; const q = (st.q || '').toLowerCase();
      const docs = D.all('documents').filter(d => (!cat || d.category === cat) && (!q || (d.name + ' ' + O.companyName(d.companyId)).toLowerCase().includes(q)));
      return '<div class="page-head"><div><h2>Dokumente</h2><p>Zentrale Ablage – jedes Dokument hängt am richtigen Kunden oder Projekt. Rechnungs-PDFs werden beim Festschreiben automatisch archiviert.</p></div><div class="actions"><button class="btn primary" data-act="uploadDoc">' + ic('upload') + 'Hochladen</button></div></div>' +
        '<div class="toolbar"><div class="search-in">' + ic('search') + '<input id="doc-q" placeholder="Dateiname oder Kunde …" value="' + esc(st.q || '') + '" data-input="docQ"></div><select class="in" style="width:auto" data-act-change="docCat"><option value="">Alle Kategorien</option>' + UI.optList(L.DOC_CATEGORIES, cat) + '</select></div>' + V.docList(docs, {});
    }
  };
  ACT.docCat = el => { App.ui('dokumente').cat = el.value; App.saveUi(); App.render(); };

  /* ================= E-Mail (Gmail-Connector) ================= */
  const mailState = { threads: null, loading: false, error: '', query: '' };
  V.email = {
    title: 'E-Mail', icon: 'mail',
    render() {
      const s = S(); const st = App.ui('email'); const q = st.q || 'in:inbox newer_than:14d';
      let html = '<div class="page-head"><div><h2>E-Mail & Kommunikation</h2><p>Kommunikation mit Kunden – Versand nur nach deiner Freigabe. Ohne E-Mail-Modul öffnen sich E-Mails fertig ausgefüllt in deinem Mailprogramm.</p></div><div class="actions"><button class="btn" data-act="composeMail">' + ic('pencil') + 'Neue E-Mail</button></div></div>';
      if (!Mail.available) {
        return html + '<div class="card"><div class="row start gap-12"><span class="avatar" style="background:var(--sunken);color:var(--ink-2)">' + ic('mail') + '</span><div class="grow"><b>E-Mail über dein Mailprogramm</b><div class="muted" style="margin:4px 0 10px">Website-Anfragen kommen direkt über das Kontaktformular in die Zentrale. Antworten, Angebote und Rechnungen bereitest du hier vor; nach der Freigabe öffnet „Im Mailprogramm öffnen“ die fertige E-Mail, und du markierst sie danach als versendet.</div><a class="btn primary" href="#freigaben">' + ic('shield') + 'Zur Freigabe-Warteschlange</a></div></div><div class="divider"></div><div class="small muted">Optionales Modul: Eine direkte Postfach-Anbindung (Gmail) braucht eine eigene Server-Funktion mit Google-Zugang. Sie ist vorbereitet, aber nicht eingerichtet – alle anderen Funktionen laufen ohne sie.</div></div>';
      }
      html += '<form class="toolbar" data-mailsearch><div class="search-in grow" style="max-width:560px">' + ic('search') + '<input name="q" value="' + esc(q) + '" placeholder="Gmail-Suche, z. B. from:kunde@firma.de"></div><button class="btn">Suchen</button><label class="toggle small"><input type="checkbox" data-act="mailOnlyKnown" ' + (st.known ? 'checked' : '') + '><span class="sw"></span>Nur bekannte Kunden</label>' + (s.gmailImport ? '<button class="btn" type="button" data-act="gmailImport">' + ic('inbox') + 'Website-Anfragen abrufen</button>' : '') + '</form>';
      if (mailState.query !== q && !mailState.loading) { setTimeout(() => loadMail(q), 0); }
      if (mailState.loading && !mailState.threads) return html + '<div class="card"><div class="faint">Lade E-Mails …</div></div>';
      if (mailState.error) return html + '<div class="note bad">' + ic('alert') + '<span>' + esc(mailState.error) + '</span></div>';
      let th = mailState.threads || [];
      if (st.known) th = th.filter(t => t.last && Mail.knownEmail(t.last.from.email));
      if (!th.length) return html + '<div class="card">' + UI.empty('mail', 'Keine E-Mails gefunden', 'Passe die Suche an.') + '</div>';
      return html + '<div class="card pad0"><div class="list">' + th.map(t => {
        const k = t.last && Mail.knownEmail(t.last.from.email); const co = k && D.get('companies', k.companyId); const unread = (t.last.labels || []).includes('UNREAD');
        return '<div class="li click" data-act="openThread" data-id="' + esc(t.id) + '" style="padding:10px 14px">' + H.avatar(t.last.from.name || t.last.from.email, 'sm') + '<div class="grow"><div class="row"><span class="ellipsis" style="font-weight:' + (unread ? 700 : 550) + '">' + esc(t.last.from.name || t.last.from.email) + '</span>' + (co ? '<span class="chip good">' + esc(co.name) + '</span>' : '') + (t.count > 1 ? '<span class="faint small">(' + t.count + ')</span>' : '') + '<span class="grow"></span><span class="faint small nowrap">' + F.ago(t.last.date) + '</span></div><div class="ellipsis small">' + esc(t.subject || '(ohne Betreff)') + '</div><div class="ellipsis faint small">' + esc(t.snippet) + '</div></div></div>';
      }).join('') + '</div></div>';
    },
    mount(el) { const f = el.querySelector('[data-mailsearch]'); if (f) f.addEventListener('submit', e => { e.preventDefault(); App.ui('email').q = f.q.value.trim(); App.saveUi(); mailState.query = ''; App.render(); }); }
  };
  async function loadMail(q) { mailState.loading = true; mailState.error = ''; mailState.query = q; App.render(); try { mailState.threads = await Mail.search(q, 30); } catch (e) { mailState.error = e.friendly || Mail.errorText(e); } finally { mailState.loading = false; App.render(); } }
  ACT.mailConnect = async el => { el.disabled = true; await Mail.init(); if (Mail.available) { try { await Mail.search('in:inbox', 1); UI.toast('Gmail verbunden'); } catch (e) { UI.err(e); } } else UI.toast(Mail.errorText({ code: Mail.status === 'unavailable' ? 'not_granted' : 'server_not_connected' }), { bad: true }); mailState.query = ''; App.render(); };
  ACT.mailOnlyKnown = el => { App.ui('email').known = el.checked; App.saveUi(); App.render(); };
  ACT.composeMail = () => E.emailCompose({});
  ACT.openThread = async el => {
    const id = el.dataset.id; const dlg = UI.dialog({ drawer: true, title: 'E-Mail', body: '<div class="faint">Lade …</div>' });
    try {
      const th = await Mail.thread(id); const first = th.messages[0] || {}; const last = th.messages[th.messages.length - 1] || {}; const k = Mail.knownEmail(first.from && first.from.email);
      const db = dlg.el.querySelector('.db'); dlg.el.querySelector('.dh h3').textContent = first.subject || '(ohne Betreff)';
      db.innerHTML = '<div class="row wrap" style="margin-bottom:12px">' + (k ? '<a class="btn sm" href="#kunde-' + k.companyId + '">' + ic('user', 's') + esc(O.companyName(k.companyId)) + '</a><button class="btn sm" data-x="log">' + ic('history', 's') + 'In Kundenakte ablegen</button>' : '<button class="btn sm" data-x="assign">' + ic('link', 's') + 'Kunde zuordnen</button><button class="btn sm" data-x="inq">' + ic('inbox', 's') + 'Als Anfrage übernehmen</button>') + '<button class="btn sm primary" data-x="reply">' + ic('send', 's') + 'Antworten</button>' + (th.viewUrl ? '<a class="btn sm ghost" href="' + esc(th.viewUrl) + '" target="_blank" rel="noopener">' + ic('external', 's') + 'In Gmail</a>' : '') + '</div>' +
        th.messages.map(m => '<div class="card flat tight" style="margin-bottom:10px"><div class="row"><b class="ellipsis">' + esc(m.from.name || m.from.email) + '</b><span class="grow"></span><span class="faint small">' + F.dateTime(m.date) + '</span></div><div class="faint small">' + esc(m.from.email) + (m.attachments.length ? ' · ' + ic('paperclip', 's') + esc(m.attachments.join(', ')) : '') + '</div><div style="white-space:pre-wrap;margin-top:8px;font-size:13px;overflow-wrap:anywhere">' + esc(String(m.body || '').slice(0, 8000)) + '</div></div>').join('');
      db.addEventListener('click', async e => {
        const b = e.target.closest('[data-x]'); if (!b) return; const x = b.dataset.x;
        if (x === 'reply') { const to = last.from.email && Mail.knownEmail(last.from.email) ? last.from.email : first.from.email; E.emailCompose({ to, subject: /^re:/i.test(first.subject) ? first.subject : 'Re: ' + (first.subject || ''), body: 'Hallo ' + (first.from.name || '') + ',\n\n\n\nViele Grüße\n' + (S().ownerName || ''), threadId: th.id, refs: k ? { companyId: k.companyId, contactId: k.contactId } : {}, ai: 'Antworte auf diese E-Mail-Unterhaltung höflich und konkret:\n' + th.messages.slice(-3).map(m => m.from.email + ': ' + String(m.body).slice(0, 1500)).join('\n---\n') }); }
        if (x === 'inq') { const raw = L.parseInquiryText(first.body, (first.from.name ? '"' + first.from.name + '" ' : '') + '<' + first.from.email + '>'); await UI.run(() => O.intakeInquiry(raw, { channel: 'email', receivedAt: first.date, gmailThreadId: th.id, subject: first.subject }), 'Als Anfrage übernommen'); dlg.close(); }
        if (x === 'log' || x === 'assign') {
          const go = async companyId => { for (const m of th.messages) await D.create('comms', { companyId, direction: Mail.knownEmail(m.from.email) || x === 'assign' ? (m.from.email === first.from.email ? 'in' : 'out') : 'out', channel: 'email', subject: m.subject, snippet: String(m.body).slice(0, 600), at: m.date, gmailThreadId: th.id, gmailMessageId: m.id, answered: true }, { silent: true }); UI.toast(th.messages.length + ' Nachricht(en) in der Kundenakte abgelegt'); };
          if (x === 'log') await UI.run(() => go(k.companyId));
          else UI.form({ title: 'Kunde zuordnen', size: 'narrow', values: {}, fields: [{ key: 'companyId', label: 'Kunde', type: 'company', required: true, full: true }, { key: 'addContact', type: 'checkbox', text: 'Absender als Kontakt anlegen (' + first.from.email + ')' }], onSubmit: async v => { if (v.addContact) { const nm = L.splitName(first.from.name); await D.create('contacts', { companyId: v.companyId, firstName: nm.firstName, lastName: nm.lastName, email: first.from.email, isPrimary: !O.primaryContact(v.companyId) }); } await go(v.companyId); } });
        }
      });
    } catch (e) { dlg.el.querySelector('.db').innerHTML = '<div class="note bad">' + ic('alert') + '<span>' + esc(e.friendly || Mail.errorText(e)) + '</span></div>'; }
  };

  /* ================= Freigaben ================= */
  V.freigaben = {
    title: 'Freigaben', icon: 'shield',
    render() {
      const all = D.all('approvals'); const open = all.filter(a => a.status === 'offen').sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)); const done = all.filter(a => a.status !== 'offen').sort((a, b) => ((b.decidedAt || '') > (a.decidedAt || '') ? 1 : -1)).slice(0, 30);
      let html = '<div class="page-head"><div><h2>Freigabe-Warteschlange</h2><p>Alles, was nach außen geht oder sich nicht rückgängig machen lässt, wartet hier auf deine ausdrückliche Freigabe.</p></div><div class="actions">' + (open.filter(a => a.kind !== 'delete').length > 1 && Mail.available ? '<button class="btn" data-act="approveAll">' + ic('send') + 'Alle E-Mails senden …</button>' : '') + '</div></div>';
      if (!Mail.available) html += '<div class="note warn" style="margin-bottom:14px">' + ic('info') + '<span>Versand über dein Mailprogramm: „Im Mailprogramm öffnen“, senden, danach „Manuell versendet“ klicken. PDF-Anhänge lädst du vorher unter dem Angebot bzw. der Rechnung herunter.</span></div>';
      if (!open.length) html += '<div class="card">' + UI.empty('shield', 'Nichts wartet auf Freigabe', 'Eingangsbestätigungen, Nachfass-Mails, Angebote, Rechnungen, Mahnungen und endgültige Löschungen landen hier, bevor etwas passiert.') + '</div>';
      else html += '<div class="stack">' + open.map(a => {
        const kindL = { email: 'E-Mail', quote: 'Angebot', invoice: 'Rechnung', reminder: 'Mahnwesen', delete: 'Endgültiges Löschen' }[a.kind] || a.kind; const rule = a.ruleId ? D.rules().find(r => r.id === a.ruleId) : null;
        if (a.kind === 'delete') return '<div class="card"><div class="row wrap"><span class="chip bad">' + ic('trash', 's') + kindL + '</span><b class="grow">' + esc(a.title) + '</b><span class="faint small">' + F.ago(a.createdAt) + '</span></div><div class="small muted" style="margin:8px 0">Kann nicht rückgängig gemacht werden. Festgeschriebene Rechnungen sind ausgeschlossen.</div><div class="row wrap"><button class="btn danger sm" data-act="approve" data-id="' + a.id + '" data-mode="delete">' + ic('trash', 's') + 'Endgültig löschen</button><button class="btn sm" data-act="rejectAppr" data-id="' + a.id + '">Abbrechen</button></div></div>';
        return '<div class="card"><div class="row wrap"><span class="chip ' + (a.kind === 'reminder' ? 'warn' : 'info') + '">' + esc(kindL) + '</span><b class="grow" style="min-width:min(100%,200px)">' + esc(a.title || a.subject) + '</b>' + (rule ? '<span class="chip outline" title="Erzeugt durch Regel">' + ic('zap', 's') + esc(rule.name) + '</span>' : '') + '<span class="faint small">' + F.ago(a.createdAt) + '</span></div>' +
          '<dl class="kv small" style="margin-top:10px"><dt>An</dt><dd>' + (a.to ? esc(a.to) : '<span class="chip bad">Empfänger fehlt</span>') + '</dd><dt>Betreff</dt><dd>' + esc(a.subject) + '</dd>' + ((a.attachments || []).length ? '<dt>Anhang</dt><dd>' + a.attachments.map(x => ic('paperclip', 's') + esc(x.type === 'invoice' ? 'Rechnung ' + ((D.get('invoices', x.id) || {}).number || '') + '.pdf' : 'Angebot ' + ((D.get('quotes', x.id) || {}).number || '') + '.pdf')).join(', ') + '</dd>' : '') + (a.refs && a.refs.companyId ? '<dt>Kunde</dt><dd>' + H.co(a.refs.companyId) + '</dd>' : '') + '</dl>' +
          '<div class="xbox" style="margin-top:8px;max-height:180px;overflow:auto">' + esc(a.body) + '</div>' +
          '<div class="row wrap" style="margin-top:10px">' + (Mail.available ? '<button class="btn primary sm" data-act="approve" data-id="' + a.id + '" data-mode="gmail">' + ic('send', 's') + 'Freigeben & über Gmail senden</button><button class="btn sm" data-act="approve" data-id="' + a.id + '" data-mode="draft">' + ic('mail', 's') + 'Als Gmail-Entwurf</button>' : '') +
          (!Mail.available && a.to ? '<a class="btn primary sm" href="mailto:' + encodeURIComponent(a.to) + '?subject=' + encodeURIComponent(a.subject || '') + '&amp;body=' + encodeURIComponent(String(a.body || '').slice(0, 1800)) + '">' + ic('send', 's') + 'Im Mailprogramm öffnen</a>' : '') + '<button class="btn sm" data-act="editAppr" data-id="' + a.id + '">' + ic('pencil', 's') + 'Bearbeiten</button><button class="btn sm" data-act="copyAppr" data-id="' + a.id + '">' + ic('copy', 's') + 'Text kopieren</button><button class="btn sm ghost" data-act="approve" data-id="' + a.id + '" data-mode="manual">' + ic('check', 's') + 'Manuell versendet</button><button class="btn sm ghost danger" data-act="rejectAppr" data-id="' + a.id + '">' + ic('x', 's') + 'Ablehnen</button></div></div>';
      }).join('') + '</div>';
      if (done.length) html += '<div class="card" style="margin-top:16px"><div class="card-h"><h3>Zuletzt entschieden</h3></div><div class="list">' + done.map(a => '<div class="li"><span class="chip ' + (a.status === 'freigegeben' ? 'good' : a.status === 'entwurf' ? 'info' : '') + '">' + esc(a.status) + '</span><span class="grow ellipsis">' + esc(a.title || a.subject) + '</span><span class="faint small">' + esc(a.result || '') + ' · ' + F.ago(a.decidedAt) + '</span></div>').join('') + '</div></div>';
      return html;
    }
  };
  ACT.approve = async el => {
    const a = D.get('approvals', el.dataset.id); const mode = el.dataset.mode;
    if (mode === 'gmail' && !(await UI.confirm({ title: 'Jetzt senden?', html: 'An <b>' + esc(a.to) + '</b>: „' + esc(a.subject) + '“' + ((a.attachments || []).length ? ' inkl. PDF-Anhang' : '') + '.', ok: 'Senden' }))) return;
    if (mode === 'delete' && !(await UI.confirm({ title: 'Endgültig löschen?', text: a.title + ' – das kann nicht rückgängig gemacht werden.', ok: 'Endgültig löschen', danger: true }))) return;
    el.disabled = true; await UI.run(async () => { const r = await O.approve(a.id, mode); UI.toast(r); }); el.disabled = false;
  };
  ACT.rejectAppr = el => UI.run(() => O.rejectApproval(el.dataset.id), 'Abgelehnt – nichts wurde gesendet');
  ACT.copyAppr = async el => { const a = D.get('approvals', el.dataset.id); UI.toast((await F.copy('An: ' + a.to + '\nBetreff: ' + a.subject + '\n\n' + a.body)) ? 'Text kopiert' : 'Kopieren nicht möglich – bitte manuell markieren', { bad: false }); };
  ACT.editAppr = el => { const a = D.get('approvals', el.dataset.id); UI.form({ title: 'Entwurf bearbeiten', size: 'wide', values: a, fields: [{ key: 'to', label: 'An', type: 'email', required: true, full: true }, { key: 'subject', label: 'Betreff', required: true, full: true }, { key: 'body', label: 'Nachricht', type: 'textarea', rows: 12, required: true, full: true }], onSubmit: async v => { await D.update('approvals', a.id, { to: v.to, subject: v.subject, body: v.body }); UI.toast('Entwurf aktualisiert'); } }); };
  ACT.approveAll = async () => {
    const list = D.all('approvals').filter(a => a.status === 'offen' && a.kind !== 'delete' && a.to);
    if (!(await UI.confirm({ title: list.length + ' E-Mails senden?', html: list.map(a => '• ' + esc(a.to) + ': ' + esc(a.subject)).join('<br>'), ok: 'Alle senden' }))) return;
    let ok = 0; for (const a of list) { try { await O.approve(a.id, 'gmail'); ok++; } catch (e) { UI.err(e); break; } } UI.toast(ok + ' von ' + list.length + ' gesendet');
  };

  /* ================= Automatisierungen ================= */
  V.automatisierungen = {
    title: 'Automatisierungen', icon: 'zap',
    render() {
      const st = App.ui('automatisierungen'); const tab = st.tab || 'regeln'; const rules = D.rules();
      const errors = D.autolog.filter(r => r.ok === false).length; const sched = D.all('scheduled');
      let html = '<div class="page-head"><div><h2>Automatisierungen</h2><p>Interne Schritte laufen automatisch, alles Externe landet in der Freigabe. Jeder Lauf wird protokolliert – so ist immer nachvollziehbar, warum etwas passiert ist.</p></div><div class="actions"><button class="btn" data-act="runNow">' + ic('refresh') + 'Zeitpläne jetzt prüfen</button><button class="btn primary" data-act="newRule">' + ic('plus') + 'Regel</button></div></div>';
      html += '<div class="note" style="margin-bottom:14px">' + ic('info') + '<span>Zeitgesteuerte Prüfungen (überfällige Rechnungen, Meilensteine, geplante Aktionen, Gmail) laufen, solange die Zentrale geöffnet ist: beim Start und alle 10 Minuten. Letzter Lauf: ' + (A.lastScheduledRun ? F.ago(A.lastScheduledRun) : 'noch nicht') + '.</span></div>';
      html += '<div class="tabs">' + [['regeln', 'Regeln', rules.length], ['protokoll', 'Protokoll', D.autolog.length], ['geplant', 'Geplant', sched.filter(j => j.status === 'geplant').length], ['fehler', 'Fehler', errors]].map(([k, l, n]) => '<button class="' + (tab === k ? 'on' : '') + '" data-act="setUi" data-view="automatisierungen" data-k="tab" data-v="' + k + '">' + l + (n ? ' <span class="n">' + n + '</span>' : '') + '</button>').join('') + '</div>';
      if (tab === 'regeln') html += '<div class="stack">' + rules.map(r => '<div class="card"><div class="row wrap"><b style="font-size:14px">' + esc(r.name) + '</b><span class="chip outline">' + ic('zap', 's') + esc(L.labelOf(L.TRIGGERS, r.trigger)) + '</span><span class="grow"></span><div class="seg">' + [['aktiv', 'Aktiv'], ['test', 'Testlauf'], ['pausiert', 'Pausiert']].map(([k, l]) => '<button class="' + (r.mode === k ? 'on' : '') + '" data-act="ruleMode" data-id="' + r.id + '" data-v="' + k + '">' + l + '</button>').join('') + '</div></div>' +
        ((r.conditions || []).length ? '<div class="small muted" style="margin-top:8px">Wenn: ' + r.conditions.map(c => esc(condLabel(r.trigger, c))).join(' und ') + '</div>' : '') +
        '<ol class="small" style="margin:8px 0 0;padding-left:20px">' + (r.actions || []).map(a => '<li>' + esc(A.describe(a)) + ((L.ACTIONS.find(x => x.id === a.type) || {}).external && !a.autoSend ? ' <span class="chip info">' + ic('shield', 's') + 'Freigabe</span>' : '') + '</li>').join('') + '</ol>' +
        '<div class="row wrap" style="margin-top:10px"><button class="btn sm" data-act="editRule" data-id="' + r.id + '">' + ic('pencil', 's') + 'Bearbeiten</button><button class="btn sm" data-act="simRule" data-id="' + r.id + '">' + ic('flask', 's') + 'Simulieren</button><span class="faint small">' + D.autolog.filter(x => x.ruleId === r.id).length + ' Läufe protokolliert</span></div></div>').join('') + '</div><div style="margin-top:12px"><button class="btn sm ghost" data-act="resetRules">Standardregeln wiederherstellen</button></div>';
      else if (tab === 'geplant') html += sched.length ? '<div class="card pad0"><div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Ausführen am</th><th>Regel</th><th>Aktion</th><th>Datensatz</th><th>Status</th><th></th></tr></thead><tbody>' + sched.sort((a, b) => (b.runAt > a.runAt ? 1 : -1)).slice(0, 100).map(j => '<tr><td>' + F.date(j.runAt) + '</td><td>' + esc((D.rules().find(r => r.id === j.ruleId) || {}).name || j.ruleId) + '</td><td class="small">' + esc(A.describe(Object.assign({}, j.action, { delayWorkdays: 0 }))) + '</td><td class="small">' + esc(D.titleOf(j.col, D.get(j.col, j.recordId))) + '</td><td><span class="chip ' + (j.status === 'erledigt' ? 'good' : j.status === 'fehler' ? 'bad' : j.status === 'abgebrochen' ? '' : 'info') + '">' + esc(j.status) + '</span>' + (j.result ? '<div class="faint tiny">' + esc(j.result) + '</div>' : '') + '</td><td>' + (j.status === 'geplant' ? '<button class="btn xs" data-act="cancelJob" data-id="' + j.id + '">Abbrechen</button>' : '') + '</td></tr>').join('') + '</tbody></table></div></div>' : '<div class="card">' + UI.empty('clock', 'Keine geplanten Aktionen', 'Verzögerte Aktionen (z. B. Nachfassen nach 5 Werktagen) erscheinen hier.') + '</div>';
      else {
        const runs = tab === 'fehler' ? D.autolog.filter(r => r.ok === false) : D.autolog;
        html += runs.length ? '<div class="card pad0"><div class="list">' + runs.slice(0, 150).map(r => '<div class="li" style="padding:10px 14px;align-items:flex-start"><span style="color:' + (r.ok === false ? 'var(--bad)' : r.mode === 'test' ? 'var(--warn)' : 'var(--good)') + '">' + ic(r.ok === false ? 'xCircle' : r.mode === 'test' ? 'flask' : 'circleCheck') + '</span><div class="grow"><div class="row wrap"><b>' + esc(r.rule) + '</b><span class="chip outline">' + esc(L.labelOf(L.TRIGGERS, String(r.trigger).split(' ')[0]) + (String(r.trigger).includes(' ') ? ' ' + String(r.trigger).split(' ').slice(1).join(' ') : '')) + '</span><span class="grow"></span><span class="faint small">' + F.dateTime(r.at) + '</span></div><div class="small muted">' + esc(r.title || '') + (r.conditions === false ? ' · Bedingungen nicht erfüllt' : '') + '</div><ul class="small" style="margin:4px 0 0;padding-left:18px">' + (r.actions || []).map(a => '<li' + (a.ok === false ? ' style="color:var(--bad)"' : '') + '>' + esc(a.info || a.type) + '</li>').join('') + '</ul></div></div>').join('') + '</div></div>' : '<div class="card">' + UI.empty('history', tab === 'fehler' ? 'Keine Fehler' : 'Noch keine Läufe', 'Sobald eine Regel ausgelöst wird, steht hier was sie getan hat und warum.') + '</div>';
      }
      return html;
    }
  };
  const condLabel = (trigger, c) => { const ent = (L.TRIGGERS.find(t => t.id === trigger) || {}).entity; const f = (L.COND_FIELDS[ent] || []).find(x => x[0] === c.field); const op = (L.OPS.find(o => o[0] === c.op) || [])[1] || c.op; const val = f && f[2] ? L.labelOf(f[2], c.value) : c.value; return (f ? f[1] : c.field) + ' ' + op + (['empty', 'notempty'].includes(c.op) ? '' : ' „' + val + '“'); };
  const saveRules = rules => D.setMeta('automations', { rules });
  ACT.ruleMode = el => UI.run(() => saveRules(D.rules().map(r => (r.id === el.dataset.id ? Object.assign({}, r, { mode: el.dataset.v }) : r))), 'Regel: ' + el.textContent);
  ACT.resetRules = async () => { if (await UI.confirm({ title: 'Standardregeln wiederherstellen?', text: 'Eigene Regeln und Änderungen gehen verloren.', ok: 'Wiederherstellen', danger: true })) UI.run(() => saveRules(L.DEFAULT_RULES), 'Standardregeln aktiv'); };
  ACT.runNow = el => { el.disabled = true; A.runScheduled().then(() => { el.disabled = false; UI.toast('Zeitgesteuerte Prüfungen ausgeführt'); App.render(); }); };
  ACT.cancelJob = el => UI.run(() => D.update('scheduled', el.dataset.id, { status: 'abgebrochen', result: 'Manuell abgebrochen' }, { silent: true }), 'Abgebrochen');
  ACT.newRule = () => ruleEditor(null);
  ACT.editRule = el => ruleEditor(D.rules().find(r => r.id === el.dataset.id));
  ACT.simRule = el => {
    const rule = D.rules().find(r => r.id === el.dataset.id); const ent = (L.TRIGGERS.find(t => t.id === rule.trigger) || {}).entity;
    const col = { inquiry: 'inquiries', deal: 'deals', quote: 'quotes', invoice: 'invoices', project: 'projects', task: 'tasks', company: 'companies' }[ent];
    if (!col) return UI.toast('Diese Regel hat keinen einzelnen Datensatz als Auslöser.', { bad: true });
    const recs = D.all(col).slice(-40).reverse(); if (!recs.length) return UI.toast('Keine passenden Datensätze zum Simulieren vorhanden.', { bad: true });
    UI.form({ title: 'Simulation: ' + rule.name, size: 'wide', submit: 'Simulieren', values: { rec: recs[0].id }, fields: [{ key: 'rec', label: 'Mit Datensatz', type: 'select', options: recs.map(x => ({ id: x.id, label: D.titleOf(col, x) || x.id })), full: true }, { type: 'html', full: true, html: '<div id="sim-out" class="small"></div>' }],
      intro: '<div class="note" style="margin-bottom:10px">' + ic('flask') + '<span>Testlauf-Modus: zeigt, was die Regel tun würde – es wird nichts ausgeführt.</span></div>',
      onSubmit: async (v, f) => { const r = await A.simulate(rule, col, v.rec); f.querySelector('#sim-out').innerHTML = '<div class="card flat tight">' + r.lines.map(esc).join('<br>') + '</div>'; return false; } });
  };
  function ruleEditor(rule) {
    const r = JSON.parse(JSON.stringify(rule || { id: 'R' + D.newId(), name: 'Neue Regel', trigger: 'deal.stageChanged', mode: 'test', conditions: [], actions: [{ type: 'createTask', title: 'Aufgabe', dueWorkdays: 1, priority: 'mittel' }] }));
    const tpls = D.emailTemplates();
    const paramInput = (a, ai, p) => {
      const n = 'a' + ai + '_' + p;
      if (p === 'title') return '<input class="in sm" name="' + n + '" value="' + esc(a.title || '') + '" placeholder="Titel – Platzhalter z. B. {{name}}">';
      if (p === 'dueWorkdays') return '<label class="small row gap-4">fällig in<input class="in sm num" style="width:64px" type="number" min="0" name="' + n + '" value="' + (a.dueWorkdays ?? 1) + '">Werktagen</label>';
      if (p === 'priority') return '<select class="in sm" style="width:auto" name="' + n + '">' + UI.optList(L.PRIORITIES, a.priority || 'mittel') + '</select>';
      if (p === 'stage') return '<select class="in sm" style="width:auto" name="' + n + '">' + UI.optList(L.STAGES, a.stage) + '</select>';
      if (p === 'status') return '<select class="in sm" style="width:auto" name="' + n + '">' + UI.optList(L.COMPANY_STATUS, a.status) + '</select>';
      if (p === 'template') return '<select class="in sm" style="width:auto" name="' + n + '">' + UI.optList(Object.keys(tpls).map(k => ({ id: k, label: tpls[k].name })), a.template) + '</select>';
      if (p === 'percent') return '<label class="small row gap-4"><input class="in sm num" style="width:64px" type="number" name="' + n + '" value="' + (a.percent || 50) + '">%</label>';
      return '';
    };
    const draw = el => {
      const ent = (L.TRIGGERS.find(t => t.id === r.trigger) || {}).entity; const fields = L.COND_FIELDS[ent] || [];
      el.querySelector('#re-conds').innerHTML = (r.conditions.length ? r.conditions.map((c, ci) => { const f = fields.find(x => x[0] === c.field); return '<div class="row wrap" style="margin-bottom:6px"><select class="in sm" style="width:auto" data-c="' + ci + ':field">' + UI.optList(fields.map(x => [x[0], x[1]]), c.field) + '</select><select class="in sm" style="width:auto" data-c="' + ci + ':op">' + UI.optList(L.OPS, c.op) + '</select>' + (['empty', 'notempty'].includes(c.op) ? '' : f && f[2] ? '<select class="in sm" style="width:auto" data-c="' + ci + ':value">' + UI.optList(f[2], c.value) + '</select>' : '<input class="in sm" style="width:160px" data-c="' + ci + ':value" value="' + esc(c.value || '') + '">') + '<button class="btn xs icon" data-delc="' + ci + '">' + ic('x', 's') + '</button></div>'; }).join('') : '<div class="faint small" style="margin-bottom:6px">Keine Bedingungen – die Regel greift bei jedem Auslöser.</div>') + (fields.length ? '<button class="btn xs" data-addc>' + ic('plus', 's') + 'Bedingung</button>' : '');
      el.querySelector('#re-acts').innerHTML = r.actions.map((a, ai) => { const def = L.ACTIONS.find(x => x.id === a.type) || { params: [] }; return '<div class="card flat tight" style="margin-bottom:8px"><div class="row wrap"><b class="small">' + (ai + 1) + '.</b><select class="in sm" style="width:auto" data-a="' + ai + ':type">' + UI.optList(L.ACTIONS.map(x => [x.id, x.label]), a.type) + '</select>' + def.params.map(p => paramInput(a, ai, p)).join('') + '<span class="grow"></span><label class="small row gap-4">nach<input class="in sm num" style="width:56px" type="number" min="0" name="a' + ai + '_delayWorkdays" value="' + (a.delayWorkdays || 0) + '">Werkt.</label><button class="btn xs icon" data-dela="' + ai + '">' + ic('x', 's') + '</button></div>' +
        (def.external ? '<div class="small" style="margin-top:6px">' + ic('shield', 's') + ' Geht in die Freigabe-Warteschlange.' + (a.type === 'draftEmail' ? ' <label class="toggle" style="margin-left:8px"><input type="checkbox" name="a' + ai + '_autoSend" ' + (a.autoSend ? 'checked' : '') + '><span class="sw"></span><span style="color:var(--warn)">Automatisch senden (nur für risikoarme Nachrichten, z. B. Eingangsbestätigung)</span></label>' : '') + '</div>' : '') + (a.onlyIf ? '<div class="faint tiny" style="margin-top:4px">Nur wenn ' + esc(a.onlyIf.field) + ' = ' + esc(a.onlyIf.value) + ' (bei Ausführung erneut geprüft)</div>' : '') + '</div>'; }).join('') + '<button class="btn xs" data-adda>' + ic('plus', 's') + 'Aktion</button>';
    };
    const sync = el => {
      r.name = el.querySelector('[name="re_name"]').value; r.trigger = el.querySelector('[name="re_trigger"]').value; r.mode = el.querySelector('[name="re_mode"]').value;
      el.querySelectorAll('[data-c]').forEach(i => { const [ci, k] = i.dataset.c.split(':'); if (r.conditions[ci]) r.conditions[ci][k] = i.value; });
      r.actions.forEach((a, ai) => {
        const ty = el.querySelector('[data-a="' + ai + ':type"]'); if (ty && ty.value !== a.type) { r.actions[ai] = { type: ty.value }; return; }
        for (const p of ['title', 'dueWorkdays', 'priority', 'stage', 'status', 'template', 'percent', 'delayWorkdays', 'autoSend']) { const i = el.querySelector('[name="a' + ai + '_' + p + '"]'); if (i) a[p] = i.type === 'checkbox' ? i.checked : (['dueWorkdays', 'percent', 'delayWorkdays'].includes(p) ? Number(i.value) || 0 : i.value); }
      });
    };
    UI.dialog({
      title: rule ? 'Regel bearbeiten' : 'Neue Regel', size: 'xwide', sticky: true,
      body: '<div class="form"><div class="field"><label>Name</label><input class="in" name="re_name" value="' + esc(r.name) + '"></div><div class="field"><label>Modus</label><select class="in" name="re_mode">' + UI.optList([['aktiv', 'Aktiv'], ['test', 'Testlauf (nur protokollieren)'], ['pausiert', 'Pausiert']], r.mode) + '</select></div><div class="field full"><label>Auslöser</label><select class="in" name="re_trigger">' + UI.optList(L.TRIGGERS.map(t => [t.id, t.label]), r.trigger) + '</select></div></div>' +
        '<div class="nav-group" style="margin:14px 0 6px">Bedingungen</div><div id="re-conds"></div><div class="nav-group" style="margin:14px 0 6px">Aktionen (in Reihenfolge)</div><div id="re-acts"></div><div class="faint small" style="margin-top:8px">Platzhalter in Titeln: {{name}}, {{title}}, {{number}}, {{firma}}, {{subject}}, {{projekt}}.</div>',
      foot: (rule && !rule.builtin ? '<button class="btn danger left" data-del>' + ic('trash') + 'Regel löschen</button>' : '') + '<button class="btn" data-close>Abbrechen</button><button class="btn primary" data-save>Speichern</button>',
      onMount: (el, close) => {
        draw(el);
        el.addEventListener('change', e => { if (e.target.name === 're_trigger') { sync(el); r.conditions = []; draw(el); } else if (e.target.dataset.a || (e.target.dataset.c && e.target.dataset.c.endsWith(':field')) || (e.target.dataset.c && e.target.dataset.c.endsWith(':op'))) { sync(el); draw(el); } });
        el.addEventListener('click', e => {
          const b = e.target.closest('button'); if (!b) return; if (!(b.hasAttribute('data-addc') || b.dataset.delc || b.hasAttribute('data-adda') || b.dataset.dela)) return; sync(el);
          const ent = (L.TRIGGERS.find(t => t.id === r.trigger) || {}).entity; const fields = L.COND_FIELDS[ent] || [];
          if (b.hasAttribute('data-addc')) r.conditions.push({ field: fields[0][0], op: 'eq', value: fields[0][2] ? fields[0][2][0].id : '' });
          if (b.dataset.delc) r.conditions.splice(Number(b.dataset.delc), 1);
          if (b.hasAttribute('data-adda')) r.actions.push({ type: 'createTask', title: '', dueWorkdays: 1, priority: 'mittel' });
          if (b.dataset.dela) r.actions.splice(Number(b.dataset.dela), 1);
          draw(el);
        });
        el.querySelector('[data-save]').onclick = async () => {
          sync(el); if (!r.name.trim()) return UI.toast('Bitte einen Namen angeben', { bad: true });
          if (r.actions.some(a => a.autoSend) && !(await UI.confirm({ title: 'Automatischen Versand erlauben?', text: 'E-Mails dieser Regel werden ohne Freigabe über Gmail gesendet. Nur für risikoarme Nachrichten verwenden.', ok: 'Erlauben' }))) return;
          const list = D.rules().slice(); const i = list.findIndex(x => x.id === r.id); if (i >= 0) list[i] = r; else list.push(r);
          await UI.run(() => saveRules(list), 'Regel gespeichert'); close(true);
        };
        const del = el.querySelector('[data-del]'); if (del) del.onclick = async () => { if (await UI.confirm({ title: 'Regel löschen?', ok: 'Löschen', danger: true })) { await UI.run(() => saveRules(D.rules().filter(x => x.id !== r.id)), 'Regel gelöscht'); close(true); } };
      }
    });
  }

  /* ================= KI-Assistent ================= */
  const chat = { turns: [], busy: false, ctl: null };
  V.ki = {
    title: 'KI-Assistent', icon: 'sparkles',
    render() {
      let html = '<div class="page-head"><div><h2>KI-Assistent</h2><p>Die KI arbeitet mit deinen echten Daten – nur lesend und mit internen Aktionen. Externe Nachrichten entstehen nur als Entwurf in der Freigabe.</p></div><div class="actions"><button class="btn" data-act="aiReset">' + ic('restore') + 'Neues Gespräch</button></div></div>';
      if (!AI.available) return html + '<div class="card">' + UI.empty('sparkles', 'KI-Modul nicht eingerichtet', 'Die KI ist ein optionales Zusatzmodul. Sie braucht eine eigene Server-Funktion mit API-Schlüssel (Anleitung im Repository: supabase/functions/zentrale-ai). Alle anderen Funktionen der Zentrale laufen ohne KI.') + '</div>';
      const quick = [['Was ist heute am wichtigsten?', 'Was sind heute meine 5 wichtigsten Aufgaben und warum? Berücksichtige überfällige Aufgaben, neue Anfragen, Freigaben und Projektrisiken.'], ['Leads priorisieren', 'Priorisiere meine offenen Leads und neuen Anfragen. Begründe kurz und nenne je Lead den nächsten Schritt.'], ['Projektverzögerungen', 'Welche Projekte sind gefährdet? Erkenne Verzögerungen und schlage Maßnahmen vor.'], ['Umsatz analysieren', 'Analysiere meine Umsatz- und Zahlungsentwicklung der letzten 12 Monate. Was fällt auf? Unterscheide Umsatz, Zahlungseingang und Forderungen.'], ['Business verbessern', 'Mach mir 5 konkrete Verbesserungsvorschläge für mein Webdesign-Business auf Basis meiner Daten (Vertrieb, Preise, wiederkehrende Einnahmen, Prozesse).']];
      html += '<div class="grid g-main"><div class="card" style="display:flex;flex-direction:column;min-height:56vh"><div id="chat" class="stack" style="flex:1;overflow-y:auto;max-height:62vh;padding:4px">' +
        (chat.turns.length ? chat.turns.map(t => '<div class="' + (t.role === 'user' ? 'row' : '') + '" style="' + (t.role === 'user' ? 'justify-content:flex-end' : '') + '"><div style="max-width:88%;padding:10px 12px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere;' + (t.role === 'user' ? 'background:var(--accent);color:var(--accent-ink)' : 'background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line)') + '">' + esc(t.content) + '</div></div>').join('') : '<div class="empty"><div class="ico">' + ic('sparkles', 'l') + '</div><h4>Frag deine Zentrale</h4><p>z. B. „Fasse die Kommunikation mit Kunde X zusammen“ oder „Lege für morgen eine Aufgabe an: Angebot Krause nachfassen“.</p></div>') +
        (chat.busy ? '<div id="chat-live" style="padding:10px 12px;border-radius:12px;background:var(--panel-2);box-shadow:inset 0 0 0 1px var(--line);white-space:pre-wrap" class="muted">Denkt nach …</div>' : '') + '</div>' +
        '<form class="row" data-chat style="margin-top:10px"><textarea class="in" name="m" rows="2" style="min-height:44px" placeholder="Nachricht an die KI … (Enter senden, Umschalt+Enter neue Zeile)"' + (chat.busy ? ' disabled' : '') + '></textarea>' + (chat.busy ? '<button class="btn" type="button" data-act="aiStop">' + ic('stop', 's') + 'Stopp</button>' : '<button class="btn primary">' + ic('send', 's') + '</button>') + '</form></div>' +
        '<div class="stack"><div class="card"><div class="card-h"><h3>Schnellstart</h3></div><div class="stack tight">' + quick.map(([l, p]) => '<button class="btn" style="justify-content:flex-start" data-act="aiQuick" data-p="' + esc(p) + '">' + ic('sparkles', 's') + esc(l) + '</button>').join('') + '</div></div>' +
        '<div class="card small muted"><b style="color:var(--ink)">Was die KI darf</b><ul style="padding-left:18px;margin:6px 0 0"><li>Deine Daten lesen (Kunden, Deals, Projekte, Aufgaben, Finanzen)</li><li>Aufgaben anlegen (intern, rückgängig machbar)</li><li>E-Mail-Entwürfe in die Freigabe legen</li><li><b>Nicht:</b> senden, löschen, Angebote verschicken</li></ul><div style="margin-top:6px">Die Anfragen laufen über die eigene KI-Funktion auf dem Server der Zentrale.</div></div></div></div>';
      return html;
    },
    mount(el) {
      const box = el.querySelector('#chat'); if (box) box.scrollTop = box.scrollHeight;
      const f = el.querySelector('[data-chat]'); if (!f) return;
      f.addEventListener('submit', e => { e.preventDefault(); send(f.m.value); });
      f.m.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(f.m.value); } });
    }
  };
  const aiTools = () => [
    { name: 'getOverview', description: 'Liefert eine kompakte Übersicht des Unternehmens: Kennzahlen, offene Deals, neue Anfragen, Projekte mit Ampel, überfällige Aufgaben, Forderungen, Umsatz 12 Monate.', execute: () => AI.businessContext() },
    { name: 'search', description: 'Durchsucht Kunden, Kontakte, Deals, Projekte, Angebote, Rechnungen und Aufgaben nach einem Begriff. Gibt Treffer mit id und Typ zurück.', inputSchema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] }, execute: i => App.search(String(i.q || '')).slice(0, 15).map(r => ({ typ: r.type, id: r.id, titel: r.title, info: r.meta })) },
    { name: 'getCustomer', description: 'Liefert eine Kundenakte (Stammdaten, Kontakte, Deals, Projekte, Rechnungsstatus, letzte 25 Verlaufseinträge) zu einer Kunden-id.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, execute: i => { const c = D.get('companies', String(i.id)); if (!c) throw new Error('Kunde nicht gefunden'); return { kunde: { name: c.name, status: c.status, branche: c.industry, ort: (c.address || {}).city, notizen: c.notes }, kontakte: D.all('contacts').filter(x => x.companyId === c.id).map(x => ({ name: F.personName(x), email: x.email, rolle: x.role })), deals: D.all('deals').filter(x => x.companyId === c.id).map(d => ({ titel: d.title, phase: L.stageLabel(d.stage), wert: d.value })), projekte: D.all('projects').filter(x => x.companyId === c.id).map(p => ({ name: p.name, status: p.status, deadline: p.deadline })), rechnungen: D.all('invoices').filter(x => x.companyId === c.id).map(x => ({ nr: x.number, status: x.status, brutto: L.totals(x).gross, offen: L.openAmount(x) })), verlauf: H.timelineItems(x => x.companyId === c.id).slice(0, 25).map(x => ({ datum: x.at.slice(0, 10), was: x.t, text: x.x ? String(x.x).slice(0, 300) : '' })) }; } },
    { name: 'createTask', description: 'Legt eine interne Aufgabe an (rückgängig machbar). Optional mit Kunden- oder Projekt-id.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, dueInWorkdays: { type: 'number' }, companyId: { type: 'string' }, projectId: { type: 'string' }, priority: { type: 'string', enum: ['hoch', 'mittel', 'niedrig'] } }, required: ['title'] }, execute: async i => { const t = await D.create('tasks', { title: String(i.title).slice(0, 200), due: L.addWorkdays(today(), Number(i.dueInWorkdays) || 0, S().state), priority: ['hoch', 'mittel', 'niedrig'].includes(i.priority) ? i.priority : 'mittel', status: 'offen', kind: 'task', companyId: D.get('companies', i.companyId) ? i.companyId : null, projectId: D.get('projects', i.projectId) ? i.projectId : null, source: 'KI-Assistent' }); return { ok: true, id: t.id, faellig: t.due }; } },
    { name: 'draftEmail', description: 'Legt einen E-Mail-Entwurf in die Freigabe-Warteschlange. Es wird NICHT gesendet – der Nutzer prüft und gibt frei.', inputSchema: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, companyId: { type: 'string' } }, required: ['to', 'subject', 'body'] }, execute: async i => { await O.queueEmail({ title: 'KI-Entwurf: ' + i.subject, to: String(i.to), subject: String(i.subject), body: String(i.body), refs: { companyId: D.get('companies', i.companyId) ? i.companyId : null } }); return { ok: true, hinweis: 'Entwurf liegt in der Freigabe' }; } }
  ];
  async function send(text) {
    text = String(text || '').trim(); if (!text || chat.busy) return;
    chat.turns.push({ role: 'user', content: text }); chat.busy = true; App.render();
    const intro = AI.SYSTEM + '\n\nHeute ist ' + today() + '. ' + (AI.tools ? 'Nutze die Werkzeuge, um Daten abzurufen; rufe getOverview auf, wenn du einen Überblick brauchst.' : 'Hier ist der aktuelle Datenstand:\n' + JSON.stringify(AI.businessContext()).slice(0, 60000));
    const turns = [{ role: 'user', content: intro }].concat(chat.turns.slice(-12));
    chat.ctl = new AbortController();
    try {
      const opts = { cache: false, signal: chat.ctl.signal, onText: x => { const live = document.getElementById('chat-live'); if (live) { live.textContent = x.text; live.classList.remove('muted'); } } };
      if (AI.tools) { opts.tools = aiTools(); delete opts.cache; }
      const r = await AI.ask(turns, opts); chat.turns.push({ role: 'assistant', content: r.text + (r.truncated ? '\n\n(gekürzt)' : '') });
    } catch (e) { if (e && e.text) chat.turns.push({ role: 'assistant', content: e.text + '\n\n(unterbrochen)' }); if (!e || e.code !== 'cancelled') UI.toast(AI.errorText(e), { bad: true }); }
    finally { chat.busy = false; App.render(); }
  }
  ACT.aiQuick = el => send(el.dataset.p);
  ACT.aiStop = () => { if (chat.ctl) chat.ctl.abort(); };
  ACT.aiReset = () => { chat.turns = []; App.render(); };

  /* ================= Einstellungen ================= */
  V.einstellungen = {
    title: 'Einstellungen', icon: 'settings',
    render() {
      const st = App.ui('einstellungen'); const tab = st.tab || 'firma'; const s = S();
      let html = '<div class="page-head"><div><h2>Einstellungen</h2><p>Alles über die Oberfläche – keine Konfigurationsdateien.</p></div></div><div class="tabs">' + [['firma', 'Firma & Rechnungen'], ['vertrieb', 'Vertrieb'], ['vorlagen', 'E-Mail-Vorlagen'], ['website', 'Website & Gmail'], ['daten', 'Daten & Sicherung'], ['darstellung', 'Darstellung']].map(([k, l]) => '<button class="' + (tab === k ? 'on' : '') + '" data-act="setUi" data-view="einstellungen" data-k="tab" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
      if (tab === 'firma') html += '<div class="card"><form class="form" data-settings="firma">' + firmaFields().map(f => UI.fieldHtml(f, s)).join('') + '</form><div class="row" style="margin-top:14px"><span class="grow faint small">Diese Angaben erscheinen auf Angeboten und Rechnungen (Pflichtangaben). Keine Steuerberatung.</span><button class="btn primary" data-act="saveSettings" data-form="firma">Speichern</button></div></div>';
      else if (tab === 'vertrieb') html += '<div class="card"><div class="card-h"><h3>Wahrscheinlichkeiten je Pipeline-Phase</h3><span class="chip warn">Annahmen</span></div><p class="muted small mt-0">Grundlage für die gewichtete Pipeline und die Prognose. Passe sie an deine Erfahrungswerte an.</p><form class="form" data-settings="vertrieb">' + L.OPEN_STAGES.map(id => UI.fieldHtml({ key: 'stageProb.' + id, label: L.stageLabel(id) + ' (%)', type: 'number', placeholder: String(L.STAGES.find(x => x.id === id).prob) }, s)).join('') + '</form><div class="row" style="margin-top:14px"><span class="grow"></span><button class="btn primary" data-act="saveSettings" data-form="vertrieb">Speichern</button></div></div>';
      else if (tab === 'vorlagen') { const t = D.emailTemplates(); html += '<div class="card"><p class="muted small mt-0">Platzhalter: {{name}}, {{firma}}, {{agentur}}, {{absender}}, {{number}}, {{betrag}}, {{offen}}, {{faellig}}, {{datum}}, {{neueFrist}}, {{gueltig}}, {{projekt}}, {{deadline}}, {{erledigt}}, {{naechstes}}, {{zulieferung}}</p><div class="list">' + Object.keys(t).map(k => '<div class="li click" data-act="editTpl" data-k="' + k + '"><span class="grow"><b>' + esc(t[k].name) + '</b><div class="m ellipsis">' + esc(t[k].subject) + '</div></span>' + ic('chevR') + '</div>').join('') + '</div></div>'; }
      else if (tab === 'website') html += websiteTab(s);
      else if (tab === 'daten') html += dataTab();
      else html += '<div class="card"><div class="card-h"><h3>Erscheinungsbild</h3></div><div class="seg">' + [['system', 'System'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([k, l]) => '<button class="' + (App.theme() === k ? 'on' : '') + '" data-act="setTheme" data-v="' + k + '">' + l + '</button>').join('') + '</div><p class="faint small">Wird nur in diesem Browser gemerkt.</p></div>';
      return html;
    }
  };
  const firmaFields = () => [
    { type: 'section', label: 'Unternehmen' }, { key: 'businessName', label: 'Firmen-/Agenturname', required: true }, { key: 'ownerName', label: 'Inhaber/in (Absender)' },
    { key: 'address.street', label: 'Straße & Nr.' }, { key: 'address.zip', label: 'PLZ' }, { key: 'address.city', label: 'Ort' }, { key: 'state', label: 'Bundesland (Feiertage)', type: 'select', options: L.STATES },
    { key: 'email', label: 'E-Mail', type: 'email' }, { key: 'phone', label: 'Telefon', type: 'tel' }, { key: 'website', label: 'Website' },
    { type: 'section', label: 'Steuer' }, { key: 'taxMode', label: 'Besteuerung', type: 'select', options: [['klein', 'Kleinunternehmer (§ 19 UStG)'], ['regel', 'Regelbesteuerung (USt. ausweisen)']], empty: '– bitte festlegen –', help: 'Im Zweifel mit dem Steuerberater klären.' }, { key: 'taxRate', label: 'Standard-USt.-Satz %', type: 'number' },
    { key: 'taxNumber', label: 'Steuernummer' }, { key: 'vatId', label: 'USt-IdNr.' }, { key: 'taxReservePct', label: 'Steuerrücklage % (mit Steuerberater festlegen)', type: 'number' },
    { type: 'section', label: 'Bankverbindung & Konditionen' }, { key: 'bank.holder', label: 'Kontoinhaber' }, { key: 'bank.iban', label: 'IBAN' }, { key: 'bank.bic', label: 'BIC' }, { key: 'bank.bankName', label: 'Bank' },
    { key: 'paymentTermDays', label: 'Zahlungsziel (Tage)', type: 'number' }, { key: 'quoteValidDays', label: 'Angebotsgültigkeit (Tage)', type: 'number' },
    { key: 'invoicePrefix', label: 'Präfix Rechnungsnummer', help: 'z. B. RE → RE-2026-0001' }, { key: 'quotePrefix', label: 'Präfix Angebotsnummer' },
    { key: 'reminderAfterDays', label: 'Zahlungserinnerung nach (Tagen Verzug)', type: 'number' }, { key: 'dunningStepDays', label: 'Abstand Mahnstufen (Tage)', type: 'number' }
  ];
  ACT.saveSettings = el => {
    const form = document.querySelector('[data-settings="' + el.dataset.form + '"]');
    const fields = el.dataset.form === 'firma' ? firmaFields() : L.OPEN_STAGES.map(id => ({ key: 'stageProb.' + id, type: 'number' }));
    const v = UI.readForm(form, fields, {}); if (el.dataset.form === 'firma' && !UI.validate(form, fields, v)) return;
    if (v.bank && v.bank.iban) v.bank.iban = v.bank.iban.replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
    UI.run(async () => { await D.setMeta('settings', Object.assign(v, el.dataset.form === 'firma' ? { setupDone: true } : {})); }, 'Einstellungen gespeichert');
  };
  ACT.settingsTab = (el, e) => { if (e) e.preventDefault(); App.ui('einstellungen').tab = el.dataset.tab; App.saveUi(); App.go('einstellungen'); };
  ACT.editTpl = el => { const k = el.dataset.k; const t = D.emailTemplates()[k]; UI.form({ title: 'Vorlage: ' + t.name, size: 'wide', values: t, fields: [{ key: 'name', label: 'Name', required: true, full: true }, { key: 'subject', label: 'Betreff', required: true, full: true }, { key: 'body', label: 'Text', type: 'textarea', rows: 12, required: true, full: true }], footLeft: L.DEFAULT_EMAIL_TEMPLATES[k] ? '<button class="btn ghost sm" data-reset>Standard</button>' : '', onMount: (f, close) => { const b = f.querySelector('[data-reset]'); if (b) b.onclick = async () => { const map = Object.assign({}, (D.meta.emailTemplates || {}).map || {}); delete map[k]; await UI.run(() => D.replaceMeta('emailTemplates', { map }), 'Standard wiederhergestellt'); close(true); }; }, onSubmit: async v => { const map = Object.assign({}, (D.meta.emailTemplates || {}).map || {}, { [k]: v }); await D.setMeta('emailTemplates', { map }); UI.toast('Vorlage gespeichert'); } }); };
  ACT.setTheme = el => { App.setTheme(el.dataset.v); App.render(); };
  function websiteTab(s) {
    const sample = 'Betreff: Projektanfrage: Relaunch – Max Mustermann\n\nProjekt: Relaunch\nBudgetrahmen: 2.500–5.000 €\nZeitrahmen: In 1–3 Monaten\nName: Max Mustermann\nUnternehmen: Muster GmbH\nE-Mail: max@muster.example\nTelefon: 0341 123456\nWebsite: www.muster.example\n\nUnsere Website ist veraltet und bringt kaum Anfragen.';
    const sys = D.meta.system || {}; const ok = window.Runtime && Runtime.configured;
    return '<div class="grid g2"><div class="card"><div class="card-h"><h3>Kontaktformular → Zentrale</h3><span class="chip ' + (ok && !(window.Inbox && Inbox.error) ? 'good' : 'warn') + '">' + (ok ? (window.Inbox && Inbox.error ? 'Fehler beim Abruf' : 'verbunden') : 'nicht eingerichtet') + '</span></div>' +
      '<p class="small muted mt-0">Das Kontaktformular auf linua.de speichert jede Anfrage in einem geschützten Eingang deines Servers (nur Einfügen möglich, kein Lesen von außen). Die Zentrale holt neue Anfragen beim Öffnen, alle 2 Minuten und auf Knopfdruck ab, legt sie im CRM an und löscht sie danach aus dem Eingang.</p>' +
      '<dl class="kv small"><dt>Letzter Abruf</dt><dd>' + (window.Inbox && Inbox.lastRun ? F.dateTime(Inbox.lastRun) : 'in dieser Sitzung noch nicht') + '</dd><dt>Zuletzt übernommen</dt><dd>' + (sys.lastInboxImportAt ? F.dateTime(sys.lastInboxImportAt) + ' (' + (sys.lastInboxImportCount || 0) + ')' : 'noch keine') + '</dd></dl>' +
      '<button class="btn" data-act="inboxPull" style="margin-top:10px">' + ic('refresh') + 'Jetzt abrufen</button><div class="divider"></div>' +
      '<ol class="small" style="padding-left:18px;margin:0"><li>Besucher sendet das Formular auf der Website ab (mit Spam-Schutz und Begrenzung der Anfragen je Zeitraum).</li><li>Die Anfrage liegt im Eingang des Servers (EU) – bis die Zentrale sie abholt, höchstens 60 Tage.</li><li>Workflow A: Dubletten-Check → Kundenakte → Lead in „Neue Anfrage“ → Kategorie & Priorität → Aufgabe & Wiedervorlage → Benachrichtigung → Eingangsbestätigung als Entwurf in der Freigabe.</li></ol>' +
      '<div class="note" style="margin-top:12px">' + ic('info') + '<span>Fällt der Server aus, öffnet das Formular automatisch das Mailprogramm des Besuchers mit derselben Anfrage an hallo@linua.de – es geht keine Anfrage verloren.</span></div></div>' +
      '<div class="card"><div class="card-h"><h3>Format der Anfragen</h3></div><p class="small muted mt-0">Website-Formular und Zentrale nutzen dasselbe feste Format: Betreff „Projektanfrage: …“, Felder als „Feld: Wert“-Zeilen. Daran erkennt die Zentrale Projektart, Budget und Dringlichkeit.</p>' +
      '<textarea class="in" rows="11" readonly id="fmt">' + esc(sample) + '</textarea><div class="row" style="margin-top:8px"><button class="btn sm" data-act="copyFmt">' + ic('copy', 's') + 'Kopieren</button><button class="btn sm" data-act="testParse">' + ic('flask', 's') + 'Erkennung testen</button></div></div></div>';
  }
  ACT.toggleSetting = el => UI.run(async () => { const k = el.dataset.k; const on = el.checked; if (on) { await Mail.init(); if (!Mail.available) { el.checked = false; throw { message: 'Das E-Mail-Modul ist nicht eingerichtet.' }; } await Mail.search('in:inbox', 1); } await D.setMeta('settings', { [k]: on }); if (on) A.runScheduled(); }, el.checked ? 'Aktiviert' : 'Deaktiviert');
  ACT.saveKw = () => UI.run(() => D.setMeta('settings', { inquirySubjectKeyword: document.getElementById('kw').value.trim() || 'Projektanfrage' }), 'Gespeichert');
  ACT.copyFmt = async () => UI.toast((await F.copy(document.getElementById('fmt').value)) ? 'Kopiert' : 'Kopieren nicht möglich');
  ACT.testParse = () => { const r = L.parseInquiryText(document.getElementById('fmt').value); const c = L.categorizeInquiry(r, D.nowIso()); UI.dialog({ title: 'Erkennungstest (nichts gespeichert)', body: '<dl class="kv">' + Object.entries(r).filter(([, v]) => v).map(([k, v]) => '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>').join('') + '<dt>Projektart</dt><dd>' + esc(L.labelOf(L.PROJECT_TYPES, c.projectType)) + '</dd><dt>Budget</dt><dd>' + esc(L.labelOf(L.BUDGET_BANDS, c.budgetBand)) + '</dd><dt>Dringlichkeit</dt><dd>' + esc(c.urgency) + '</dd><dt>Priorität</dt><dd>' + c.priority + ' (Score ' + c.score + ')</dd></dl>' }); };
  function dataTab() {
    const sys = D.meta.system || {}; const backups = (sys.backups || []).slice().reverse();
    return '<div class="grid g2"><div class="card"><div class="card-h"><h3>Sicherungen</h3></div><p class="small muted mt-0">Automatische Sicherung beim Öffnen, höchstens alle 7 Tage (nur echter Arbeitsbereich), als JSON-Datei im privaten Dateispeicher des Servers. Zusätzlich kannst du jederzeit exportieren.</p><div class="row wrap"><button class="btn primary" data-act="backupNow">' + ic('database') + 'Jetzt sichern</button><button class="btn" data-act="exportAll">' + ic('download') + 'Export herunterladen</button><button class="btn" data-act="importFile">' + ic('upload') + 'Aus Datei wiederherstellen</button></div>' +
      (backups.length ? '<div class="list" style="margin-top:12px">' + backups.slice(0, 12).map(b => '<div class="li"><span class="grow small">' + F.dateTime(b.at) + (b.auto ? ' <span class="chip">auto</span>' : '') + '<div class="faint tiny">' + F.size(b.size) + ' · ' + b.records + ' Einträge</div></span><button class="btn xs" data-act="restoreBackup" data-id="' + b.assetId + '">Wiederherstellen</button></div>').join('') + '</div>' : '<div class="faint small" style="margin-top:10px">Noch keine Sicherung vorhanden.</div>') + '</div>' +
      '<div class="card"><div class="card-h"><h3>Demo-Arbeitsbereich</h3><span class="chip warn">getrennt</span></div><p class="small muted mt-0">Beispieldaten liegen in einem vollständig getrennten Arbeitsbereich und fließen nie in deine echten Kennzahlen ein.</p><div class="row wrap"><button class="btn" data-act="toDemo">' + ic('flask') + 'Zur Demo wechseln</button>' + (D.ws === 'demo' ? '<button class="btn" data-act="genDemo">' + ic('refresh') + 'Demo-Daten neu erzeugen</button><button class="btn danger" data-act="wipeWs">' + ic('trash') + 'Demo leeren</button>' : '') + '</div>' +
      '<div class="divider"></div><div class="card-h"><h3>Arbeitsbereich leeren</h3></div><p class="small muted mt-0">Löscht alle Daten des aktuell geöffneten Arbeitsbereichs (' + (D.ws === 'demo' ? 'Demo' : 'echte Daten') + '). Vorher wird automatisch eine Sicherung erstellt.</p><button class="btn danger" data-act="wipeWs">' + ic('trash') + 'Arbeitsbereich leeren …</button></div></div>';
  }
  ACT.backupNow = el => { el.disabled = true; UI.run(() => Backup.make(false), 'Sicherung erstellt').finally(() => { el.disabled = false; }); };
  ACT.exportAll = () => UI.run(() => Backup.download());
  ACT.importFile = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { const data = JSON.parse(await f.text()); await restoreData(data); } catch (e) { UI.err(e, 'Datei konnte nicht gelesen werden.'); } }; inp.click(); };
  ACT.restoreBackup = el => UI.run(async () => { const data = await Backup.fetchAsset(el.dataset.id); await restoreData(data); });
  async function restoreData(data) {
    if (!data || data.app !== 'Agentur-Zentrale') throw { message: 'Keine gültige Sicherung der Agentur-Zentrale.' };
    const n = Object.values(data.collections || {}).reduce((a, x) => a + x.length, 0);
    if (!(await UI.confirm({ title: 'Sicherung einspielen?', html: 'Sicherung vom ' + F.dateTime(data.exportedAt) + ' mit ' + n + ' Datensätzen wird in den Arbeitsbereich <b>' + (D.ws === 'demo' ? 'Demo' : 'echte Daten') + '</b> geschrieben. Vorhandene Datensätze mit gleicher ID werden überschrieben, andere bleiben erhalten.', ok: 'Einspielen' }))) return;
    const t = UI.dialog({ title: 'Wiederherstellung läuft', body: '<div class="progress"><i id="rp" style="width:0"></i></div><div class="faint small" id="rt" style="margin-top:6px"></div>', sticky: true });
    try { const k = await D.importAll(data, (i, all) => { const p = t.el.querySelector('#rp'); if (p) p.style.width = (100 * i / all) + '%'; const tt = t.el.querySelector('#rt'); if (tt) tt.textContent = i + ' / ' + all; }); A.resetState(); UI.toast(k + ' Einträge wiederhergestellt'); } finally { t.close(); }
  }
  ACT.wipeWs = async () => {
    const word = await UI.prompt({ title: 'Arbeitsbereich leeren', label: 'Zur Bestätigung „LÖSCHEN“ eingeben', required: true }); if (word !== 'LÖSCHEN') { if (word != null) UI.toast('Abgebrochen – Bestätigungswort stimmte nicht', { bad: true }); return; }
    if (D.ws === 'live') { try { await Backup.make(false); } catch (e) { if (!(await UI.confirm({ title: 'Sicherung nicht möglich', text: 'Trotzdem ohne Sicherung leeren?', ok: 'Trotzdem leeren', danger: true }))) return; } }
    const t = UI.dialog({ title: 'Wird geleert …', body: '<div class="progress"><i id="wp" style="width:0"></i></div>', sticky: true });
    try { await D.wipeWorkspace((i, all) => { const p = t.el.querySelector('#wp'); if (p) p.style.width = (100 * i / all) + '%'; }); A.resetState(); UI.toast('Arbeitsbereich geleert'); } catch (e) { UI.err(e); } finally { t.close(); }
  };

  /* ================= System, Papierkorb, Protokoll, Benachrichtigungen ================= */
  V.system = {
    title: 'Systemstatus', icon: 'activity',
    render() {
      const sys = D.meta.system || {}; const n = D.counts(); const errors = D.autolog.filter(r => r.ok === false).length;
      const row = (l, v, ok) => '<div class="li"><span style="color:' + (ok === false ? 'var(--bad)' : ok === 'warn' ? 'var(--warn)' : 'var(--good)') + '">' + ic(ok === false ? 'xCircle' : ok === 'warn' ? 'alert' : 'circleCheck') + '</span><span class="grow">' + l + '</span><span class="small muted right">' + v + '</span></div>';
      return '<div class="page-head"><div><h2>Systemstatus</h2><p>Version, Speicher, Verbindungen, Sicherungen und Fehler auf einen Blick.</p></div></div><div class="grid g2"><div class="card"><div class="list">' +
        row('Version', App.VERSION) + row('Datenbank', { ok: 'verbunden', connecting: 'verbindet …', slow: 'langsam', error: 'Fehler: ' + esc(D.error), offline: 'nicht verfügbar', revoked: 'Zugriff entzogen' }[D.status] || D.status, D.status === 'ok' ? true : D.status === 'slow' ? 'warn' : false) +
        row('Arbeitsbereich', D.ws === 'demo' ? 'Demo (Beispieldaten)' : 'Echte Daten', D.ws === 'demo' ? 'warn' : true) + row('Datensätze', F.num(n), true) +
        row('Dokumentenspeicher', '<span id="assetUsage">wird geprüft …</span>', Docs.assets ? true : 'warn') + row('Website-Formular', window.Inbox && Inbox.error ? 'Fehler: ' + esc(Inbox.error) : (window.Inbox && Inbox.lastRun ? 'abgerufen ' + F.ago(Inbox.lastRun) : 'verbunden'), window.Inbox && Inbox.error ? false : true) + row('KI-Modul (optional)', AI.available ? 'eingerichtet' : 'nicht eingerichtet', AI.available ? true : 'warn') +
        row('E-Mail-Modul (optional)', Mail.available ? 'verbunden' : 'Mailprogramm', true) + row('Letzte Sicherung', sys.lastBackupAt ? F.dateTime(sys.lastBackupAt) : 'noch keine', sys.lastBackupAt && L.diffDays(L.dateOf(sys.lastBackupAt), L.todayBerlin()) <= 8 ? true : 'warn') +
        row('Zeitgesteuerte Prüfungen', A.lastScheduledRun ? F.ago(A.lastScheduledRun) : 'noch nicht', !!A.lastScheduledRun || 'warn') + row('Automatisierungsfehler', errors ? '<a href="#automatisierungen" data-act="setUi" data-view="automatisierungen" data-k="tab" data-v="fehler">' + errors + ' Fehler</a>' : 'keine', errors ? false : true) +
        row('Ausstehende Speichervorgänge', String(D.pending), D.pending ? 'warn' : true) + (D.lastWriteError ? row('Letzter Speicherfehler', esc(D.lastWriteError), false) : '') + '</div></div>' +
        '<div class="card"><div class="card-h"><h3>Architektur & Sicherheit</h3></div><ul class="small" style="padding-left:18px;margin:0;line-height:1.7"><li><b>Hosting & Login:</b> eigene Seite unter linua.de/zentrale. Zugang nur per Zugangscode, geprüft serverseitig von Supabase Auth (Code nur gehasht gespeichert, nicht im Quellcode); Sitzung nur in diesem Tab, automatische Abmeldung nach ' + ((window.ZAuth && ZAuth.idleMinutes) || 30) + ' Min. ohne Aktivität.</li><li><b>Datenbank:</b> Supabase (Postgres, EU). Row Level Security: Lesen & Schreiben nur für das eingetragene Inhaberkonto – ohne gültige Sitzung liefert der Server keine Daten, auch nicht bei direktem Aufruf der Adresse.</li><li><b>Dateien:</b> privater Speicher, Abruf nur mit Sitzung (Typ- & Größenprüfung, keine ausführbaren Dateien).</li><li><b>Website-Formular:</b> eigener Eingang, von außen nur Einfügen möglich; Spam-Schutz und Mengenbegrenzung serverseitig.</li><li><b>Optionale Module:</b> KI und Gmail-Anbindung sind getrennt und nur aktiv, wenn eingerichtet.</li><li><b>Unveränderbarkeit:</b> festgeschriebene Rechnungen sind gesperrt, Korrektur nur per Storno; Rechnungs-PDF wird archiviert.</li><li><b>Löschen:</b> Papierkorb mit Wiederherstellung; endgültig nur über die Freigabe.</li><li><b>Demo:</b> eigener Arbeitsbereich, nie mit echten Daten vermischt.</li><li><b>Grenzen:</b> Zeitpläne und Abrufe laufen, solange die Zentrale geöffnet ist. Datenschutz: Mit Supabase einen Auftragsverarbeitungsvertrag abschließen und im Verzeichnis der Verarbeitungstätigkeiten aufnehmen (keine Rechtsberatung).</li></ul></div></div>';
    },
    mount() { const el = document.getElementById('assetUsage'); if (!el) return; Docs.init().then(ok => { if (!ok) { el.textContent = 'nicht verfügbar'; return; } Docs.assets.list().then(r => { el.textContent = r.usage.files + ' Dateien · ' + F.size(r.usage.bytes) + ' von ' + F.size(r.usage.maxBytes); }).catch(() => { el.textContent = 'nicht abrufbar'; }); }); }
  };
  V.papierkorb = {
    title: 'Papierkorb', icon: 'trash',
    render() {
      const items = D.trash();
      return '<div class="page-head"><div><h2>Papierkorb</h2><p>Gelöschte Datensätze lassen sich wiederherstellen. Endgültiges Löschen nur über die Freigabe – nicht für festgeschriebene Rechnungen (Aufbewahrungspflicht).</p></div></div>' +
        (items.length ? '<div class="card pad0"><div class="list">' + items.map(({ col, item }) => '<div class="li" style="padding:10px 14px"><span class="chip">' + esc(D.LABELS[col]) + '</span><span class="grow ellipsis">' + esc(D.titleOf(col, item) || item.id) + (item.mergedInto ? ' <span class="faint small">(zusammengeführt)</span>' : '') + '</span><span class="faint small hide-m">' + F.ago(item.deletedAt) + '</span><button class="btn xs" data-act="restore" data-col="' + col + '" data-id="' + item.id + '">' + ic('restore', 's') + 'Wiederherstellen</button><button class="btn xs danger" data-act="purge" data-col="' + col + '" data-id="' + item.id + '">Endgültig …</button></div>').join('') + '</div></div>' : '<div class="card">' + UI.empty('trash', 'Papierkorb ist leer', '') + '</div>');
    }
  };
  ACT.purge = el => UI.run(async () => { await O.requestPurge(el.dataset.col, el.dataset.id); UI.toast('Löschung wartet auf Freigabe', { action: { label: 'Öffnen', fn: () => App.go('freigaben') } }); });
  V.aktivitaet = {
    title: 'Aktivitätsprotokoll', icon: 'history',
    render() {
      const st = App.ui('aktivitaet'); const col = st.col || ''; const list = D.activity.filter(a => !col || a.col === col).slice(0, 300);
      return '<div class="page-head"><div><h2>Aktivitätsprotokoll</h2><p>Wer hat wann was geändert – die letzten 3 Monate.</p></div></div><div class="toolbar"><select class="in" style="width:auto" data-act-change="actCol"><option value="">Alle Bereiche</option>' + UI.optList(Object.keys(D.LABELS).filter(k => k !== 'notifications').map(k => [k, D.LABELS[k]]), col) + '</select></div>' +
        (list.length ? '<div class="card pad0"><div class="list">' + list.map(a => '<div class="li" style="padding:9px 14px"><span class="chip">' + esc(D.LABELS[a.col] || a.col) + '</span><span class="grow">' + esc(H.actionText(a)) + '</span><span class="faint small nowrap">' + F.dateTime(a.at) + '</span></div>').join('') + '</div></div>' : '<div class="card">' + UI.empty('history', 'Noch keine Einträge', '') + '</div>');
    }
  };
  ACT.actCol = el => { App.ui('aktivitaet').col = el.value; App.saveUi(); App.render(); };
  ACT.notifications = el => {
    const list = D.all('notifications').sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 15);
    UI.menu(el, (list.length ? [{ heading: true, label: 'Benachrichtigungen' }].concat(list.map(n => ({ label: (n.read ? '' : '● ') + n.title, hint: F.ago(n.createdAt), fn: () => { if (!n.read) D.update('notifications', n.id, { read: true }, { silent: true }).catch(() => { }); if (n.link) App.go(n.link); } })), [{ sep: true }, { label: 'Alle als gelesen markieren', icon: 'check', fn: async () => { for (const n of D.all('notifications').filter(n => !n.read)) await D.update('notifications', n.id, { read: true }, { silent: true }); } }]) : [{ heading: true, label: 'Keine Benachrichtigungen' }]));
  };
})();
