/* Agentur-Zentrale – Erfassen & Bearbeiten (Formulare für alle Datensätze) */
(function () {
  'use strict';
  const E = {};
  const S = () => D.settings();
  const today = () => L.todayBerlin();

  E.company = function (c, pre) {
    const isNew = !c; const v = Object.assign({ type: 'firma', status: 'lead', source: 'sonstiges', address: { country: 'Deutschland' }, socials: {} }, c || {}, pre || {});
    const fields = [
      { key: 'name', label: 'Firmen- oder Kundenname', required: true, autofocus: true },
      { key: 'type', label: 'Unternehmensart', type: 'select', options: [['firma', 'Unternehmen'], ['selbststaendig', 'Selbstständig / Freiberufler'], ['startup', 'Start-up'], ['verein', 'Verein / Organisation'], ['privat', 'Privatperson']] },
      { key: 'status', label: 'Kundenstatus', type: 'select', options: L.COMPANY_STATUS },
      { key: 'source', label: 'Quelle des Kontakts', type: 'select', options: L.CHANNELS },
      { key: 'industry', label: 'Branche', placeholder: 'z. B. Handwerk, Gastronomie' },
      { key: 'website', label: 'Website', type: 'url', placeholder: 'https://' },
      { key: 'email', label: 'Allgemeine E-Mail', type: 'email' }, { key: 'phone', label: 'Telefon', type: 'tel' },
      { type: 'section', label: 'Adresse' },
      { key: 'address.street', label: 'Straße & Nr.' }, { key: 'address.zip', label: 'PLZ' }, { key: 'address.city', label: 'Ort' }, { key: 'address.country', label: 'Land' },
      { key: 'vatId', label: 'USt-IdNr. (falls vorhanden)' },
      { type: 'section', label: 'Social Media' },
      { key: 'socials.instagram', label: 'Instagram' }, { key: 'socials.linkedin', label: 'LinkedIn' }, { key: 'socials.facebook', label: 'Facebook' }, { key: 'socials.other', label: 'Weitere' },
      { key: 'notes', label: 'Interne Bemerkungen', type: 'textarea', rows: 3 }
    ];
    if (isNew) fields.splice(8, 0, { type: 'section', label: 'Ansprechpartner (optional)' }, { key: '_c.firstName', label: 'Vorname' }, { key: '_c.lastName', label: 'Nachname' }, { key: '_c.email', label: 'E-Mail', type: 'email' }, { key: '_c.phone', label: 'Telefon', type: 'tel' });
    UI.form({
      title: isNew ? 'Neuer Kunde / Interessent' : 'Kunde bearbeiten', fields, values: v, size: 'wide',
      onSubmit: async vals => {
        const ct = vals._c; delete vals._c;
        if (isNew) {
          const dup = L.findDuplicates({ email: (ct && ct.email) || vals.email, phone: (ct && ct.phone) || vals.phone, website: vals.website, company: vals.name, name: ct ? (ct.firstName + ' ' + ct.lastName).trim() : '' }, D.all('companies'), D.all('contacts'));
          if (dup.result !== 'neu') {
            const other = D.get('companies', dup.companyId || (dup.candidates && dup.candidates[0] && dup.candidates[0].companyId));
            if (other) {
              const go = await UI.confirm({ title: 'Mögliches Duplikat', html: F.esc((dup.reason || dup.candidates[0].reason) + ': „' + other.name + '“ existiert bereits.') + '<br>Trotzdem neu anlegen?', ok: 'Trotzdem anlegen' });
              if (!go) { App.go('kunde-' + other.id); return; }
            }
          }
          if (vals.status === 'kunde') vals.becameCustomerAt = D.nowIso();
          const co = await D.create('companies', vals);
          if (ct && (ct.firstName || ct.lastName || ct.email)) { const p = await D.create('contacts', Object.assign({ companyId: co.id, isPrimary: true, role: '' }, ct)); await D.update('companies', co.id, { primaryContactId: p.id }, { silent: true }); }
          await A.emit('contact.created', { col: 'companies', id: co.id });
          UI.toast('Kundenakte angelegt'); App.go('kunde-' + co.id);
        } else {
          if (vals.status !== c.status && vals.status === 'kunde' && !c.becameCustomerAt) vals.becameCustomerAt = D.nowIso();
          await D.update('companies', c.id, vals); UI.toast('Gespeichert');
        }
      }
    });
  };
  E.contact = function (p, pre) {
    const v = Object.assign({ isPrimary: false }, p || {}, pre || {});
    UI.form({
      title: p ? 'Kontakt bearbeiten' : 'Neuer Ansprechpartner', values: v, fields: [
        { key: 'companyId', label: 'Kunde', type: 'company', full: true },
        { key: 'firstName', label: 'Vorname', autofocus: true }, { key: 'lastName', label: 'Nachname' }, { key: 'role', label: 'Rolle / Position' },
        { key: 'email', label: 'E-Mail', type: 'email' }, { key: 'phone', label: 'Telefon', type: 'tel' },
        { key: 'isPrimary', label: '', type: 'checkbox', text: 'Hauptansprechpartner' }, { key: 'notes', label: 'Notizen', type: 'textarea', rows: 2 }
      ],
      onSubmit: async vals => {
        if (!(vals.firstName || vals.lastName || vals.email)) throw { message: 'Bitte Name oder E-Mail angeben.' };
        const c = p ? await D.update('contacts', p.id, vals) : await D.create('contacts', vals);
        if (vals.isPrimary && vals.companyId) await D.update('companies', vals.companyId, { primaryContactId: c.id }, { silent: true });
        UI.toast('Kontakt gespeichert');
      }
    });
  };
  E.deal = function (d, pre) {
    const v = Object.assign({ stage: 'neu', value: 0, source: 'sonstiges', projectType: 'website' }, d || {}, pre || {});
    UI.form({
      title: d ? 'Verkaufschance bearbeiten' : 'Neue Verkaufschance', values: v, fields: [
        { key: 'title', label: 'Titel', required: true, full: true, autofocus: true, placeholder: 'z. B. Relaunch Website Bäckerei Krause' },
        { key: 'companyId', label: 'Kunde', type: 'company', required: true }, { key: 'contactId', label: 'Ansprechpartner', type: 'contact' },
        { key: 'stage', label: 'Phase', type: 'select', options: L.STAGES }, { key: 'value', label: 'Wert netto (€)', type: 'money' },
        { key: 'projectType', label: 'Projektart', type: 'select', options: L.PROJECT_TYPES }, { key: 'source', label: 'Quelle', type: 'select', options: L.CHANNELS },
        { key: 'expectedClose', label: 'Erwarteter Abschluss', type: 'date' }, { key: 'nextStepAt', label: 'Nächster Schritt am', type: 'date' },
        { key: 'notes', label: 'Notizen', type: 'textarea', rows: 3 }
      ],
      onSubmit: async vals => {
        if (d) {
          const stage = vals.stage; delete vals.stage; await D.update('deals', d.id, vals);
          if (stage !== d.stage) await O.setDealStage(d.id, stage);
        } else {
          const stage = vals.stage; const nd = await D.create('deals', Object.assign(vals, { stage: 'neu', stageHistory: [{ stage: 'neu', at: D.nowIso() }], openedAt: D.nowIso() }));
          if (stage !== 'neu') await O.setDealStage(nd.id, stage);
          const c = D.get('companies', vals.companyId); if (c && c.status === 'verloren') await D.update('companies', c.id, { status: 'interessent' }, { silent: true });
        }
        UI.toast('Deal gespeichert');
      }
    });
  };
  E.lose = function (deal) {
    UI.form({
      title: 'Auftrag verloren', size: 'narrow', values: { reason: '' }, submit: 'Als verloren markieren', fields: [
        { key: 'reason', label: 'Grund', type: 'select', options: [['Preis', 'Preis zu hoch'], ['Wettbewerber', 'Wettbewerber gewählt'], ['Kein Budget', 'Kein Budget'], ['Zeitpunkt', 'Falscher Zeitpunkt'], ['Keine Rückmeldung', 'Keine Rückmeldung'], ['Passt nicht', 'Passt nicht zu uns'], ['Sonstiges', 'Sonstiges']], empty: '– bitte wählen –', required: true, full: true },
        { key: 'note', label: 'Notiz', type: 'textarea', rows: 2 }
      ],
      onSubmit: async v => { await O.setDealStage(deal.id, 'verloren', { reason: v.reason + (v.note ? ' – ' + v.note : '') }); UI.toast('Als verloren markiert'); }
    });
  };
  E.project = function (p, pre) {
    const v = Object.assign({ status: 'geplant', startDate: today(), projectType: 'website', value: 0 }, p || {}, pre || {});
    const tpls = D.templates();
    const fields = [
      { key: 'name', label: 'Projektname', required: true, full: true, autofocus: true },
      { key: 'companyId', label: 'Kunde', type: 'company', required: true }, { key: 'contactId', label: 'Ansprechpartner', type: 'contact' },
      { key: 'projectType', label: 'Projektart', type: 'select', options: L.PROJECT_TYPES }, { key: 'status', label: 'Status', type: 'select', options: L.PROJECT_STATUS },
      { key: 'value', label: 'Auftragswert netto (€)', type: 'money' }, { key: 'dealId', label: 'Zugehöriger Deal', type: 'deal' },
      { key: 'startDate', label: 'Projektbeginn', type: 'date', required: true }, { key: 'deadline', label: 'Deadline', type: 'date', help: p ? '' : 'Leer lassen = aus Vorlage berechnen' },
      { key: 'description', label: 'Beschreibung', type: 'textarea', rows: 3 }
    ];
    if (!p) fields.splice(1, 0, { key: '_tpl', label: 'Projektvorlage', type: 'select', options: tpls.map(t => ({ id: t.id, label: t.name })), empty: '– ohne Vorlage –', full: true, help: 'Legt Aufgaben (inkl. Kundenzulieferungen) und Meilensteine mit Terminen nach Werktagen an.' });
    UI.form({
      title: p ? 'Projekt bearbeiten' : 'Neues Projekt', values: Object.assign({ _tpl: (L.templateForType(tpls, v.projectType) || {}).id }, v), fields, size: 'wide',
      onChange: (cur, el) => { if (!p && cur.projectType) { const t = L.templateForType(tpls, cur.projectType); const sel = el.querySelector('[name="_tpl"]'); if (t && sel && !sel.dataset.touched) sel.value = t.id; } },
      onMount: el => { const sel = el.querySelector('[name="_tpl"]'); if (sel) sel.addEventListener('change', () => { sel.dataset.touched = '1'; }); },
      onSubmit: async vals => {
        const tpl = vals._tpl; delete vals._tpl;
        if (p) { const st = vals.status; delete vals.status; await D.update('projects', p.id, vals); if (st !== p.status) await O.setProjectStatus(p.id, st); UI.toast('Projekt gespeichert'); }
        else { const np = await O.createProject(vals, tpl || null); UI.toast('Projekt angelegt'); App.go('projekt-' + np.id); }
      }
    });
  };
  E.task = function (t, pre) {
    const v = Object.assign({ priority: 'mittel', status: 'offen', due: today(), recurrence: 'none', assignee: 'ich' }, t || {}, pre || {});
    UI.form({
      title: t ? 'Aufgabe bearbeiten' : 'Neue Aufgabe', values: v, fields: [
        { key: 'title', label: 'Aufgabe', required: true, full: true, autofocus: true },
        { key: 'due', label: 'Fällig am', type: 'date' }, { key: 'priority', label: 'Priorität', type: 'select', options: L.PRIORITIES },
        { key: 'recurrence', label: 'Wiederholung', type: 'select', options: L.RECURRENCE }, { key: 'assignee', label: 'Zuständig', type: 'select', options: [['ich', 'Ich'], ['kunde', 'Kunde (Zulieferung)']] },
        { key: 'kind', label: 'Art', type: 'select', options: [['task', 'Aufgabe'], ['followup', 'Wiedervorlage'], ['call', 'Anruf'], ['duplicate', 'Dubletten-Prüfung']] },
        { key: 'companyId', label: 'Kunde', type: 'company' }, { key: 'projectId', label: 'Projekt', type: 'project' }, { key: 'dealId', label: 'Deal', type: 'deal' },
        { key: 'notes', label: 'Notizen', type: 'textarea', rows: 3 }
      ],
      onSubmit: async vals => { if (t) await D.update('tasks', t.id, vals); else await D.create('tasks', Object.assign({ kind: 'task', source: 'manuell' }, vals)); UI.toast('Aufgabe gespeichert'); }
    });
  };
  E.event = function (ev, pre) {
    const d = (pre && pre.date) || today();
    const v = Object.assign({ kind: 'termin', start: d + 'T10:00', end: d + 'T10:30' }, ev ? Object.assign({}, ev, { start: (ev.start || '').slice(0, 16), end: (ev.end || '').slice(0, 16) }) : {}, pre || {});
    UI.form({
      title: ev ? 'Termin bearbeiten' : 'Neuer Termin', values: v, footLeft: ev ? '<button class="btn danger sm" data-del>' + ic('trash') + 'Löschen</button>' : '', fields: [
        { key: 'title', label: 'Titel', required: true, full: true, autofocus: true },
        { key: 'start', label: 'Beginn', type: 'datetime-local', required: true }, { key: 'end', label: 'Ende', type: 'datetime-local' },
        { key: 'kind', label: 'Art', type: 'select', options: [['termin', 'Termin'], ['beratung', 'Beratungsgespräch'], ['call', 'Telefonat / Video-Call'], ['kickoff', 'Kick-off'], ['abnahme', 'Abnahme'], ['intern', 'Intern']] },
        { key: 'location', label: 'Ort / Link' },
        { key: 'companyId', label: 'Kunde', type: 'company' }, { key: 'dealId', label: 'Deal', type: 'deal' }, { key: 'projectId', label: 'Projekt', type: 'project' },
        { key: 'notes', label: 'Notizen / Agenda', type: 'textarea', rows: 3 }
      ],
      validate: null,
      onMount: (el, close) => { const b = el.querySelector('[data-del]'); if (b) b.onclick = async () => { if (await UI.confirm({ title: 'Termin löschen?', text: 'Der Termin landet im Papierkorb.', ok: 'Löschen', danger: true })) { await UI.run(() => D.softDelete('events', ev.id), 'Termin gelöscht'); close(true); } }; },
      onSubmit: async vals => {
        if (vals.end && vals.end < vals.start) throw { message: 'Ende liegt vor dem Beginn.' };
        if (ev) await D.update('events', ev.id, vals); else await D.create('events', vals);
        if (vals.dealId && vals.kind === 'beratung') { const dl = D.get('deals', vals.dealId); if (dl && L.STAGES.findIndex(s => s.id === dl.stage) < 3) await O.setDealStage(dl.id, 'beratung'); }
        UI.toast('Termin gespeichert');
      }
    });
  };
  E.note = function (n, pre) {
    const v = Object.assign({ kind: 'notiz', at: today() }, n || {}, pre || {});
    UI.form({
      title: n ? 'Notiz bearbeiten' : 'Notiz / Gesprächsprotokoll', values: v, size: 'wide', fields: [
        { key: 'kind', label: 'Art', type: 'select', options: [['notiz', 'Notiz'], ['gespraech', 'Gesprächsprotokoll'], ['anruf', 'Anruf'], ['meeting', 'Meeting']] }, { key: 'at', label: 'Datum', type: 'date' },
        { key: 'companyId', label: 'Kunde', type: 'company' }, { key: 'projectId', label: 'Projekt', type: 'project' }, { key: 'dealId', label: 'Deal', type: 'deal' },
        { key: 'text', label: 'Inhalt', type: 'textarea', rows: 8, required: true, full: true }
      ],
      after: AI.available ? '<div class="note" style="margin-top:12px">' + ic('sparkles') + '<span>Nach dem Speichern kannst du in der Zeitachse „Aufgaben ableiten“ wählen – die KI schlägt Aufgaben vor, du entscheidest.</span></div>' : '',
      onSubmit: async vals => { if (n) await D.update('notes', n.id, vals); else await D.create('notes', vals); UI.toast('Notiz gespeichert'); }
    });
  };
  E.expense = function (x, pre) {
    const s = S(); const v = Object.assign({ date: today(), category: 'software', net: 0, vat: 0, vatRate: s.taxMode === 'klein' ? 19 : 19 }, x || {}, pre || {});
    UI.form({
      title: x ? 'Ausgabe bearbeiten' : 'Betriebsausgabe erfassen', values: v, fields: [
        { key: 'vendor', label: 'Anbieter / Zahlungsempfänger', required: true, autofocus: true }, { key: 'date', label: 'Bezahlt am', type: 'date', required: true },
        { key: 'category', label: 'Kategorie', type: 'select', options: L.EXPENSE_CATEGORIES }, { key: 'net', label: 'Betrag netto (€)', type: 'money', required: true },
        { key: 'vat', label: 'Enthaltene USt. (€)', type: 'money', help: 'Bei Belegen ohne USt. 0 eintragen.' }, { key: 'recurring', label: '', type: 'checkbox', text: 'Wiederkehrend (z. B. Abo)' },
        { key: 'note', label: 'Notiz', type: 'textarea', rows: 2 },
        { type: 'html', full: true, html: '<label class="small muted" style="font-weight:550">Beleg (optional)</label><input type="file" class="in" name="_file" accept="' + Docs.ACCEPT + '" style="padding-top:6px">' }
      ],
      onSubmit: async (vals, el) => {
        if (!(vals.net > 0)) throw { message: 'Bitte einen Betrag größer 0 eingeben.' };
        const file = el.querySelector('[name="_file"]').files[0];
        const ex = x ? await D.update('expenses', x.id, vals) : await D.create('expenses', vals);
        if (file) { try { const d = await Docs.uploadBlob(file, { name: file.name, category: 'beleg', expenseId: ex.id }); await D.update('expenses', ex.id, { documentId: d.id }, { silent: true }); } catch (e) { UI.toast(Docs.errorText(e), { bad: true }); } }
        UI.toast('Ausgabe gespeichert');
      }
    });
  };
  E.contract = function (c, pre) {
    const v = Object.assign({ interval: 'monatlich', active: true, start: today(), amount: 0, kind: 'wartung' }, c || {}, pre || {});
    UI.form({
      title: c ? 'Vertrag bearbeiten' : 'Wiederkehrender Vertrag', values: v, fields: [
        { key: 'title', label: 'Bezeichnung', required: true, full: true, placeholder: 'z. B. Wartung & Hosting Website' },
        { key: 'companyId', label: 'Kunde', type: 'company', required: true }, { key: 'kind', label: 'Art', type: 'select', options: [['wartung', 'Wartung'], ['hosting', 'Hosting'], ['betreuung', 'Betreuung / Retainer'], ['seo', 'SEO'], ['sonstiges', 'Sonstiges']] },
        { key: 'amount', label: 'Betrag netto je Intervall (€)', type: 'money', required: true }, { key: 'interval', label: 'Intervall', type: 'select', options: [['monatlich', 'Monatlich'], ['quartal', 'Quartalsweise'], ['jaehrlich', 'Jährlich']] },
        { key: 'start', label: 'Beginn', type: 'date' }, { key: 'end', label: 'Ende / gekündigt zum', type: 'date' },
        { key: 'active', label: '', type: 'checkbox', text: 'Aktiv' }, { key: 'note', label: 'Notiz', type: 'textarea', rows: 2 }
      ],
      onSubmit: async vals => { if (c) await D.update('contracts', c.id, vals); else await D.create('contracts', vals); UI.toast('Vertrag gespeichert'); }
    });
  };
  E.inquiry = function () {
    UI.form({
      title: 'Anfrage erfassen', size: 'wide', values: { channel: 'telefon' },
      intro: '<div class="note" style="margin-bottom:14px">' + ic('zap') + '<span>Beim Speichern läuft Workflow A: Dubletten-Check, Kundenakte, Lead in der Pipeline, Kategorisierung, Aufgabe & Wiedervorlage, Benachrichtigung – und eine Eingangsbestätigung als Entwurf in der Freigabe.</span></div>',
      fields: [
        { key: 'channel', label: 'Eingangskanal', type: 'select', options: L.CHANNELS },
        { key: 'paste', label: 'Optional: E-Mail/Formulartext einfügen', type: 'textarea', rows: 3, full: true, help: 'Felder wie „Name: …“, „E-Mail: …“ werden automatisch erkannt.' },
        { key: 'name', label: 'Name' }, { key: 'company', label: 'Firma' }, { key: 'email', label: 'E-Mail', type: 'email' }, { key: 'phone', label: 'Telefon', type: 'tel' },
        { key: 'website', label: 'Aktuelle Website' }, { key: 'projectType', label: 'Projektart', type: 'select', options: L.PROJECT_TYPES, empty: '– automatisch erkennen –' },
        { key: 'budget', label: 'Budget', placeholder: 'z. B. 3.000–5.000 €' }, { key: 'deadline', label: 'Zeitrahmen', placeholder: 'z. B. bis 15.03.2027' },
        { key: 'message', label: 'Nachricht / Anliegen', type: 'textarea', rows: 4, full: true },
        { key: 'consent', label: '', type: 'checkbox', text: 'Einwilligung zur Kontaktaufnahme liegt vor' }
      ],
      onMount: el => {
        const ta = el.querySelector('[name="paste"]');
        ta.addEventListener('input', F.debounce(() => {
          const r = L.parseInquiryText(ta.value); for (const k of ['name', 'company', 'email', 'phone', 'website', 'budget', 'deadline', 'message']) { const inp = el.querySelector('[name="' + k + '"]'); if (inp && r[k] && !inp.value) inp.value = r[k]; }
          const pt = L.detectProjectType(r.projectType); if (pt) el.querySelector('[name="projectType"]').value = pt;
        }, 300));
      },
      onSubmit: async v => {
        if (!(v.name || v.company || v.email || v.phone)) throw { message: 'Bitte mindestens Name, Firma, E-Mail oder Telefon angeben.' };
        const raw = { name: v.name, company: v.company, email: v.email, phone: v.phone, website: v.website, projectType: v.projectType ? L.labelOf(L.PROJECT_TYPES, v.projectType) : '', budget: v.budget, deadline: v.deadline, message: v.message || v.paste };
        const r = await O.intakeInquiry(raw, { channel: v.channel, consent: v.consent });
        UI.toast(r.dup.result === 'zugeordnet' ? 'Anfrage dem bestehenden Kunden „' + r.company.name + '“ zugeordnet' : r.dup.result === 'unsicher' ? 'Anfrage angelegt – mögliches Duplikat als Aufgabe markiert' : 'Neuer Lead angelegt');
        App.go('anfragen');
      }
    });
  };
  E.payment = function (inv) {
    const open = L.openAmount(inv);
    UI.form({
      title: 'Zahlung erfassen · ' + (inv.number || ''), size: 'narrow', values: { amount: open, date: today(), note: '' }, submit: 'Zahlung verbuchen', fields: [
        { key: 'amount', label: 'Betrag (brutto, €)', type: 'money', required: true, help: 'Offen: ' + F.money(open) }, { key: 'date', label: 'Zahlungseingang am', type: 'date', required: true },
        { key: 'note', label: 'Notiz', placeholder: 'z. B. Überweisung Sparkasse', full: true }
      ],
      onSubmit: async v => { if (v.amount > open + 0.005) throw { message: 'Betrag ist höher als der offene Betrag (' + F.money(open) + ').' }; await O.addPayment(inv.id, v); UI.toast('Zahlung verbucht'); }
    });
  };
  E.emailCompose = function (o) {
    o = o || {}; const tpls = D.emailTemplates();
    UI.form({
      title: o.title || 'E-Mail verfassen', size: 'wide', values: { to: o.to || '', subject: o.subject || '', body: o.body || '', tpl: '' }, submit: 'In die Freigabe legen',
      intro: '<div class="note" style="margin-bottom:12px">' + ic('shield') + '<span>Nichts geht ohne deine Freigabe raus: Die Nachricht landet in der Freigabe-Warteschlange. Dort sendest du sie über Gmail, speicherst sie als Gmail-Entwurf oder markierst sie als manuell versendet.</span></div>',
      fields: [
        { key: 'tpl', label: 'Vorlage', type: 'select', options: Object.keys(tpls).map(k => ({ id: k, label: tpls[k].name })), empty: '– keine –', full: true },
        { key: 'to', label: 'An', type: 'email', required: true, full: true }, { key: 'subject', label: 'Betreff', required: true, full: true },
        { key: 'body', label: 'Nachricht', type: 'textarea', rows: 10, required: true, full: true }
      ],
      onMount: el => {
        el.querySelector('[name="tpl"]').addEventListener('change', e => {
          const k = e.target.value; if (!k) return; const m = O.renderTemplate(k, Object.assign({}, O.vars(o.vars || {})));
          el.querySelector('[name="subject"]').value = m.subject; el.querySelector('[name="body"]').value = m.body;
        });
        if (o.ai && AI.available) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm'; b.innerHTML = ic('sparkles') + 'Mit KI formulieren'; b.style.marginTop = '8px';
          el.querySelector('[data-field="body"]').appendChild(b);
          b.onclick = async () => {
            const ta = el.querySelector('[name="body"]'); b.disabled = true; ta.value = 'KI formuliert …';
            try { const r = await AI.ask(AI.SYSTEM + '\n\n' + o.ai + '\n\nSchreibe nur den E-Mail-Text (ohne Betreffzeile), Anrede „Hallo …“, Grußformel mit ' + (S().ownerName || '[Name]') + '.', { onText: x => { ta.value = x.text; } }); ta.value = r.text; }
            catch (e) { ta.value = ''; UI.toast(AI.errorText(e), { bad: true }); } finally { b.disabled = false; }
          };
        }
      },
      onSubmit: async v => { await O.queueEmail({ title: v.subject, to: v.to, subject: v.subject, body: v.body, refs: o.refs || {}, attachments: o.attachments || [], threadId: o.threadId || null }); UI.toast('In der Freigabe – jetzt prüfen & senden', { action: { label: 'Öffnen', fn: () => App.go('freigaben') } }); }
    });
  };

  window.E = E;
})();
