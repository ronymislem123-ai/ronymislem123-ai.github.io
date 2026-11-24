/* LINUA – Interaktionen (Fassung 2, 24.11.2026). Ohne Fremdpakete. Inhalte sind auch ohne JavaScript sichtbar. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(pointer: fine)");
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
  const setActive = (id) => {
    if (id === activeId) return;
    activeId = id;
    navLinks.forEach((a) => {
      const on = a.hash === `#${id}`;
      a.classList.toggle("is-active", on);
      if (on) { a.setAttribute("aria-current", "true"); a.scrollIntoView({ block: "nearest", inline: "center", behavior: mqReduce.matches ? "auto" : "smooth" }); }
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
      }
      if (!mqReduce.matches) {
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
    if (mqReduce.matches || !to) { el.textContent = fmt.format(to); return; }
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
    let i = 0, timer = 0, paused = mqReduce.matches, hover = false;
    const show = (k) => {
      i = (k + n) % n;
      groups.forEach((g) => g.forEach((s, j) => { s.classList.toggle("is-active", j === i); s.setAttribute("aria-hidden", j !== i); }));
      dots.forEach((d, j) => d.setAttribute("aria-current", j === i ? "true" : "false"));
      if (url) url.textContent = groups[0][i].dataset.url || "";
      if (checks && !mqReduce.matches) { checks.classList.remove("is-ticked"); void checks.offsetWidth; setTimeout(() => checks.classList.add("is-ticked"), 120); }
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
    if (checks) setTimeout(() => checks.classList.add("is-ticked"), mqReduce.matches ? 0 : 900);
    setPaused(paused);
    // Zeiger-Parallax der schwebenden Karten
    if (fine.matches && !mqReduce.matches) {
      const floats = $$("[data-depth]", rot);
      rot.addEventListener("pointermove", (e) => {
        const r = rot.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        floats.forEach((f) => { const d = Number(f.dataset.depth); f.style.transform = `translate(${(x * d).toFixed(1)}px, ${(y * d).toFixed(1)}px)`; });
      });
      rot.addEventListener("pointerleave", () => floats.forEach((f) => { f.style.transform = ""; }));
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
    if (!mqReduce.matches && "IntersectionObserver" in window) {
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
    if (prev) prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: mqReduce.matches ? "auto" : "smooth" }));
    if (next) next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: mqReduce.matches ? "auto" : "smooth" }));
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
      const p = mqReduce.matches ? 1 : clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
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
        if (!el.value.trim()) msg = el.dataset.msg || "Bitte ausfüllen.";
        else if (el.type === "email" && !emailOk(el.value.trim())) msg = "Bitte prüfen Sie die E-Mail-Adresse.";
        setErr(wrap, msg);
        if (msg) bad.push(el);
      });
      return bad;
    };
    form.addEventListener("input", (e) => { const w = e.target.closest(".is-invalid"); if (w) setErr(w, ""); });
    const summary = (d) => [
      `Projekt: ${d.get("projekt") || "–"}`, `Name: ${d.get("name")}`, `Unternehmen: ${d.get("firma") || "–"}`,
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

  /* ---------- Start ---------- */
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();
  mqReduce.addEventListener("change", () => { para.forEach((el) => { el.style.translate = ""; }); onScroll(); });
})();
