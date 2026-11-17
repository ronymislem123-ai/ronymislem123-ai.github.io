/* LINUA Agentur-Zentrale – Code-Eingabe */
(function () {
  'use strict';
  const Z = window.ZAuth;
  const form = document.getElementById('gate');
  const input = document.getElementById('code');
  const btn = document.getElementById('go');
  const msg = document.getElementById('msg');
  const APP = 'app/';
  const say = (text, bad) => { msg.textContent = text || ''; msg.classList.toggle('bad', !!bad); input.setAttribute('aria-invalid', bad ? 'true' : 'false'); };

  if (Z.valid()) { Z.go(APP); return; }

  const reasons = {
    inaktiv: 'Du wurdest nach ' + Z.idleMinutes + ' Minuten ohne Aktivität abgemeldet.',
    abgemeldet: 'Du hast dich abgemeldet.',
    session: 'Deine Sitzung ist abgelaufen. Bitte erneut anmelden.',
    einrichtung: 'Der Server der Zentrale ist noch nicht eingerichtet.'
  };
  const grund = new URLSearchParams(location.search).get('grund');
  if (grund && reasons[grund]) say(reasons[grund], grund === 'einrichtung');
  if (grund) history.replaceState(null, '', location.pathname);
  if (!Z.configured) say(reasons.einrichtung, true);

  const texts = {
    wrong: 'Dieser Code ist nicht korrekt.',
    empty: 'Bitte den Zugangscode eingeben.',
    rate: 'Zu viele Versuche. Bitte warte einige Minuten und versuche es dann erneut.',
    network: 'Keine Verbindung zum Server. Bitte Internetverbindung prüfen.',
    forbidden: 'Dieses Konto hat keinen Zugriff auf die Agenturzentrale.',
    not_configured: reasons.einrichtung,
    server: 'Der Server antwortet gerade nicht. Bitte später erneut versuchen.'
  };
  let fails = 0, lockedUntil = 0;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (Date.now() < lockedUntil) { say('Bitte ' + Math.ceil((lockedUntil - Date.now()) / 1000) + ' Sekunden warten.', true); return; }
    btn.disabled = true; say('Wird geprüft …');
    try {
      await Z.login(input.value);
      say('Zugang bestätigt.');
      Z.go(APP);
    } catch (err) {
      const code = (err && err.code) || 'server';
      if (code === 'wrong') { fails++; if (fails >= 5) { lockedUntil = Date.now() + 30000; fails = 0; } }
      say(texts[code] || texts.server, true);
      input.select();
    } finally {
      btn.disabled = false;
    }
  });
  input.focus();
})();
