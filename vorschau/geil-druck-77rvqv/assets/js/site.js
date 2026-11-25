{
const GD = window.GD || {products: [], settings: {}, urls: {}};
const S = GD.settings;
const B = window.GD_PAGE || {base: '', mode: 'preview'};
const U = path => B.mode === 'production' ? '/' + path : B.base + path + 'index.html';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const eur = n => new Intl.NumberFormat('de-DE', {style: 'currency', currency: 'EUR'}).format(n);
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };

/* Speicher: im Browser, mit Ersatz im Arbeitsspeicher */
const mem = {};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return k in mem ? mem[k] : d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { mem[k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
};
const getCart = () => store.get('gd-cart', []);
const setCart = c => { store.set('gd-cart', c); updateCount(); };
function updateCount() {
  const n = getCart().reduce((a, i) => a + i.qty, 0);
  $$('.cartbtn .count').forEach(el => { el.textContent = n; el.hidden = !n; });
  $$('.cartbtn').forEach(el => el.setAttribute('aria-label', 'Warenkorb, ' + n + (n === 1 ? ' Artikel' : ' Artikel')));
}

/* Preise (Beispielwerte aus data.js) */
const prod = slug => GD.products.find(p => p.slug === slug);
function discount(q) { for (const [min, d] of S.tiers) if (q >= min) return d; return 0; }
function eyelets(w, h, gap) { const nx = Math.max(2, Math.ceil(w / gap) + 1), ny = Math.max(2, Math.ceil(h / gap) + 1); return 2 * nx + 2 * ny - 4; }
function dims(p, o) {
  if (p.kind === 'format') { const f = p.formats.find(f => f.id === o.format) || p.formats[0]; return [f.w, f.h]; }
  return [o.w, o.h];
}
function unitPrice(p, o) {
  if (p.kind === 'format') { const f = p.formats.find(f => f.id === o.format) || p.formats[0]; return f.price; }
  const area = (o.w / 100) * (o.h / 100);
  const rate = p.rates ? (p.rates[o.opt] ?? Object.values(p.rates)[0]) : p.rate;
  let price = Math.max(p.min, area * rate);
  if (p.eyelets && o.oesen) price += eyelets(o.w, o.h, p.eyelets.gap) * p.eyelets.price;
  return Math.round(price * 100) / 100;
}
function lineTotal(p, o, q) {
  const unit = unitPrice(p, o), disc = discount(q);
  return {unit, disc, total: Math.round(unit * q * (1 - disc) * 100) / 100};
}
function summary(p, o) {
  const [w, h] = dims(p, o);
  const parts = [p.kind === 'format' ? (p.formats.find(f => f.id === o.format) || p.formats[0]).label : (w + ' × ' + h + ' cm')];
  if (p.option) { const v = p.option.values.find(v => v[0] === o.opt); if (v) parts.push(v[1]); }
  if (p.eyelets) parts.push(o.oesen ? 'mit Ösen' : 'ohne Ösen');
  return parts.join(' · ');
}

/* Werkzeichnung: Schild mit Maßketten */
function drawSign(svg, p, o) {
  const W = svg.clientWidth || 600, H = svg.clientHeight || 360;
  const [w, h] = dims(p, o);
  if (!(w > 0 && h > 0)) { svg.innerHTML = ''; return; }
  const small = W < 440;
  const mL = small ? 18 : 30, mR = small ? 46 : 70, mT = small ? 44 : 56, mB = small ? 22 : 34;
  const aw = W - mL - mR, ah = H - mT - mB;
  const s = Math.min(aw / w, ah / h), rw = w * s, rh = h * s;
  const x = mL + (aw - rw) / 2, y = mT + (ah - rh) / 2;
  const look = p.look;
  const txt = (o.text || p.sample || 'Ihr Text').slice(0, 40);
  const fs = Math.max(9, Math.min(rh * 0.4, (rw * 0.84) / Math.max(3, txt.length * 0.47)));
  const color = o.color || '#141414';
  let face = '', extra = '';
  const defs = `<defs><linearGradient id="alu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fdfdfd"/><stop offset=".55" stop-color="#eceef0"/><stop offset="1" stop-color="#d9dcdf"/></linearGradient>
<pattern id="frost" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="8" height="8" fill="#e9eef1"/><line x1="0" y1="0" x2="0" y2="8" stroke="#ffffff" stroke-width="3" opacity=".8"/></pattern></defs>`;
  const shadow = `<rect x="${x + 6}" y="${y + 8}" width="${rw}" height="${rh}" rx="3" fill="#000" opacity=".13"/>`;
  const textEl = (fill, op = 1) => `<text x="${x + rw / 2}" y="${y + rh / 2}" text-anchor="middle" dominant-baseline="central" font-family="Anton, Impact, sans-serif" font-size="${fs.toFixed(1)}" fill="${fill}" opacity="${op}">${esc(txt.toUpperCase())}</text>`;
  if (look === 'alu') face = `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" rx="3" fill="url(#alu)" stroke="#8f959b" stroke-width="1.5"/>` + textEl('#141414');
  else if (look === 'pvc') face = `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" rx="2" fill="#ffffff" stroke="#b8b8b8" stroke-width="1.5"/><rect x="${x}" y="${y + rh - Math.max(3, rh * .06)}" width="${rw}" height="${Math.max(3, rh * .06)}" fill="#ffd100"/>` + textEl('#141414');
  else if (look === 'folie') face = `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="rgba(0,160,227,.10)" stroke="#5aa9cf" stroke-width="1.2" stroke-dasharray="6 5"/>` + textEl(color);
  else if (look === 'milchglas') face = `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="url(#frost)" stroke="#9fb3bf" stroke-width="1.2"/>` + (o.opt === 'geplottet' ? textEl('#cfe6f3') : '');
  else if (look === 'banner') {
    face = `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="#ffffff" stroke="#b8b8b8" stroke-width="1.5"/>` + textEl('#141414');
    if (o.oesen) {
      const gap = p.eyelets.gap, nx = Math.max(2, Math.ceil(w / gap) + 1), ny = Math.max(2, Math.ceil(h / gap) + 1), r = Math.max(2.2, Math.min(5, rw / 90)), in_ = r + 4;
      for (let i = 0; i < nx; i++) { const cx = x + in_ + (rw - 2 * in_) * i / (nx - 1); extra += `<circle cx="${cx}" cy="${y + in_}" r="${r}" fill="#fff" stroke="#6b6b6b" stroke-width="1.6"/><circle cx="${cx}" cy="${y + rh - in_}" r="${r}" fill="#fff" stroke="#6b6b6b" stroke-width="1.6"/>`; }
      for (let j = 1; j < ny - 1; j++) { const cy = y + in_ + (rh - 2 * in_) * j / (ny - 1); extra += `<circle cx="${x + in_}" cy="${cy}" r="${r}" fill="#fff" stroke="#6b6b6b" stroke-width="1.6"/><circle cx="${x + rw - in_}" cy="${cy}" r="${r}" fill="#fff" stroke="#6b6b6b" stroke-width="1.6"/>`; }
    }
  } else if (look === 'plakat') {
    face = `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="#ffffff" stroke="#b8b8b8" stroke-width="1.2"/><rect x="${x + rw * .08}" y="${y + rh * .08}" width="${rw * .84}" height="${rh * .5}" fill="#ffd100"/><rect x="${x + rw * .08}" y="${y + rh * .66}" width="${rw * .6}" height="${Math.max(2, rh * .05)}" fill="#141414"/><rect x="${x + rw * .08}" y="${y + rh * .75}" width="${rw * .42}" height="${Math.max(2, rh * .035)}" fill="#141414" opacity=".5"/><circle cx="${x + rw * .74}" cy="${y + rh * .33}" r="${Math.min(rw, rh) * .14}" fill="#e6007e"/>`;
  }
  // Schnittmarken
  const cm = 10, cg = 5;
  let marks = '';
  [[x, y, -1, -1], [x + rw, y, 1, -1], [x, y + rh, -1, 1], [x + rw, y + rh, 1, 1]].forEach(([cx, cy, dx, dy]) => {
    marks += `<line x1="${cx + dx * cg}" y1="${cy}" x2="${cx + dx * (cg + cm)}" y2="${cy}"/><line x1="${cx}" y1="${cy + dy * cg}" x2="${cx}" y2="${cy + dy * (cg + cm)}"/>`;
  });
  // Maßketten
  const hy = y - (small ? 24 : 30), vx = x + rw + (small ? 24 : 32), tk = 6;
  const lblW = small ? 56 : 66, fz = small ? 12 : 14;
  const dim = `<g stroke="currentColor" stroke-width="1.2">
<line x1="${x}" y1="${y - 4}" x2="${x}" y2="${hy - tk}" opacity=".5"/><line x1="${x + rw}" y1="${y - 4}" x2="${x + rw}" y2="${hy - tk}" opacity=".5"/>
<line x1="${x}" y1="${hy}" x2="${x + rw}" y2="${hy}"/><line x1="${x - tk / 2}" y1="${hy + tk / 2}" x2="${x + tk / 2}" y2="${hy - tk / 2}"/><line x1="${x + rw - tk / 2}" y1="${hy + tk / 2}" x2="${x + rw + tk / 2}" y2="${hy - tk / 2}"/>
<line x1="${x + rw + 4}" y1="${y}" x2="${vx + tk}" y2="${y}" opacity=".5"/><line x1="${x + rw + 4}" y1="${y + rh}" x2="${vx + tk}" y2="${y + rh}" opacity=".5"/>
<line x1="${vx}" y1="${y}" x2="${vx}" y2="${y + rh}"/><line x1="${vx - tk / 2}" y1="${y + tk / 2}" x2="${vx + tk / 2}" y2="${y - tk / 2}"/><line x1="${vx - tk / 2}" y1="${y + rh + tk / 2}" x2="${vx + tk / 2}" y2="${y + rh - tk / 2}"/></g>
<rect x="${x + rw / 2 - lblW / 2}" y="${hy - 11}" width="${lblW}" height="22" rx="3" style="fill:var(--paper2)"/>
<text x="${x + rw / 2}" y="${hy}" text-anchor="middle" dominant-baseline="central" font-family="Fira Sans, sans-serif" font-weight="600" font-size="${fz}" fill="currentColor">${fmt(w)} cm</text>
<g transform="translate(${vx} ${y + rh / 2}) rotate(-90)"><rect x="${-lblW / 2}" y="-11" width="${lblW}" height="22" rx="3" style="fill:var(--paper2)"/><text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-family="Fira Sans, sans-serif" font-weight="600" font-size="${fz}" fill="currentColor">${fmt(h)} cm</text></g>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = defs + shadow + face + extra + `<g stroke="currentColor" stroke-width="1" opacity=".55">${marks}</g>` + dim;
}
const fmt = n => (Math.round(n * 10) / 10).toLocaleString('de-DE');

/* Kopf: Menü */
const menuBtn = $('.menubtn'), nav = $('#nav');
if (menuBtn && nav) {
  const close = () => { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open));
    if (open) nav.querySelector('a')?.focus();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { close(); menuBtn.focus(); } });
  document.addEventListener('click', e => { if (nav.classList.contains('open') && !nav.contains(e.target) && !menuBtn.contains(e.target)) close(); });
}
updateCount();

/* Echte Fotos laden, wenn erreichbar (auf geil-druck.de); sonst bleibt die Zeichnung */
$$('.photo[data-photo]').forEach(fig => {
  const img = new Image();
  img.alt = fig.dataset.alt || '';
  img.decoding = 'async';
  img.onload = () => { fig.querySelector('svg')?.remove(); fig.prepend(img); };
  img.src = S.photoBase + fig.dataset.photo;
});

/* Einblenden */
const reveals = $$('.reveal');
if (reveals.length) {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) reveals.forEach(el => el.classList.add('in'));
  else { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {rootMargin: '0px 0px -8% 0px'}); reveals.forEach(el => io.observe(el)); }
}

/* Öffnungszeiten: jetzt geöffnet? */
$$('[data-open]').forEach(el => {
  const now = new Date(), d = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
  const h = S.hours[d];
  if (h && m >= h[0] && m < h[1]) el.textContent = 'Jetzt geöffnet bis ' + String(Math.floor(h[1] / 60)).padStart(2, '0') + ':' + String(h[1] % 60).padStart(2, '0') + ' Uhr';
  else el.textContent = 'Gerade geschlossen';
});

/* Produktreihe: Vor/Zurück */
$$('[data-row]').forEach(wrap => {
  const row = $('.prod-row', wrap);
  const step = dir => { const card = row.firstElementChild; row.scrollBy({left: dir * ((card?.offsetWidth || 260) + 16), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); };
  $('.prev', wrap)?.addEventListener('click', () => step(-1));
  $('.next', wrap)?.addEventListener('click', () => step(1));
  row.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } });
});

/* Toast */
let toastT;
function toast(html) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.innerHTML = html; requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 5200);
}

/* Upload-Feld (Demo: Dateien werden geprüft, aber nicht übertragen) */
function initDrop(drop, onChange) {
  const input = $('input[type=file]', drop), list = $('.filelist', drop.parentElement), err = $('.err', drop.parentElement);
  let files = [];
  const ok = f => {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!S.fileTypes.includes(ext)) return 'Dateiformat .' + ext + ' wird nicht angenommen.';
    if (f.size > S.maxMB * 1048576) return 'Die Datei ist größer als ' + S.maxMB + ' MB.';
    return '';
  };
  const render = () => {
    list.innerHTML = files.map((f, i) => `<li><span>${esc(f.name)} <span class="muted">(${(f.size / 1048576).toFixed(1).replace('.', ',')} MB)</span></span><button type="button" data-i="${i}">Entfernen</button></li>`).join('');
    onChange && onChange(files);
  };
  const add = fl => {
    let msg = '';
    [...fl].forEach(f => { const m = ok(f); if (m) msg = m; else files.push({name: f.name, size: f.size}); });
    if (!input.multiple) files = files.slice(-1);
    err.textContent = msg; render();
  };
  input.addEventListener('change', () => { add(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => add(e.dataTransfer.files));
  list.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) { files.splice(+b.dataset.i, 1); render(); } });
  return {get: () => files, clear: () => { files = []; render(); }};
}

/* Formularprüfung */
function setErr(el, msg) {
  const box = el.closest('.field') || el.parentElement;
  let e = box.querySelector(':scope > .err');
  if (!e) { e = document.createElement('div'); e.className = 'err'; e.id = (el.id || el.name) + '-err'; box.append(e); }
  e.textContent = msg || '';
  if (msg) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', e.id); } else el.removeAttribute('aria-invalid');
  return !msg;
}
function validate(form) {
  let first = null;
  $$('[data-req]', form).forEach(el => {
    if (el.closest('[hidden]')) { setErr(el, ''); return; }
    let msg = '';
    if (el.type === 'checkbox') msg = el.checked ? '' : el.dataset.req;
    else if (!el.value.trim()) msg = el.dataset.req;
    else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) msg = 'Bitte eine gültige E-Mail-Adresse eingeben.';
    else if (el.dataset.pattern && !new RegExp(el.dataset.pattern).test(el.value.trim())) msg = el.dataset.patternMsg;
    if (!setErr(el, msg) && !first) first = el;
  });
  if (first) first.focus();
  return !first;
}

/* Schnellrechner (Startseite) */
const quick = $('#quick');
if (quick) {
  const svg = $('#quick-svg'), out = $('#quick-price');
  const read = () => { const p = prod(quick.prod.value); return {p, o: {w: num(quick.w.value), h: num(quick.h.value), opt: p.option ? p.option.def : '', oesen: true}}; };
  const upd = () => {
    const {p, o} = read();
    const mw = p.max.w, mh = p.max.h;
    const valid = o.w >= p.minSize && o.h >= p.minSize && o.w <= mw && o.h <= mh;
    const optTxt = p.option ? ', ' + p.option.values.find(v => v[0] === p.option.def)[1] : (p.eyelets ? ', mit Ösen' : '');
    out.innerHTML = valid ? `${eur(unitPrice(p, o))}<small>Beispielpreis für 1 Stück${esc(optTxt)}</small>` : `–<small>Maße von ${p.minSize} bis ${mw} × ${mh} cm</small>`;
    drawSign(svg, p, o);
  };
  quick.addEventListener('input', upd);
  quick.addEventListener('submit', e => {
    e.preventDefault();
    const {p, o} = read();
    store.set('gd-prefill', {slug: p.slug, w: o.w, h: o.h});
    location.href = U(GD.urls[p.slug]);
  });
  new ResizeObserver(upd).observe(svg);
}

/* Kleine Werkzeichnungen auf Produktkarten */
$$('svg[data-mini]').forEach(svg => {
  const p = prod(svg.dataset.mini); if (!p) return;
  const o = {w: p.w, h: p.h, opt: p.option ? p.option.def : '', oesen: true, format: p.formats ? 'a1' : '', text: p.sample};
  const ro = new ResizeObserver(() => drawSign(svg, p, o)); ro.observe(svg);
});

/* Konfigurator (Produktseite) */
const conf = $('#conf');
if (conf) {
  const p = prod(conf.dataset.product), svg = $('#conf-svg');
  const pre = store.get('gd-prefill', null);
  if (pre && pre.slug === p.slug && conf.w) { conf.w.value = pre.w; conf.h.value = pre.h; store.del('gd-prefill'); }
  const up = initDrop($('.drop', conf), () => {});
  const qty = conf.qty;
  const read = () => ({
    w: conf.w ? num(conf.w.value) : 0, h: conf.h ? num(conf.h.value) : 0,
    opt: conf.opt ? (conf.querySelector('[name=opt]:checked') || {}).value : '',
    format: conf.format ? conf.format.value : '',
    oesen: conf.oesen ? conf.oesen.checked : false,
    color: conf.color ? conf.color.value : '', text: conf.text ? conf.text.value : ''
  });
  const sizeOk = o => p.kind === 'format' || (o.w >= p.minSize && o.h >= p.minSize && o.w <= p.max.w && o.h <= p.max.h);
  const upd = () => {
    const o = read(), q = Math.max(1, Math.min(999, Math.round(num(qty.value)) || 1));
    const ok = sizeOk(o);
    if (p.kind !== 'format') {
      setErr(conf.w, o.w && (o.w < p.minSize || o.w > p.max.w) ? `Breite von ${p.minSize} bis ${p.max.w} cm.` : '');
      setErr(conf.h, o.h && (o.h < p.minSize || o.h > p.max.h) ? `Höhe von ${p.minSize} bis ${p.max.h} cm.` : '');
    }
    const t = lineTotal(p, o, q);
    $('#s-unit').textContent = ok ? eur(t.unit) : '–';
    $('#s-qty').textContent = q + ' Stück';
    $('#s-disc').textContent = t.disc ? '− ' + Math.round(t.disc * 100) + ' %' : 'keiner';
    $('#s-total').textContent = ok ? eur(t.total) : '–';
    if (p.eyelets) $('#s-eyelets').textContent = o.oesen ? eyelets(o.w, o.h, p.eyelets.gap) + ' Ösen' : 'ohne';
    $('#up-wrap').hidden = conf.querySelector('[name=design]:checked').value !== 'upload';
    drawSign(svg, p, o);
    return {o, q, ok, t};
  };
  conf.addEventListener('input', upd);
  conf.addEventListener('change', upd);
  $$('.stepper button', conf).forEach(b => b.addEventListener('click', () => { qty.value = Math.max(1, Math.min(999, (parseInt(qty.value, 10) || 1) + (+b.dataset.d))); upd(); }));
  new ResizeObserver(() => upd()).observe(svg);
  conf.addEventListener('submit', e => {
    e.preventDefault();
    const {o, q, ok, t} = upd();
    if (!ok) { (conf.w || conf.h)?.focus(); return; }
    const design = conf.querySelector('[name=design]:checked').value;
    const files = up.get();
    const dErr = $('#up-wrap .err');
    if (design === 'upload' && !files.length) { dErr.textContent = 'Bitte Druckdaten auswählen – oder „Gestaltung durch uns“ wählen.'; $('#up-wrap input[type=file]').focus(); return; }
    dErr.textContent = '';
    const cart = getCart();
    cart.push({id: Date.now(), slug: p.slug, name: p.name, o, qty: q, unit: t.unit, summary: summary(p, o), design, file: files[0] || null, montage: conf.montage?.checked || false, note: conf.note?.value.trim() || ''});
    setCart(cart);
    toast(`<span>${esc(p.name)} liegt im Warenkorb.</span><a href="${U(GD.urls.cart)}">Zum Warenkorb →</a>`);
  });
}

/* Warenkorb */
const cartRoot = $('#cart');
function cartTotals(cart) {
  return cart.reduce((a, i) => { const p = prod(i.slug); return a + (p ? lineTotal(p, i.o, i.qty).total : 0); }, 0);
}
if (cartRoot) {
  const render = () => {
    const cart = getCart();
    if (!cart.length) { cartRoot.innerHTML = `<div class="empty"><h2>Ihr Warenkorb ist leer</h2><p style="margin-inline:auto">Schilder, Folien, Banner und Plakate stellen Sie in wenigen Schritten selbst zusammen.</p><a class="btn" href="${U(GD.urls.shop)}">Produkte ansehen</a></div>`; return; }
    const rows = cart.map((i, idx) => {
      const p = prod(i.slug); const t = lineTotal(p, i.o, i.qty);
      const meta = [esc(i.summary), i.design === 'upload' ? 'Druckdaten: ' + esc(i.file ? i.file.name : '–') : 'Gestaltung durch Geil-Druck (Aufwand nach Absprache)', i.montage ? 'Montage gewünscht – Angebot folgt' : '', i.note ? 'Hinweis: ' + esc(i.note) : ''].filter(Boolean).join('<br>');
      return `<tr><td data-l="Produkt"><div class="item-name">${esc(i.name)}</div><div class="item-meta">${meta}</div></td>
<td data-l="Menge"><div class="stepper"><button type="button" aria-label="Menge verringern" data-q="${idx}" data-d="-1">−</button><input type="number" min="1" max="999" value="${i.qty}" data-qi="${idx}" aria-label="Menge"><button type="button" aria-label="Menge erhöhen" data-q="${idx}" data-d="1">+</button></div><button class="linkbtn" type="button" data-rm="${idx}">Entfernen</button></td>
<td class="num" data-l="Stückpreis">${eur(t.unit)}${t.disc ? `<div class="item-meta">− ${Math.round(t.disc * 100)} % Mengenrabatt</div>` : ''}</td><td class="num" data-l="Summe"><strong>${eur(t.total)}</strong></td></tr>`;
    }).join('');
    const sub = cartTotals(cart);
    cartRoot.innerHTML = `<table class="stack"><thead><tr><th>Produkt</th><th>Menge</th><th class="num">Stückpreis</th><th class="num">Summe</th></tr></thead><tbody>${rows}</tbody></table>
<div class="sum" style="max-width:420px;margin-left:auto"><dl><dt>Zwischensumme</dt><dd>${eur(sub)}</dd><dt>Abholung in Eutritzsch</dt><dd>kostenlos</dd><dt>Versand</dt><dd>${eur(S.shipping)}</dd></dl>
<p class="legal">Beispielpreise inkl. MwSt. Versandart wählen Sie an der Kasse.</p><a class="btn btn--yellow" href="${U(GD.urls.checkout)}" style="width:100%">Zur Kasse</a></div>`;
  };
  cartRoot.addEventListener('click', e => {
    const cart = getCart();
    const b = e.target.closest('[data-q]'); if (b) { const i = +b.dataset.q; cart[i].qty = Math.max(1, Math.min(999, cart[i].qty + (+b.dataset.d))); setCart(cart); render(); $(`[data-q="${i}"][data-d="${b.dataset.d}"]`)?.focus(); return; }
    const r = e.target.closest('[data-rm]'); if (r) { cart.splice(+r.dataset.rm, 1); setCart(cart); render(); }
  });
  cartRoot.addEventListener('change', e => { const inp = e.target.closest('[data-qi]'); if (inp) { const cart = getCart(); cart[+inp.dataset.qi].qty = Math.max(1, Math.min(999, parseInt(inp.value, 10) || 1)); setCart(cart); render(); } });
  render();
}

/* Kasse */
const co = $('#checkout');
if (co) {
  const side = $('#co-sum');
  const ship = () => (co.querySelector('[name=ship]:checked') || {}).value || 'abholung';
  const renderSide = () => {
    const cart = getCart();
    if (!cart.length) { co.innerHTML = `<div class="empty"><h2>Ihr Warenkorb ist leer</h2><a class="btn" href="${U(GD.urls.shop)}">Produkte ansehen</a></div>`; return; }
    const sub = cartTotals(cart), sc = ship() === 'versand' ? S.shipping : 0;
    $('#addr-note').textContent = ship() === 'versand' ? 'Lieferanschrift und Rechnungsanschrift' : 'Rechnungsanschrift';
    side.innerHTML = `<h2 style="font-size:28px">Ihre Bestellung</h2><ul style="list-style:none;padding:0;margin:0 0 14px;display:grid;gap:10px">${cart.map(i => { const t = lineTotal(prod(i.slug), i.o, i.qty); return `<li style="display:flex;justify-content:space-between;gap:12px"><span><strong>${i.qty} × ${esc(i.name)}</strong><br><span class="muted" style="font-size:14px">${esc(i.summary)}${i.montage ? ' · Montage: Angebot folgt' : ''}</span></span><span style="white-space:nowrap">${eur(t.total)}</span></li>`; }).join('')}</ul>
<div class="sum"><dl><dt>Zwischensumme</dt><dd>${eur(sub)}</dd><dt>${ship() === 'versand' ? 'Versand' : 'Abholung'}</dt><dd>${sc ? eur(sc) : 'kostenlos'}</dd><dt><strong>Gesamt</strong></dt><dd class="total">${eur(sub + sc)}</dd></dl><p class="legal">Beispielpreise inkl. MwSt.</p></div>`;
    return sub + sc;
  };
  co.addEventListener('change', renderSide);
  renderSide();
  const form = $('#co-form');
  form && form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate(form)) return;
    const cart = getCart(); const total = renderSide();
    const order = {no: 'DEMO-' + String(Date.now()).slice(-6), date: new Date().toLocaleDateString('de-DE'), items: cart.map(i => ({name: i.name, qty: i.qty, summary: i.summary})), total, ship: ship(), pay: form.querySelector('[name=pay]:checked').value, name: form.vorname.value + ' ' + form.nachname.value, email: form.email.value};
    store.set('gd-last-order', order); setCart([]);
    location.href = U(GD.urls.thanks);
  });
}

/* Bestätigung */
const thanks = $('#thanks');
if (thanks) {
  const o = store.get('gd-last-order', null);
  if (o) {
    const pay = {ueberweisung: 'Vorkasse per Überweisung', paypal: 'PayPal', karte: 'Kreditkarte'}[o.pay] || o.pay;
    thanks.innerHTML = `<p class="lead">Danke, ${esc(o.name)}. Ihre Bestellung <strong>${esc(o.no)}</strong> vom ${esc(o.date)} ist als Demo eingegangen.</p>
<ul class="ticks">${o.items.map(i => `<li><svg aria-hidden="true"><use href="#i-check"/></svg><span>${i.qty} × ${esc(i.name)} – ${esc(i.summary)}</span></li>`).join('')}</ul>
<p style="margin-top:18px">Gesamt: <strong>${eur(o.total)}</strong> · ${o.ship === 'versand' ? 'Versand' : 'Abholung in der Delitzscher Straße 65'} · ${esc(pay)}</p>
<p class="muted">In der fertigen Version erhält ${esc(o.email)} jetzt eine Bestellbestätigung, und Geil-Druck prüft die Druckdaten, bevor produziert wird.</p>`;
  }
}

/* Anfrageformular */
const inq = $('#inquiry');
if (inq) {
  const up = initDrop($('.drop', inq), () => {});
  const sel = inq.leistung, h = location.hash.slice(1);
  if (sel && h && [...sel.options].some(o => o.value === h)) sel.value = h;
  inq.addEventListener('submit', e => {
    e.preventDefault();
    if (inq.website && inq.website.value) return;
    if (!validate(inq)) return;
    const n = up.get().length;
    $('#inq-ok').hidden = false;
    $('#inq-ok').innerHTML = `<strong>Danke, ${esc(inq.name.value)}.</strong> Ihre Anfrage${n ? ' mit ' + n + (n === 1 ? ' Datei' : ' Dateien') : ''} ist im Entwurf nicht versendet worden – in der fertigen Version landet sie direkt bei Geil-Druck, und Sie bekommen eine Eingangsbestätigung.`;
    $('#inq-ok').focus();
    inq.reset(); up.clear();
  });
}

/* Widerruf in zwei Schritten */
const rv = $('#revoke');
if (rv) {
  const s1 = $('#rv-1'), s2 = $('#rv-2'), s3 = $('#rv-3');
  $('#rv-next').addEventListener('click', () => {
    if (!validate(s1)) return;
    $('#rv-sum').innerHTML = `<li>Name: ${esc(rv.rname.value)}</li><li>E-Mail: ${esc(rv.remail.value)}</li><li>Bestellnummer: ${esc(rv.rorder.value)}</li>`;
    s1.hidden = true; s2.hidden = false; $('#rv-2 h2').focus();
  });
  $('#rv-back').addEventListener('click', () => { s2.hidden = true; s1.hidden = false; rv.rname.focus(); });
  rv.addEventListener('submit', e => { e.preventDefault(); s2.hidden = true; s3.hidden = false; $('#rv-3 h2').focus(); });
}
}
