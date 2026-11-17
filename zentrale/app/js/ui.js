/* Agentur-Zentrale – UI-Bausteine: Icons, Dialoge, Formulare, Menüs, Diagramme, Drag & Drop */
(function () {
  'use strict';
  const esc = F.esc;
  const ic = (n, cls) => '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ((window.ICONS || {})[n] || '') + '</svg>';
  const UI = { ic };
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  UI.$ = $; UI.$$ = $$;
  const setPath = (o, p, v) => { const k = p.split('.'); let c = o; for (let i = 0; i < k.length - 1; i++) { c[k[i]] = Object.assign({}, c[k[i]] || {}); c = c[k[i]]; } c[k[k.length - 1]] = v; };
  UI.setPath = setPath;

  /* ---------- Toasts ---------- */
  UI.toast = function (msg, o) {
    o = o || {}; let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast' + (o.bad ? ' bad' : '');
    t.innerHTML = (o.bad ? ic('alert') : ic('circleCheck')) + '<span>' + esc(msg) + '</span>' + (o.action ? '<button type="button">' + esc(o.action.label) + '</button>' : '');
    if (o.action) t.querySelector('button').onclick = () => { o.action.fn(); t.remove(); };
    box.appendChild(t); setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, o.ms || (o.bad ? 6500 : 3200));
  };
  UI.err = function (e, fallback) { console.warn(e); UI.toast((e && (e.friendly || e.message)) || fallback || 'Etwas ist schiefgelaufen.', { bad: true }); };
  UI.run = async function (fn, okMsg) { try { const r = await fn(); if (okMsg) UI.toast(okMsg); return r; } catch (e) { UI.err(e); return undefined; } };

  /* ---------- Dialoge ---------- */
  const stack = [];
  UI.dialog = function (o) {
    const scrim = document.createElement('div'); scrim.className = 'scrim' + (o.drawer ? ' drawer-scrim' : '');
    scrim.innerHTML = o.drawer
      ? '<div class="drawer" role="dialog" aria-modal="true"><div class="dh"><h3>' + esc(o.title || '') + '</h3><span class="grow"></span>' + (o.headTools || '') + '<button class="btn ghost icon sm" data-close aria-label="Schließen">' + ic('x') + '</button></div><div class="db">' + (o.body || '') + '</div></div>'
      : '<div class="dialog ' + (o.size || '') + (o.cls ? ' ' + o.cls : '') + '" role="dialog" aria-modal="true">' + (o.raw ? o.body : '<div class="dh"><h3>' + esc(o.title || '') + '</h3><span class="grow"></span>' + (o.headTools || '') + '<button class="btn ghost icon sm" data-close aria-label="Schließen">' + ic('x') + '</button></div><div class="db">' + (o.body || '') + '</div>' + (o.foot ? '<div class="df">' + o.foot + '</div>' : '')) + '</div>';
    document.body.appendChild(scrim);
    const close = (v) => { if (!scrim.isConnected) return; scrim.remove(); const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1); if (o.onClose) o.onClose(v); };
    const api = { el: scrim, close, o };
    stack.push(api);
    scrim.addEventListener('mousedown', e => { if (e.target === scrim && !o.sticky) close(); });
    $$('[data-close]', scrim).forEach(b => b.addEventListener('click', () => close()));
    if (o.onMount) o.onMount(scrim, close);
    const f = scrim.querySelector('[autofocus], .in:not([readonly])'); if (f && !o.noFocus && window.innerWidth > 900) setTimeout(() => f.focus(), 30);
    return api;
  };
  UI.closeTop = () => { const t = stack[stack.length - 1]; if (t) { t.close(); return true; } return false; };
  UI.hasDialog = () => stack.length > 0;
  UI.confirm = function (o) {
    return new Promise(res => {
      UI.dialog({
        title: o.title || 'Sicher?', size: 'narrow', body: '<p class="muted mt-0">' + (o.html || esc(o.text || '')) + '</p>',
        foot: '<button class="btn" data-close>Abbrechen</button><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-ok>' + esc(o.ok || 'OK') + '</button>',
        onMount: (el, close) => { el.querySelector('[data-ok]').onclick = () => { res(true); close(true); }; }, onClose: v => { if (!v) res(false); }
      });
    });
  };
  UI.prompt = function (o) {
    return new Promise(res => {
      UI.form({ title: o.title, size: 'narrow', fields: [{ key: 'v', label: o.label, type: o.type || 'text', required: o.required, full: true, placeholder: o.placeholder }], values: { v: o.value || '' }, submit: o.ok || 'OK', onSubmit: v => { res(v.v); }, onCancel: () => res(null) });
    });
  };

  /* ---------- Formulare ---------- */
  const optList = (opts, val, empty) => (empty != null ? '<option value="">' + esc(empty) + '</option>' : '') + (opts || []).map(x => { const v = Array.isArray(x) ? x[0] : x.id; const l = Array.isArray(x) ? x[1] : x.label; return '<option value="' + esc(v) + '"' + (String(val ?? '') === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('');
  UI.optList = optList;
  UI.companyOptions = () => D.all('companies').sort((a, b) => a.name.localeCompare(b.name, 'de')).map(c => ({ id: c.id, label: c.name + (c.status === 'kunde' ? '' : ' (' + L.labelOf(L.COMPANY_STATUS, c.status) + ')') }));
  UI.contactOptions = companyId => D.all('contacts').filter(c => !companyId || c.companyId === companyId).map(c => ({ id: c.id, label: F.personName(c) + (companyId ? '' : ' · ' + O.companyName(c.companyId)) }));
  UI.projectOptions = companyId => D.all('projects').filter(p => !companyId || p.companyId === companyId).map(p => ({ id: p.id, label: p.name }));
  UI.dealOptions = companyId => D.all('deals').filter(d => !companyId || d.companyId === companyId).map(d => ({ id: d.id, label: d.title }));
  function fieldHtml(f, values) {
    if (f.type === 'section') return '<div class="field full"><div class="nav-group" style="margin:6px 0 0">' + esc(f.label) + '</div></div>';
    if (f.type === 'html') return '<div class="field ' + (f.full ? 'full' : '') + '">' + f.html + '</div>';
    const v = L.getPath(values, f.key); const id = 'f_' + f.key.replace(/\./g, '_');
    const req = f.required ? ' <span class="req">*</span>' : '';
    let input = '';
    const common = ' id="' + id + '" name="' + esc(f.key) + '"' + (f.required ? ' required' : '') + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + (f.readonly ? ' readonly' : '') + (f.autofocus ? ' autofocus' : '');
    switch (f.type) {
      case 'textarea': input = '<textarea class="in"' + common + ' rows="' + (f.rows || 4) + '">' + esc(v || '') + '</textarea>'; break;
      case 'select': input = '<select class="in"' + common + '>' + optList(typeof f.options === 'function' ? f.options(values) : f.options, v, f.empty) + '</select>'; break;
      case 'company': input = '<select class="in"' + common + '>' + optList(UI.companyOptions(), v, f.empty || '– ohne Kunde –') + '</select>'; break;
      case 'contact': input = '<select class="in"' + common + ' data-dep="companyId">' + optList(UI.contactOptions(values.companyId), v, '– kein Kontakt –') + '</select>'; break;
      case 'project': input = '<select class="in"' + common + ' data-dep="companyId">' + optList(UI.projectOptions(values.companyId), v, '– kein Projekt –') + '</select>'; break;
      case 'deal': input = '<select class="in"' + common + ' data-dep="companyId">' + optList(UI.dealOptions(values.companyId), v, '– kein Deal –') + '</select>'; break;
      case 'checkbox': input = '<label class="toggle"><input type="checkbox"' + common + (v ? ' checked' : '') + '><span class="sw"></span><span>' + esc(f.text || '') + '</span></label>'; break;
      case 'money': input = '<input class="in num" inputmode="decimal"' + common + ' value="' + esc(v == null || v === '' ? '' : String(v).replace('.', ',')) + '">'; break;
      case 'number': input = '<input class="in num" type="number" step="' + (f.step || 'any') + '"' + common + ' value="' + esc(v ?? '') + '">'; break;
      default: input = '<input class="in" type="' + (f.type || 'text') + '"' + common + ' value="' + esc(v ?? '') + '"' + (f.type === 'email' ? ' autocomplete="email" inputmode="email"' : '') + (f.type === 'tel' ? ' inputmode="tel"' : '') + '>';
    }
    return '<div class="field' + (f.full || f.type === 'textarea' ? ' full' : '') + '" data-field="' + esc(f.key) + '">' + (f.type === 'checkbox' && !f.label ? '' : '<label for="' + id + '">' + esc(f.label || '') + req + '</label>') + input + (f.help ? '<div class="help">' + f.help + '</div>' : '') + '<div class="err hide"></div></div>';
  }
  UI.fieldHtml = fieldHtml;
  UI.readForm = function (el, fields, base) {
    const out = JSON.parse(JSON.stringify(base || {}));
    for (const f of fields) {
      if (!f.key || f.type === 'section' || f.type === 'html') continue;
      const inp = el.querySelector('[name="' + CSS.escape(f.key) + '"]'); if (!inp) continue;
      let v = f.type === 'checkbox' ? inp.checked : inp.value;
      if (f.type === 'money' || f.type === 'number') v = v === '' ? (f.type === 'money' ? 0 : null) : L.num(v);
      if (typeof v === 'string') v = v.trim();
      if (['company', 'contact', 'project', 'deal'].includes(f.type) && v === '') v = null;
      setPath(out, f.key, v);
    }
    return out;
  };
  UI.validate = function (el, fields, vals) {
    let ok = true;
    for (const f of fields) {
      if (!f.key || f.type === 'section' || f.type === 'html') continue;
      const box = el.querySelector('[data-field="' + CSS.escape(f.key) + '"]'); if (!box) continue;
      const v = L.getPath(vals, f.key); let msg = '';
      if (f.required && (v == null || v === '' || v === false)) msg = 'Bitte ausfüllen.';
      else if (f.type === 'email' && v && !L.validEmail(v)) msg = 'Bitte eine gültige E-Mail-Adresse eingeben.';
      else if (f.validate) msg = f.validate(v, vals) || '';
      const er = box.querySelector('.err'); const inp = box.querySelector('.in');
      if (er) { er.textContent = msg; er.classList.toggle('hide', !msg); } if (inp) inp.classList.toggle('bad', !!msg);
      if (msg) ok = false;
    }
    return ok;
  };
  UI.form = function (o) {
    let values = JSON.parse(JSON.stringify(o.values || {}));
    const body = (o.intro || '') + '<form class="form" novalidate>' + o.fields.map(f => fieldHtml(f, values)).join('') + '</form>' + (o.after || '');
    const dlg = UI.dialog({
      title: o.title, size: o.size || (o.fields.length > 8 ? 'wide' : ''), body, sticky: true,
      foot: (o.footLeft ? '<div class="left">' + o.footLeft + '</div>' : '') + '<button class="btn" data-close>Abbrechen</button><button class="btn primary" data-submit>' + esc(o.submit || 'Speichern') + '</button>',
      onMount: (el, close) => {
        const form = el.querySelector('form');
        const rerenderDeps = () => {
          const cur = UI.readForm(el, o.fields, values);
          $$('[data-dep="companyId"]', el).forEach(sel => {
            const f = o.fields.find(x => x.key === sel.name); const opts = f.type === 'contact' ? UI.contactOptions(cur.companyId) : f.type === 'project' ? UI.projectOptions(cur.companyId) : UI.dealOptions(cur.companyId);
            const keep = sel.value; sel.innerHTML = optList(opts, keep, f.type === 'contact' ? '– kein Kontakt –' : f.type === 'project' ? '– kein Projekt –' : '– kein Deal –');
          });
          if (o.onChange) o.onChange(cur, el);
        };
        form.addEventListener('change', e => { if (e.target.name === 'companyId' || o.onChange) rerenderDeps(); });
        const submit = async () => {
          const vals = UI.readForm(el, o.fields, values);
          if (!UI.validate(el, o.fields, vals)) { const b = el.querySelector('.in.bad'); if (b) b.focus(); return; }
          const btn = el.querySelector('[data-submit]'); btn.disabled = true;
          try { const r = await o.onSubmit(vals, el); if (r !== false) close(true); }
          catch (e) { UI.err(e); }
          finally { btn.disabled = false; }
        };
        el.querySelector('[data-submit]').onclick = submit;
        form.addEventListener('submit', e => { e.preventDefault(); submit(); });
        form.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } });
        if (o.onMount) o.onMount(el, close);
      },
      onClose: v => { if (!v && o.onCancel) o.onCancel(); }
    });
    return dlg;
  };

  /* ---------- Kontextmenü ---------- */
  let openMenu = null;
  UI.menu = function (anchor, items) {
    if (openMenu) openMenu.remove();
    const m = document.createElement('div'); m.className = 'menu'; m.setAttribute('role', 'menu');
    m.innerHTML = items.filter(Boolean).map((it, i) => it.sep ? '<div class="sep"></div>' : it.label && it.heading ? '<div class="lbl">' + esc(it.label) + '</div>' : '<button type="button" data-i="' + i + '" class="' + (it.danger ? 'danger' : '') + '">' + (it.icon ? ic(it.icon) : '') + '<span>' + esc(it.label) + '</span>' + (it.hint ? '<span class="faint small" style="margin-left:auto">' + esc(it.hint) + '</span>' : '') + '</button>').join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect(); const mw = m.offsetWidth, mh = m.offsetHeight;
    let x = r.right - mw; if (x < 8) x = Math.min(r.left, window.innerWidth - mw - 8); let y = r.bottom + 6; if (y + mh > window.innerHeight - 8) y = Math.max(8, r.top - mh - 6);
    m.style.left = x + 'px'; m.style.top = y + 'px';
    const list = items.filter(Boolean);
    m.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b) return; const it = list[Number(b.dataset.i)]; close(); if (it && it.fn) it.fn(); });
    const close = () => { m.remove(); document.removeEventListener('mousedown', outside, true); if (openMenu === m) openMenu = null; };
    const outside = e => { if (!m.contains(e.target)) close(); };
    setTimeout(() => document.addEventListener('mousedown', outside, true), 0);
    openMenu = m; return close;
  };
  UI.closeMenu = () => { if (openMenu) { openMenu.remove(); openMenu = null; return true; } return false; };

  /* ---------- Leerzustand ---------- */
  UI.empty = (icon, title, text, action) => '<div class="empty"><div class="ico">' + ic(icon, 'l') + '</div><h4>' + esc(title) + '</h4><p>' + esc(text || '') + '</p>' + (action || '') + '</div>';

  /* ---------- Diagramme (SVG, Hover-Tooltips, Dataviz-Palette) ---------- */
  const Viz = {}; UI.Viz = Viz;
  let tip = null;
  const tipEl = () => { if (!tip) { tip = document.createElement('div'); tip.className = 'viz-tip'; document.body.appendChild(tip); } return tip; };
  Viz.showTip = (html, x, y) => { const t = tipEl(); t.innerHTML = html; t.classList.add('on'); const w = t.offsetWidth, h = t.offsetHeight; let left = x + 14, top = y - h - 10; if (left + w > window.innerWidth - 8) left = x - w - 14; if (top < 8) top = y + 14; t.style.left = left + 'px'; t.style.top = top + 'px'; };
  Viz.hideTip = () => { if (tip) tip.classList.remove('on'); };
  const niceMax = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
  const tickFmt = (v, money) => { if (money) return Math.abs(v) >= 10000 ? (v / 1000).toLocaleString('de-DE') + ' Tsd.' : v.toLocaleString('de-DE'); return v.toLocaleString('de-DE'); };
  const rr = (x, y, w, h, r) => { if (h <= 0) return ''; r = Math.min(r, w / 2, h); return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z'; };
  Viz.legend = series => series.length > 1 ? '<div class="legend">' + series.map(s => '<span><i class="sw" style="background:' + s.color + '"></i>' + esc(s.name) + '</span>').join('') + '</div>' : '';
  Viz.bars = function (el, o) {
    const W = Math.max(280, el.clientWidth || 600), H = o.height || 220, ml = 46, mr = 8, mt = 10, mb = 24;
    const n = o.labels.length, S = o.series; const max = niceMax(Math.max(1, ...S.flatMap(s => s.values.map(v => Math.max(0, v || 0)))));
    const iw = W - ml - mr, ih = H - mt - mb, band = iw / n, gap = 2, bw = Math.min(24, (band * 0.7 - gap * (S.length - 1)) / S.length);
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Diagramm') + '">';
    for (let i = 0; i <= 4; i++) { const v = max * i / 4, y = mt + ih - ih * i / 4; svg += '<line class="' + (i ? 'gl' : 'ax') + '" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (ml - 6) + '" y="' + (y + 3.5) + '" text-anchor="end">' + tickFmt(v, o.money) + '</text>'; }
    const every = Math.ceil(n / Math.floor(iw / 44));
    o.labels.forEach((l, i) => {
      const cx = ml + band * i + band / 2; const gw = S.length * bw + (S.length - 1) * gap; let x = cx - gw / 2;
      S.forEach(s => { const v = Math.max(0, s.values[i] || 0); const h = ih * v / max; svg += '<path d="' + rr(x, mt + ih - h, bw, h, 4) + '" fill="' + s.color + '"/>'; x += bw + gap; });
      if (i % every === 0) svg += '<text x="' + cx + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(l) + '</text>';
      svg += '<rect class="hit" data-i="' + i + '" x="' + (ml + band * i) + '" y="' + mt + '" width="' + band + '" height="' + ih + '"/>';
    });
    svg += '</svg>';
    el.innerHTML = '<div class="viz">' + svg + '</div>' + Viz.legend(S);
    const fmt = o.fmt || (v => F.money(v, 0));
    el.querySelectorAll('.hit').forEach(h => {
      const i = Number(h.dataset.i);
      const show = e => { const p = e.touches ? e.touches[0] : e; Viz.showTip('<div class="h">' + esc(o.tipLabels ? o.tipLabels[i] : o.labels[i]) + '</div>' + S.map(s => '<div class="r"><span><i class="sw" style="background:' + s.color + '"></i>' + esc(s.name) + '</span><b>' + fmt(s.values[i] || 0) + '</b></div>').join(''), p.clientX, p.clientY); h.style.fill = 'var(--hover)'; };
      h.addEventListener('mousemove', show); h.addEventListener('touchstart', show, { passive: true });
      h.addEventListener('mouseleave', () => { Viz.hideTip(); h.style.fill = ''; }); h.addEventListener('touchend', () => setTimeout(() => { Viz.hideTip(); h.style.fill = ''; }, 1500));
    });
  };
  Viz.line = function (el, o) {
    const W = Math.max(280, el.clientWidth || 600), H = o.height || 200, ml = 46, mr = 14, mt = 12, mb = 24;
    const n = o.labels.length, S = o.series; const max = niceMax(Math.max(1, ...S.flatMap(s => s.values.map(v => v || 0))));
    const iw = W - ml - mr, ih = H - mt - mb; const X = i => ml + (n === 1 ? iw / 2 : iw * i / (n - 1)); const Y = v => mt + ih - ih * (v || 0) / max;
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Diagramm') + '">';
    for (let i = 0; i <= 4; i++) { const v = max * i / 4, y = mt + ih - ih * i / 4; svg += '<line class="' + (i ? 'gl' : 'ax') + '" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (ml - 6) + '" y="' + (y + 3.5) + '" text-anchor="end">' + tickFmt(v, o.money) + '</text>'; }
    const every = Math.ceil(n / Math.floor(iw / 44));
    o.labels.forEach((l, i) => { if (i % every === 0) svg += '<text x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(l) + '</text>'; });
    S.forEach(s => {
      const pts = s.values.map((v, i) => X(i) + ',' + Y(v)).join(' ');
      if (s.area) svg += '<polygon points="' + X(0) + ',' + (mt + ih) + ' ' + pts + ' ' + X(n - 1) + ',' + (mt + ih) + '" fill="' + s.color + '" opacity=".1"/>';
      svg += '<polyline points="' + pts + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      svg += '<circle cx="' + X(n - 1) + '" cy="' + Y(s.values[n - 1]) + '" r="4" fill="' + s.color + '" stroke="var(--panel)" stroke-width="2"/>';
    });
    svg += '<line class="cross" x1="0" x2="0" y1="' + mt + '" y2="' + (mt + ih) + '"/><rect class="hit" x="' + ml + '" y="' + mt + '" width="' + iw + '" height="' + ih + '"/></svg>';
    el.innerHTML = '<div class="viz">' + svg + '</div>' + Viz.legend(S);
    const hit = el.querySelector('.hit'), cross = el.querySelector('.cross'), svgEl = el.querySelector('svg'); const fmt = o.fmt || (v => F.money(v, 0));
    const move = e => {
      const p = e.touches ? e.touches[0] : e; const r = svgEl.getBoundingClientRect(); const sx = (p.clientX - r.left) * W / r.width;
      const i = Math.max(0, Math.min(n - 1, Math.round((sx - ml) / (iw / Math.max(1, n - 1))))); cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.style.opacity = 1;
      Viz.showTip('<div class="h">' + esc(o.tipLabels ? o.tipLabels[i] : o.labels[i]) + '</div>' + S.map(s => '<div class="r"><span><i class="sw" style="background:' + s.color + '"></i>' + esc(s.name) + '</span><b>' + fmt(s.values[i] || 0) + '</b></div>').join(''), p.clientX, p.clientY);
    };
    hit.addEventListener('mousemove', move); hit.addEventListener('touchmove', move, { passive: true }); hit.addEventListener('touchstart', move, { passive: true });
    const out = () => { cross.style.opacity = 0; Viz.hideTip(); }; hit.addEventListener('mouseleave', out); hit.addEventListener('touchend', () => setTimeout(out, 1500));
  };
  Viz.hbars = function (rows, o) {
    o = o || {}; const max = Math.max(1, ...rows.map(r => r.value || 0));
    if (!rows.length) return '<div class="faint small">Keine Daten im Zeitraum.</div>';
    return '<div class="hbars">' + rows.map(r => '<div class="hbar" title="' + esc(r.label + ': ' + (o.fmt || F.money)(r.value)) + '"><span class="lbl">' + esc(r.label) + '</span><span class="track"><i style="width:' + (r.value > 0 ? Math.max(0.8, 100 * r.value / max) : 0) + '%;background:' + (r.color || 'var(--s1)') + '"></i></span><b class="num small">' + (o.fmt || (v => F.money(v, 0)))(r.value) + '</b></div>').join('') + '</div>';
  };
  Viz.segbar = function (parts) {
    const tot = parts.reduce((s, p) => s + (p.value || 0), 0); if (!tot) return '<div class="segbar"><i style="flex:1;background:var(--sunken)"></i></div>';
    return '<div class="segbar" role="img" aria-label="' + esc(parts.map(p => p.label + ' ' + F.money(p.value)).join(', ')) + '">' + parts.filter(p => p.value > 0).map(p => '<i title="' + esc(p.label + ': ' + F.money(p.value)) + '" style="flex:' + p.value + ';background:' + p.color + '"></i>').join('') + '</div>' +
      '<div class="legend">' + parts.map(p => '<span><i class="sw" style="background:' + p.color + '"></i>' + esc(p.label) + ' · <b class="num">' + F.money(p.value, 0) + '</b></span>').join('') + '</div>';
  };
  Viz.spark = function (values, color) {
    const W = 90, H = 26, n = values.length, max = Math.max(1, ...values), min = Math.min(0, ...values);
    const pts = values.map((v, i) => (i * W / Math.max(1, n - 1)).toFixed(1) + ',' + (H - 3 - (H - 6) * (v - min) / (max - min || 1)).toFixed(1)).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="' + (color || 'var(--viz-muted)') + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  };

  /* ---------- Kanban: Drag & Drop (Maus sofort, Touch per langem Druck) ---------- */
  UI.kanban = function (root, onDrop) {
    let drag = null;
    const start = (card, p) => {
      const r = card.getBoundingClientRect(); const ghost = card.cloneNode(true); ghost.classList.add('ghost'); ghost.style.width = r.width + 'px'; ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px';
      document.body.appendChild(ghost); card.classList.add('placeholder');
      drag = { card, ghost, dx: p.clientX - r.left, dy: p.clientY - r.top, over: null }; document.body.style.userSelect = 'none';
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { }
    };
    const move = p => {
      if (!drag) return; drag.ghost.style.left = (p.clientX - drag.dx) + 'px'; drag.ghost.style.top = (p.clientY - drag.dy) + 'px';
      drag.ghost.style.display = 'none'; const under = document.elementFromPoint(p.clientX, p.clientY); drag.ghost.style.display = '';
      const col = under && under.closest('.col[data-col]'); if (drag.over && drag.over !== col) drag.over.classList.remove('over'); if (col && root.contains(col)) { col.classList.add('over'); drag.over = col; } else drag.over = null;
      const sc = root.querySelector('.kanban') || root; const rr2 = sc.getBoundingClientRect();
      if (p.clientX > rr2.right - 40) sc.scrollLeft += 14; else if (p.clientX < rr2.left + 40) sc.scrollLeft -= 14;
    };
    const end = () => {
      if (!drag) return; const d = drag; drag = null; d.ghost.remove(); d.card.classList.remove('placeholder'); document.body.style.userSelect = '';
      if (d.over) { d.over.classList.remove('over'); const to = d.over.dataset.col; if (to !== d.card.closest('.col').dataset.col) onDrop(d.card.dataset.id, to); }
      root._suppressClick = Date.now();
    };
    root.addEventListener('pointerdown', e => {
      const card = e.target.closest('.kcard[data-id]'); if (!card || e.button > 0 || e.target.closest('button,a,input,select')) return;
      const sx = e.clientX, sy = e.clientY; let timer = null, started = false;
      const isTouch = e.pointerType === 'touch';
      if (isTouch) timer = setTimeout(() => { started = true; start(card, { clientX: sx, clientY: sy }); }, 320);
      const pm = ev => {
        if (started) { ev.preventDefault(); move(ev); return; }
        if (isTouch) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) cleanup(); return; }
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) { started = true; start(card, { clientX: sx, clientY: sy }); move(ev); }
      };
      const pu = () => { cleanup(); if (started) end(); };
      const cleanup = () => { clearTimeout(timer); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); window.removeEventListener('pointercancel', pu); card.removeEventListener('touchmove', tm); };
      const tm = ev => { if (started) ev.preventDefault(); };
      window.addEventListener('pointermove', pm, { passive: false }); window.addEventListener('pointerup', pu); window.addEventListener('pointercancel', pu);
      card.addEventListener('touchmove', tm, { passive: false });
    });
    root.addEventListener('contextmenu', e => { if (e.target.closest('.kcard')) e.preventDefault(); });
  };

  window.UI = UI; window.ic = ic;
})();
