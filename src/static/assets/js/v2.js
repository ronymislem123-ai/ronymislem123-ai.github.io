/* LINUA – Interaktionen (Fassung 2, 24.11.2026). Ohne Fremdpakete. Inhalte sind auch ohne JavaScript sichtbar. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(pointer: fine)");
  const root = document.documentElement;
  const calm = () => mqReduce.matches || root.classList.contains("no-motion");
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (_) { /* nicht verfügbar */ } },
  };

  /* ---------- Kopfzeile, Fortschritt, Menü ---------- */
  const hd = $("[data-header]");
  const prog = $("[data-progress]");
  const btn = $("[data-menu-btn]");
  const menu = $("[data-menu]");
  const closeMenu = (focusBtn) => {
    if (!menu || menu.hidden) return;
    menu.hidden = true; btn.setAttribute("aria-expanded", "false");
    $("span", btn).textContent = "Menü"; document.body.classList.remove("menu-open");
    if (focusBtn) btn.focus();
  };
  if (btn && menu) {
    btn.addEventListener("click", () => {
      if (!menu.hidden) { closeMenu(false); return; }
      menu.hidden = false; btn.setAttribute("aria-expanded", "true");
      $("span", btn).textContent = "Schließen"; document.body.classList.add("menu-open");
      const first = $("a", menu); if (first) first.focus();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(true); });
    matchMedia("(min-width: 1081px)").addEventListener("change", () => closeMenu(false));
  }

  /* ---------- Seiten-Navigation mit Scrollspy ---------- */
  const pagenav = $("[data-pagenav]");
  const navLinks = pagenav ? $$("a", pagenav) : [];
  const navSecs = navLinks.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const heroEl = $(".hero");
  let activeId = "";
  const pnUl = pagenav ? $("ul", pagenav) : null;
  const pnInd = pnUl ? Object.assign(document.createElement("span"), { className: "pagenav__ind" }) : null;
  if (pnInd) { pnInd.setAttribute("aria-hidden", "true"); pnUl.prepend(pnInd); }
  const setActive = (id) => {
    if (id === activeId) return;
    activeId = id;
    navLinks.forEach((a) => {
      const on = a.hash === `#${id}`;
      a.classList.toggle("is-active", on);
      if (on) {
        a.setAttribute("aria-current", "true");
        const li = a.parentElement;
        if (pnUl.scrollWidth > pnUl.clientWidth) pnUl.scrollTo({ left: li.offsetLeft - pnUl.clientWidth / 2 + li.offsetWidth / 2, behavior: calm() ? "auto" : "smooth" });
        if (pnInd) { pnInd.style.width = `${li.offsetWidth}px`; pnInd.style.transform = `translateX(${li.offsetLeft}px)`; pnInd.style.setProperty("--dc", getComputedStyle(a).getPropertyValue("--dot")); pnInd.classList.add("is-on"); }
      }
      else a.removeAttribute("aria-current");
    });
  };

  /* ---------- Parallax ---------- */
  const para = $$("[data-parallax]");

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = scrollY, vh = innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      if (prog) prog.parentElement.style.setProperty("--p", max > 0 ? clamp(y / max, 0, 1).toFixed(4) : 0);
      if (hd) hd.classList.toggle("is-scrolled", y > 8);
      if (pagenav) {
        const past = heroEl ? heroEl.getBoundingClientRect().bottom < 120 : y > 300;
        pagenav.classList.toggle("is-on", past);
        let cur = "";
        navSecs.forEach((s) => { if (s.getBoundingClientRect().top < vh * 0.4) cur = s.id; });
        setActive(past ? cur : "");
        if (pnInd && !activeId) pnInd.classList.remove("is-on");
      }
      if (!calm()) {
        para.forEach((el) => {
          const r = el.getBoundingClientRect();
          const k = Number(el.dataset.parallax) || 0.08;
          el.style.translate = `0 ${((r.top + r.height / 2 - vh / 2) * -k).toFixed(1)}px`;
        });
      }
      flowUpdate();
    });
  };

  /* ---------- Einblenden ---------- */
  $$("[data-stagger]").forEach((g) => $$(":scope > *", g).forEach((el, i) => el.style.setProperty("--i", i)));
  const revealIO = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      revealIO.unobserve(e.target);
      if (e.target.matches("[data-count]")) countUp(e.target);
      $$("[data-count]", e.target).forEach(countUp);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }) : null;
  $$("[data-reveal], [data-observe], [data-count]").forEach((el) => revealIO ? revealIO.observe(el) : el.classList.add("is-in"));

  /* ---------- Zahlen hochzählen ---------- */
  const fmt = new Intl.NumberFormat("de-DE");
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    const to = Number(el.dataset.count);
    if (calm() || !to) { el.textContent = fmt.format(to); return; }
    const t0 = performance.now(), dur = Number(el.dataset.dur) || 1400;
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      el.textContent = fmt.format(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Tabs (auch Segment-Schalter) ---------- */
  $$("[data-tabs]").forEach((wrap) => {
    const tabs = $$('[role="tab"]', wrap);
    const pill = $(".seg__pill", wrap);
    const movePill = (t) => { if (!pill) return; pill.style.width = `${t.offsetWidth}px`; pill.style.transform = `translateX(${t.offsetLeft}px)`; };
    const select = (t, focus) => {
      tabs.forEach((x) => {
        const on = x === t;
        x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1;
        const p = document.getElementById(x.getAttribute("aria-controls"));
        if (!p) return;
        p.hidden = !on;
        if (on) { p.classList.remove("is-entering"); void p.offsetWidth; p.classList.add("is-entering"); $$("[data-count]", p).forEach((c) => { delete c.dataset.done; countUp(c); }); }
      });
      movePill(t);
      if (focus) t.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (e.key === "Home") { e.preventDefault(); select(tabs[0], true); }
        else if (e.key === "End") { e.preventDefault(); select(tabs[tabs.length - 1], true); }
        else if (dir) { e.preventDefault(); select(tabs[(i + dir + tabs.length) % tabs.length], true); }
      });
    });
    const cur = tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0];
    tabs.forEach((t) => { const p = document.getElementById(t.getAttribute("aria-controls")); if (p && t !== cur) p.hidden = true; });
    const fromHash = () => {
      const target = location.hash && document.getElementById(location.hash.slice(1));
      if (!target) return;
      const t = tabs.find((x) => { const p = document.getElementById(x.getAttribute("aria-controls")); return p && (p === target || p.contains(target)); });
      if (t && t.getAttribute("aria-selected") !== "true") { select(t); requestAnimationFrame(() => target.scrollIntoView()); }
    };
    fromHash(); addEventListener("hashchange", fromHash);
    if (cur) { movePill(cur); addEventListener("resize", () => movePill(tabs.find((t) => t.getAttribute("aria-selected") === "true"))); if (document.fonts) document.fonts.ready.then(() => movePill(tabs.find((t) => t.getAttribute("aria-selected") === "true"))); }
    const first = document.getElementById(cur.getAttribute("aria-controls"));
    if (first && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { first.classList.add("is-entering"); io.disconnect(); } }, { threshold: 0.3 });
      io.observe(first);
    }
  });

  /* ---------- Hero-Bühne: Wechsel der Konzeptprojekte ---------- */
  const rot = $("[data-rotator]");
  if (rot) {
    const groups = $$("[data-slides]", rot).map((g) => $$("[data-slide]", g));
    const dots = $$("[data-goto]", rot);
    const pauseBtn = $("[data-pause]", rot);
    const checks = $(".float--checks", rot);
    const url = $(".win__url", rot);
    const n = groups[0].length;
    let i = 0, timer = 0, paused = calm(), hover = false;
    const show = (k) => {
      i = (k + n) % n;
      groups.forEach((g) => g.forEach((s, j) => { s.classList.toggle("is-active", j === i); s.setAttribute("aria-hidden", j !== i); }));
      dots.forEach((d, j) => d.setAttribute("aria-current", j === i ? "true" : "false"));
      if (url) url.textContent = groups[0][i].dataset.url || "";
      if (checks && !calm()) { checks.classList.remove("is-ticked"); void checks.offsetWidth; setTimeout(() => checks.classList.add("is-ticked"), 120); }
    };
    const plan = () => { clearTimeout(timer); if (!paused && !hover) timer = setTimeout(() => { show(i + 1); plan(); }, 5200); };
    const setPaused = (p) => {
      paused = p; rot.classList.toggle("is-paused", p);
      if (pauseBtn) { pauseBtn.setAttribute("aria-label", p ? "Wechsel starten" : "Wechsel anhalten"); $("use", pauseBtn).setAttribute("href", p ? "#i-play" : "#i-pause"); }
      plan();
    };
    dots.forEach((d, j) => d.addEventListener("click", () => { show(j); plan(); }));
    if (pauseBtn) pauseBtn.addEventListener("click", () => setPaused(!paused));
    rot.addEventListener("pointerenter", () => { hover = true; clearTimeout(timer); });
    rot.addEventListener("pointerleave", () => { hover = false; plan(); });
    rot.addEventListener("focusin", () => { hover = true; clearTimeout(timer); });
    rot.addEventListener("focusout", () => { hover = false; plan(); });
    show(0);
    if (checks) setTimeout(() => checks.classList.add("is-ticked"), calm() ? 0 : 900);
    setPaused(paused);
    // Zeiger-Parallax der schwebenden Karten
    if (fine.matches && !calm()) {
      const floats = $$("[data-depth]", rot);
      rot.addEventListener("pointermove", (e) => {
        const r = rot.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        if (calm()) return;
        floats.forEach((f) => { const d = Number(f.dataset.depth); f.style.translate = `${(x * d).toFixed(1)}px ${(y * d).toFixed(1)}px`; });
      });
      rot.addEventListener("pointerleave", () => floats.forEach((f) => { f.style.translate = ""; }));
    }
  }

  /* ---------- Vorher-nachher-Vergleich ---------- */
  $$("[data-compare]").forEach((cmp) => {
    const input = $("input", cmp);
    const set = (v) => cmp.style.setProperty("--pos", `${v}%`);
    input.addEventListener("input", () => { cmp.classList.remove("is-hint"); set(input.value); });
    const cards = $$(`[data-hl-for="${cmp.id}"]`);
    cards.forEach((c) => {
      const on = () => { cards.forEach((x) => x.classList.toggle("is-on", x === c)); cmp.dataset.show = c.dataset.hl; if (Number(input.value) > 30) { cmp.classList.add("is-hint"); input.value = 8; set(8); } };
      c.addEventListener("click", on); c.addEventListener("focus", on); c.addEventListener("pointerenter", on);
    });
    if (!calm() && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        cmp.classList.add("is-hint");
        setTimeout(() => { input.value = 22; set(22); }, 300);
        setTimeout(() => { input.value = 78; set(78); }, 1300);
        setTimeout(() => { input.value = 50; set(50); }, 2300);
        setTimeout(() => cmp.classList.remove("is-hint"), 3300);
      }, { threshold: 0.5 });
      io.observe(cmp);
    }
  });

  /* ---------- Karussell ---------- */
  $$("[data-carousel]").forEach((car) => {
    const track = $(".car__track", car);
    const prev = $("[data-prev]", car), next = $("[data-next]", car);
    const bar = $(".car__prog span", car);
    const step = () => (track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 18 : 300);
    const upd = () => {
      const max = track.scrollWidth - track.clientWidth;
      const p = max > 0 ? track.scrollLeft / max : 0;
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft > max - 4;
      if (bar) { const w = clamp(track.clientWidth / track.scrollWidth, 0.15, 1); bar.style.setProperty("--w", `${w * 100}%`); bar.style.setProperty("--x", `${p * (1 - w) * 100}%`); }
    };
    if (prev) prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: calm() ? "auto" : "smooth" }));
    if (next) next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: calm() ? "auto" : "smooth" }));
    track.addEventListener("scroll", upd, { passive: true });
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); track.scrollBy({ left: step() }); }
      if (e.key === "ArrowLeft") { e.preventDefault(); track.scrollBy({ left: -step() }); }
    });
    addEventListener("resize", upd); upd();
  });

  /* ---------- Dialoge ---------- */
  $$("[data-modal]").forEach((b) => {
    const dlg = document.getElementById(b.dataset.modal);
    if (!dlg || typeof dlg.showModal !== "function") return;
    b.addEventListener("click", () => dlg.showModal());
  });
  $$("dialog.modal").forEach((dlg) => {
    $$("[data-close]", dlg).forEach((c) => c.addEventListener("click", () => dlg.close()));
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  });

  /* ---------- Ablauf: Linie füllt sich beim Scrollen ---------- */
  const flows = $$("[data-flow]");
  function flowUpdate() {
    flows.forEach((f) => {
      const r = f.getBoundingClientRect(), vh = innerHeight;
      const p = calm() ? 1 : clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      f.style.setProperty("--p", p.toFixed(3));
      const items = $$("li", f);
      items.forEach((li, k) => li.classList.toggle("is-done", p >= (k + 0.35) / items.length));
    });
  }

  /* ---------- Formulare ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  $$("form[data-inbox]").forEach((form) => {
    const status = form.parentElement.querySelector("[data-form-status]");
    const submit = $("button[type=submit]", form);
    const required = $$("[required]", form);
    const setErr = (wrap, msg) => {
      if (!wrap) return;
      wrap.classList.toggle("is-invalid", !!msg);
      let el = $(".err", wrap);
      const input = $("input, textarea, select", wrap);
      if (msg) {
        if (!el) { el = document.createElement("p"); el.className = "err"; el.id = `${wrap.dataset.f || "f"}-err`; wrap.append(el); }
        el.textContent = msg;
        if (input) { input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", [...new Set([...(input.getAttribute("aria-describedby") || "").split(" "), el.id])].filter(Boolean).join(" ")); }
      } else if (el) { el.remove(); if (input) input.removeAttribute("aria-invalid"); }
    };
    const validate = () => {
      const bad = [];
      required.forEach((el) => {
        const wrap = el.closest("[data-f]");
        let msg = "";
        if (el.type === "radio") { if (form.querySelector(`input[name="${el.name}"]:checked`)) { setErr(wrap, ""); return; } msg = "Bitte wählen Sie eine Option."; }
        else if (!el.value.trim()) msg = el.dataset.msg || "Bitte ausfüllen.";
        else if (el.type === "email" && !emailOk(el.value.trim())) msg = "Bitte prüfen Sie die E-Mail-Adresse.";
        setErr(wrap, msg);
        if (msg) bad.push(el);
      });
      return bad;
    };
    form.addEventListener("input", (e) => { const w = e.target.closest(".is-invalid"); if (w) setErr(w, ""); });
    const summary = (d) => [
      `Projekt: ${d.get("projekt") || "–"}`, `Budgetrahmen: ${d.get("budget") || "–"}`, `Zeitrahmen: ${d.get("zeitrahmen") || "–"}`, `Name: ${d.get("name")}`, `Unternehmen: ${d.get("firma") || "–"}`,
      `E-Mail: ${d.get("email")}`, `Telefon: ${d.get("telefon") || "–"}`, `Website: ${d.get("website") || "–"}`, "",
      `Nachricht: ${String(d.get("nachricht") || "")}`,
    ].join("\n");
    const show = (html) => { status.innerHTML = html; status.hidden = false; form.hidden = true; status.focus(); };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bad = validate();
      if (bad.length) { bad[0].focus(); return; }
      const d = new FormData(form);
      const first = esc(String(d.get("name")).trim().split(/\s+/)[0]);
      const ok = (t) => `<span class="form-status__ok" aria-hidden="true"><svg class="i"><use href="#i-check"/></svg></span><p class="form-status__title">${t}</p>`;
      if (d.get("firma_bestaetigung")) { show(ok("Danke!")); return; }
      const label = $(".btn__label", submit), old = label.textContent;
      submit.setAttribute("aria-busy", "true"); submit.disabled = true; label.textContent = "Wird gesendet …";
      let sent = false;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 9000);
        const key = form.dataset.key;
        const res = await fetch(form.dataset.inbox, {
          method: "POST", signal: ctrl.signal, credentials: "omit",
          headers: Object.assign({ "Content-Type": "application/json", apikey: key, Prefer: "return=minimal" }, /^eyJ/.test(key) ? { Authorization: `Bearer ${key}` } : {}),
          body: JSON.stringify({ subject: `Projektanfrage: ${d.get("projekt") || "Kurzanfrage"} – ${d.get("name")}`.slice(0, 200), body: summary(d).slice(0, 8000), name: String(d.get("name")).trim().slice(0, 200), email: String(d.get("email")).trim(), hp: "" }),
        });
        clearTimeout(timer);
        sent = res.ok;
      } catch (_) { sent = false; }
      submit.removeAttribute("aria-busy"); submit.disabled = false; label.textContent = old;
      if (sent) {
        show(`${ok(`Danke, ${first}. Ihre Anfrage ist angekommen.`)}<p>Wir melden uns ${esc(form.dataset.response || "innerhalb von zwei Werktagen")} persönlich – mit einer ersten Einschätzung und einem Terminvorschlag für das kostenlose Erstgespräch.</p>`);
        return;
      }
      const mail = form.dataset.mail;
      const href = `mailto:${mail}?subject=${encodeURIComponent(`Projektanfrage: ${d.get("projekt") || "Kurzanfrage"} – ${d.get("name")}`)}&body=${encodeURIComponent(summary(d))}`;
      show(`<p class="form-status__title">Die Verbindung hat gerade nicht geklappt.</p><p>Ihre Angaben sind nicht verloren: <a href="${href}">E-Mail mit Ihrer Anfrage öffnen</a> oder direkt an <a href="mailto:${mail}">${mail}</a> schreiben.</p>`);
    });
  });


  /* ---------- Toast ---------- */
  let toastEl = null, toastT = 0;
  const toast = (msg) => {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.append(toastEl); }
    toastEl.innerHTML = `<svg class="i" aria-hidden="true"><use href="#i-check"/></svg><span></span>`;
    $("span", toastEl).textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add("is-on"));
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("is-on"), 3200);
  };

  /* ---------- Hauptnavigation: Hover-Pille und Mega-Menü ---------- */
  const hnav = $("[data-hnav]");
  if (hnav && fine.matches) {
    const pill = $(".hd__hover", hnav);
    $$("a", hnav).forEach((a) => a.addEventListener("pointerenter", () => {
      if (a.closest(".mega")) return;
      const r = a.getBoundingClientRect(), n = hnav.getBoundingClientRect();
      pill.style.width = `${r.width}px`; pill.style.height = `${r.height}px`; pill.style.top = `${r.top - n.top}px`; pill.style.transform = `translateX(${r.left - n.left}px)`;
      hnav.classList.add("is-hovering");
    }));
    hnav.addEventListener("pointerleave", () => hnav.classList.remove("is-hovering"));
  }
  const megaWrap = $("[data-mega-wrap]"), mega = $("[data-mega]"), megaBtn = $("[data-mega-btn]");
  if (megaWrap && mega && megaBtn) {
    let t = 0;
    const open = (v) => { mega.hidden = !v; megaBtn.setAttribute("aria-expanded", v); };
    megaBtn.addEventListener("click", () => { open(mega.hidden); if (!mega.hidden) $("a", mega).focus(); });
    if (fine.matches) {
      megaWrap.addEventListener("pointerenter", () => { clearTimeout(t); t = setTimeout(() => open(true), 120); });
      megaWrap.addEventListener("pointerleave", () => { clearTimeout(t); t = setTimeout(() => open(false), 220); });
    }
    megaWrap.addEventListener("focusout", (e) => { if (!megaWrap.contains(e.relatedTarget)) open(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !mega.hidden) { open(false); megaBtn.focus(); } });
  }

  /* ---------- Suche (Strg + K) ---------- */
  const pal = $("[data-palette]");
  if (pal && typeof pal.showModal === "function") {
    const input = $("[data-palette-input]", pal), list = $("[data-palette-list]", pal);
    const icons = { Seite: "layers", Abschnitt: "right", Frage: "chat" };
    let data = null, hits = [], sel = 0;
    const norm = (x) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const hl = (txt, q) => { const e = esc(txt); if (!q) return e; const i = norm(txt).indexOf(q); return i < 0 ? e : `${esc(txt.slice(0, i))}<mark>${esc(txt.slice(i, i + q.length))}</mark>${esc(txt.slice(i + q.length))}`; };
    const render = () => {
      const q = norm(input.value.trim());
      const words = q.split(/\s+/).filter(Boolean);
      hits = (data || []).map((d) => {
        const h = norm(`${d.t} ${d.d}`);
        if (!words.every((w) => h.includes(w))) return null;
        let s = 0; words.forEach((w) => { if (norm(d.t).includes(w)) s += 3; if (norm(d.t).startsWith(w)) s += 2; });
        s += d.g === "Seite" ? 2 : d.g === "Abschnitt" ? 1 : 0;
        return { d, s };
      }).filter(Boolean).sort((a, b) => b.s - a.s).slice(0, q ? 12 : 9).map((x) => x.d);
      sel = 0;
      list.innerHTML = hits.length ? hits.map((d, i) => `<li role="option" id="po-${i}" data-c="${esc(d.c)}" aria-selected="${i === 0}"><span class="pdot"><svg class="i" aria-hidden="true"><use href="#i-${icons[d.g] || "right"}"/></svg></span><b>${hl(d.t, words[0])}</b><small>${esc(d.d)}</small><span class="pg">${esc(d.g)}</span></li>`).join("")
        : `<li class="palette__empty" role="option" aria-disabled="true">Nichts gefunden. Versuchen Sie „Preis“, „Shop“ oder „Dauer“ – oder schreiben Sie uns direkt.</li>`;
      input.setAttribute("aria-activedescendant", hits.length ? "po-0" : "");
    };
    const move = (k) => { if (!hits.length) return; const items = $$("li[id]", list); items[sel].setAttribute("aria-selected", "false"); sel = (sel + k + hits.length) % hits.length; items[sel].setAttribute("aria-selected", "true"); items[sel].scrollIntoView({ block: "nearest" }); input.setAttribute("aria-activedescendant", items[sel].id); };
    const go = (i) => { const d = hits[i]; if (!d) return; pal.close(); location.href = pal.dataset.root + d.u; };
    const openPal = async () => {
      if (!pal.open) pal.showModal();
      input.value = ""; input.focus();
      if (!data) { try { data = await (await fetch(pal.dataset.index)).json(); } catch (_) { data = []; } }
      render();
    };
    $$("[data-palette-open]").forEach((b) => b.addEventListener("click", () => { closeMenu(false); openPal(); }));
    document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPal(); } });
    input.addEventListener("input", render);
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      if (e.key === "Enter") { e.preventDefault(); go(sel); }
      if (e.key === "Escape") { e.preventDefault(); pal.close(); }
    });
    list.addEventListener("click", (e) => { const li = e.target.closest("li[id]"); if (li) go(Number(li.id.slice(3))); });
    pal.addEventListener("click", (e) => { if (e.target === pal) pal.close(); });
  }

  /* ---------- Mobile Schnellleiste ---------- */
  const tabbar = $("[data-tabbar]");
  let lastY = scrollY;
  if (tabbar) addEventListener("scroll", () => { const y = scrollY; tabbar.classList.toggle("is-hidden", y > lastY + 4 && y > 200); if (y < lastY - 4) tabbar.classList.remove("is-hidden"); lastY = y; }, { passive: true });

  /* ---------- Neigung und Magnet ---------- */
  if (fine.matches && !calm()) {
    $$("[data-tilt]").forEach((el) => {
      el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; el.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-4px)`; });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(); el.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.25).toFixed(1)}px`; });
      el.addEventListener("pointerleave", () => { el.style.translate = ""; });
    });
  }

  /* ---------- Filter (Arbeiten) ---------- */
  $$("[data-filter]").forEach((bar) => {
    const items = $$(`#${bar.dataset.filter} [data-cat]`);
    const btns = $$("button", bar);
    btns.forEach((b) => {
      const n = b.dataset.f === "alle" ? items.length : items.filter((it) => it.dataset.cat.split(" ").includes(b.dataset.f)).length;
      const c = $("small", b); if (c) c.textContent = n;
      b.addEventListener("click", () => {
        btns.forEach((x) => x.setAttribute("aria-pressed", x === b));
        items.forEach((it) => {
          const on = b.dataset.f === "alle" || it.dataset.cat.split(" ").includes(b.dataset.f);
          it.classList.toggle("is-filtered-out", !on);
          if (on) { it.classList.remove("is-in-filter"); void it.offsetWidth; it.classList.add("is-in-filter"); }
        });
      });
    });
  });

  /* ---------- Fragen durchsuchen ---------- */
  const qs = $("[data-qsearch]");
  if (qs) {
    const groups = $$(".qgroup"), empty = $("[data-qempty]");
    const norm = (x) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    qs.addEventListener("input", () => {
      const q = norm(qs.value.trim()); let total = 0;
      groups.forEach((g) => {
        let n = 0;
        $$("details", g).forEach((d) => { const on = !q || norm(d.textContent).includes(q); d.classList.toggle("is-filtered-out", !on); if (on) n++; });
        g.classList.toggle("is-filtered-out", !n); total += n;
      });
      if (empty) empty.hidden = total > 0;
    });
    const hashQ = location.hash && document.getElementById(location.hash.slice(1));
    if (hashQ && hashQ.tagName === "DETAILS") hashQ.open = true;
  }

  /* ---------- Preisrechner ---------- */
  const calc = $("[data-calc]");
  if (calc) {
    const out = $("[data-calc-total]", calc), mo = $("[data-calc-month]", calc), lines = $("[data-calc-lines]", calc), big = $(".big", calc);
    const upd = () => {
      let once = 0, month = 0; const rows = [];
      $$("input:checked", calc).forEach((i) => { const v = Number(i.dataset.price || 0); if (i.dataset.monthly) month += v; else once += v; if (v) rows.push(`<li><span>${esc(i.dataset.label)}</span><span>${fmt.format(v)} €${i.dataset.monthly ? " / Monat" : ""}</span></li>`); });
      out.textContent = fmt.format(once); mo.textContent = month ? `+ ${fmt.format(month)} € im Monat, monatlich kündbar` : "Ohne laufende Betreuung";
      lines.innerHTML = rows.join("");
      big.classList.remove("bump"); void big.offsetWidth; big.classList.add("bump");
    };
    calc.addEventListener("change", upd); upd();
    calc.addEventListener("submit", (e) => e.preventDefault());
    const go = $("[data-calc-go]", calc);
    if (go) go.addEventListener("click", () => {
      const sel = $$("input:checked", calc).filter((i) => Number(i.dataset.price)).map((i) => `- ${i.dataset.label}`);
      store.set("linua-calc", `Meine Auswahl aus dem Preisrechner (Richtwert ab ${out.textContent} €):\n${sel.join("\n")}\n\nMein Vorhaben: `);
    });
  }

  /* ---------- Kontakt: Überblick und Übernahme aus dem Check ---------- */
  const offers = { "Neue Website": "Paket „Auftritt“ ab 1.745 € – oder „Signatur“ ab 3.450 €", "Relaunch": "Kurz-Audit, danach „Auftritt“ oder „Signatur“", "Landingpage": "Paket „Fokus“ ab 745 €", "Onlineshop": "Festpreis nach Anforderungsanalyse", "Webanwendung / Schnittstelle": "Festpreis je Projektphase", "Betreuung": "Care ab 25 € im Monat", "Etwas anderes": "Klären wir im Erstgespräch" };
  const ov = $("[data-overview]");
  const big = $("form[data-big]");
  if (ov && big) {
    const set = (k, v, fallback) => { const el = $(`[data-ov=${k}]`, ov); el.textContent = v || fallback; el.classList.toggle("is-set", !!v); };
    const upd = () => { const d = new FormData(big); const p = d.get("projekt"); set("projekt", p, "noch nicht gewählt"); set("budget", d.get("budget"), "noch nicht gewählt"); set("zeit", d.get("zeitrahmen"), "noch nicht gewählt"); set("angebot", offers[p], "Wählen Sie Ihr Vorhaben"); };
    big.addEventListener("change", upd);
    const fromCheck = store.get("linua-check");
    const fromCalc = store.get("linua-calc");
    if (fromCalc && /rechner/.test(location.search)) {
      const t = big.elements.nachricht; if (t && !t.value) t.value = fromCalc;
      toast("Ihre Auswahl aus dem Preisrechner ist eingetragen");
    }
    if (fromCheck && /check/.test(location.search)) {
      const t = big.elements.nachricht; if (t && !t.value) t.value = fromCheck;
      const r = big.querySelector('input[name="projekt"][value="Relaunch"]'); if (r) r.checked = true;
      toast("Ihr Check-Ergebnis ist eingetragen");
    }
    upd();
  }

  /* ---------- Schwellen-Check als Assistent ---------- */
  const wiz = $("[data-check]");
  if (wiz) {
    const cards = $$(".qcard2", wiz), bar = $$(".wiz__bar i", wiz);
    const prev = $(".wiz__prev", wiz), next = $(".wiz__next", wiz), count = $("[data-wiz-n]", wiz), grpName = $("[data-wiz-g]", wiz);
    let i = 0;
    wiz.classList.add("is-wizard");
    const show = (k, dir) => {
      i = clamp(k, 0, cards.length - 1);
      cards.forEach((c, j) => { c.classList.toggle("is-cur", j === i); c.classList.toggle("from-left", dir < 0); });
      bar.forEach((b, j) => { b.classList.toggle("is-done", !!$("input:checked", cards[j])); b.classList.toggle("is-cur", j === i && !$("input:checked", cards[j])); });
      count.textContent = i + 1; grpName.textContent = cards[i].dataset.gname;
      prev.disabled = i === 0;
      wiz.classList.toggle("is-last", i === cards.length - 1);
      wiz.style.setProperty("--qc", getComputedStyle(cards[i]).getPropertyValue("--qc"));
    };
    prev.addEventListener("click", () => show(i - 1, -1));
    next.addEventListener("click", () => { if (!$("input:checked", cards[i])) { $("input", cards[i]).focus(); toast("Bitte wählen Sie eine Antwort"); return; } show(i + 1, 1); $("input", cards[i]).focus({ preventScroll: true }); });
    wiz.addEventListener("change", (e) => {
      const c = e.target.closest(".qcard2"); bar[cards.indexOf(c)].classList.add("is-done");
      if (wiz.classList.contains("is-wizard") && i < cards.length - 1) setTimeout(() => { show(i + 1, 1); $("input", cards[i]).focus({ preventScroll: true }); }, calm() ? 0 : 380);
    });
    show(0, 1);
    const out = $("[data-check-result]");
    const groups = [["erkennen", "Erkennen", "var(--blue)"], ["vertrauen", "Vertrauen", "var(--green)"], ["handeln", "Handeln", "var(--red)"]];
    wiz.addEventListener("submit", (e) => {
      e.preventDefault();
      const missing = cards.findIndex((q) => !$("input:checked", q));
      if (missing > -1) { show(missing, -1); toast(`Frage ${missing + 1} ist noch offen`); $("input", cards[missing]).focus(); return; }
      let total = 0; const rows = [], lines = ["Ergebnis meines Schwellen-Checks:"];
      groups.forEach(([key, name, col], gi) => {
        const qs2 = cards.filter((q) => q.dataset.group === key);
        let score = 0; const tips = [];
        qs2.forEach((q) => { const v = Number($("input:checked", q).value); score += v; if (v < 2) tips.push(q.dataset.tip); });
        total += score;
        const level = score >= 5 ? "stark" : score >= 3 ? "ausbaufähig" : "kritisch";
        lines.push(`${name}: ${level} (${score} von 6)`);
        rows.push(`<div class="rrow" style="--qc: ${col}; --i: ${gi}"><h3 class="h3">${name}<span class="badge" data-level="${level}">${level} · ${score}/6</span></h3>${tips.length ? `<ul>${tips.map((t) => `<li><svg class="i" aria-hidden="true"><use href="#i-arrow"/></svg>${esc(t)}</li>`).join("")}</ul>` : "<p class=\"muted\" style=\"margin-top:8px\">Hier ist Ihre Website schon gut aufgestellt.</p>"}</div>`);
      });
      const pct = Math.round(total / 18 * 100);
      store.set("linua-check", lines.join("\n") + "\n\nMeine Website: ");
      out.innerHTML = `<div class="gcard" data-observe><h2 class="h2" tabindex="-1">Ihr Ergebnis</h2><div class="gauge"><div class="gauge__ring" style="--v: ${pct}"><svg viewBox="0 0 110 110"><circle class="bg" cx="55" cy="55" r="46"/><circle class="fg" cx="55" cy="55" r="46"/></svg><b>${pct}</b></div><p>von 100 Punkten. ${pct >= 75 ? "Eine starke Basis – mit Feinschliff holen Sie mehr heraus." : pct >= 45 ? "Solide, aber Besucher springen an einzelnen Schwellen ab." : "Hier verlieren Sie wahrscheinlich viele Besucher."}</p></div><div class="actions"><a class="btn btn--light" href="../kontakt.html?von=check"><span>Ergebnis besprechen</span><svg class="i" aria-hidden="true"><use href="#i-arrow"/></svg></a></div><p class="gcard__note">Bleibt nur in Ihrem Browser. Gesendet wird nichts.</p></div><div class="result__rows">${rows.join("")}<p><button class="link" type="button" data-restart style="border:0;background:none;padding:0"><span>Check neu starten</span><svg class="i" aria-hidden="true"><use href="#i-arrow"/></svg></button></p></div>`;
      out.hidden = false; wiz.hidden = true;
      requestAnimationFrame(() => { $(".gcard", out).classList.add("is-in"); $("h2", out).focus(); });
      toast("Auswertung fertig");
      $("[data-restart]", out).addEventListener("click", () => { wiz.reset(); out.hidden = true; wiz.hidden = false; bar.forEach((b) => b.classList.remove("is-done")); show(0, -1); $("input", cards[0]).focus(); });
    });
  }

  /* ---------- Wort-Einblendung in Überschriften ---------- */
  if (innerWidth >= 700) {
    $$(".hero .h1, .phero .h1, .sec__head .h2, .ctaband .h2").forEach((h) => {
      if (h.querySelector("*")) return;
      const words = h.textContent.trim().split(/\s+/);
      h.innerHTML = words.map((w, k) => `<span class="w"><span style="--wi: ${k}">${esc(w)}</span></span>`).join(" ");
      h.classList.add("wsplit");
      if (h.closest(".hero, .phero")) requestAnimationFrame(() => setTimeout(() => h.classList.add("is-on"), 60));
      else if (revealIO) revealIO.observe(h); else h.classList.add("is-in");
    });
  }

  /* ---------- Szenen: Objekte reagieren auf den Zeiger ---------- */
  if (fine.matches) {
    $$("[data-scene]").forEach((sc) => {
      const items = $$("[data-depth]", sc);
      sc.addEventListener("pointermove", (e) => {
        if (calm()) return;
        const r = sc.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        items.forEach((f) => { const d = Number(f.dataset.depth); f.style.translate = `${(x * d).toFixed(1)}px ${(y * d).toFixed(1)}px`; });
      });
      sc.addEventListener("pointerleave", () => items.forEach((f) => { f.style.translate = ""; }));
    });
  }

  /* ---------- Cursor-Punkt (der Besucher) ---------- */
  if (fine.matches) {
    const cur = Object.assign(document.createElement("div"), { className: "cursor" });
    cur.setAttribute("aria-hidden", "true"); cur.innerHTML = "<span></span>"; document.body.append(cur);
    let tx = -100, ty = -100, cx = -100, cy = -100, raf = 0;
    const loop = () => { cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22; cur.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`; raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3 ? requestAnimationFrame(loop) : 0; };
    addEventListener("pointermove", (e) => {
      if (calm() || e.pointerType !== "mouse") { cur.classList.remove("is-on"); return; }
      tx = e.clientX; ty = e.clientY; cur.classList.add("is-on");
      const lab = e.target.closest("[data-cursor]");
      const act = e.target.closest("a, button, label, summary, input, select, textarea");
      cur.classList.toggle("is-label", !!lab); cur.classList.toggle("is-big", !lab && !!act);
      if (lab) $("span", cur).textContent = lab.dataset.cursor;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener("pointerleave", () => cur.classList.remove("is-on"));
    addEventListener("scroll", () => cur.classList.remove("is-label", "is-big"), { passive: true });
  }

  /* ---------- Horizontale Erzählung (Arbeiten) ---------- */
  const hs = $(".hscroll");
  const hsTrack = hs ? $(".car__track", hs) : null;
  const hsBar = hs ? $(".car__prog span", hs) : null;
  const hsSetup = () => {
    if (!hs) return;
    const on = innerWidth >= 1100 && !calm();
    hs.classList.toggle("is-pinned", on);
    if (!on) { hs.style.removeProperty("--hs-h"); hsTrack.style.removeProperty("--hx"); return; }
    const dist = Math.max(0, hsTrack.scrollWidth - hsTrack.clientWidth + 40);
    hs.dataset.dist = dist;
    hs.style.setProperty("--hs-h", `${innerHeight + dist}px`);
    hsUpdate();
  };
  function hsUpdate() {
    if (!hs || !hs.classList.contains("is-pinned")) return;
    const r = hs.getBoundingClientRect(), dist = Number(hs.dataset.dist);
    const p = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    hsTrack.style.setProperty("--hx", (p * dist).toFixed(1));
    if (hsBar) { const w = clamp(hsTrack.clientWidth / hsTrack.scrollWidth, 0.15, 1); hsBar.style.setProperty("--w", `${w * 100}%`); hsBar.style.setProperty("--x", `${p * (1 - w) * 100}%`); }
  }
  if (hs) { hsSetup(); addEventListener("resize", hsSetup); addEventListener("scroll", () => requestAnimationFrame(hsUpdate), { passive: true }); addEventListener("load", hsSetup); }

  /* ---------- Hero-Bühne kippt beim Herausscrollen ---------- */
  const heroStage = $(".hero .stage");
  if (heroStage) addEventListener("scroll", () => requestAnimationFrame(() => {
    if (calm()) { heroStage.style.transform = ""; return; }
    const p = clamp(scrollY / (innerHeight * 0.9), 0, 1);
    heroStage.style.transform = `perspective(1400px) rotateX(${(p * 10).toFixed(2)}deg) scale(${(1 - p * 0.06).toFixed(3)}) translateY(${(p * 40).toFixed(1)}px)`;
  }), { passive: true });

  /* ---------- Schalter: Animationen pausieren ---------- */
  const mt = $("[data-motion-toggle]");
  const mtSync = () => { const off = root.classList.contains("no-motion"); mt.setAttribute("aria-pressed", off); mt.textContent = off ? "Animationen fortsetzen" : "Animationen pausieren"; };
  if (mt) {
    mtSync();
    mt.addEventListener("click", () => {
      const off = !root.classList.contains("no-motion");
      root.classList.toggle("no-motion", off);
      try { localStorage.setItem("linua-motion", off ? "off" : "on"); } catch (_) { /* nicht verfügbar */ }
      mtSync(); hsSetup(); onScroll();
      $$("[data-depth]").forEach((f) => { f.style.translate = ""; });
      toast(off ? "Animationen pausiert" : "Animationen laufen wieder");
    });
  }
  mqReduce.addEventListener("change", () => { para.forEach((el) => { el.style.translate = ""; }); hsSetup(); onScroll(); });

  /* ---------- Start ---------- */
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();
  
})();
