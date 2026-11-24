/* LINUA – Spur, Menü, Umbau, Formulare, Schwellen-Check. Ohne Fremdpakete. */
(() => {
  "use strict";
  const doc = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  const mqDesk = matchMedia("(min-width: 1024px)");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (_) {} },
  };

  /* ---------- Menü ---------- */
  const menuBtn = $("[data-menu-btn]");
  const menu = $("[data-menu]");
  const closeMenu = (focusBtn) => {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    doc.style.overflow = "";
    if (focusBtn) menuBtn.focus();
  };
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", () => {
      if (menu.hidden) {
        menu.hidden = false;
        menuBtn.setAttribute("aria-expanded", "true");
        doc.style.overflow = "hidden";
        const first = $("a", menu);
        if (first) first.focus();
      } else closeMenu(true);
    });
    menu.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(true); });
    menuBtn.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(true); });
    $$("a", menu).forEach((a) => a.addEventListener("click", () => closeMenu(false)));
    mqDesk.addEventListener("change", () => closeMenu(false));
  }

  /* ---------- Kopfzeile ausblenden beim Runterscrollen ---------- */
  const header = $("[data-header]");
  let lastY = scrollY;

  /* ---------- Die Spur ---------- */
  const spur = $("[data-spur]");
  const dot = spur && $(".spur__dot", spur);
  const spurNav = $("[data-spur-nav]");
  const links = spurNav ? $$("a[data-spur-link]", spurNav) : [];
  const targets = links.map((a) => document.getElementById(a.dataset.spurLink)).filter(Boolean);
  const hero = $(".hero");
  const startEl = $(".hero .display, .page-head .h1");
  let y0 = 220, y1 = 600, maxScroll = 1, marks = [];

  const measure = () => {
    const vh = innerHeight;
    const hh = header ? header.offsetHeight : 80;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    if (startEl) {
      const r = startEl.getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(startEl).fontSize) * 0.98;
      y0 = r.top + scrollY + lh / 2 - 7;
    } else y0 = hh + 120;
    y0 = clamp(y0, hh + 24, vh * 0.6);
    y1 = vh - 56;
    if (hero) hero.style.setProperty("--here-y", `${y0 - hero.offsetTop + 7}px`);
    marks = targets.map((t) => clamp(t.getBoundingClientRect().top + scrollY - hh - 8, 0, maxScroll));
    links.forEach((a, i) => {
      const y = y0 + (marks[i] / maxScroll) * (y1 - y0);
      a.parentElement.style.setProperty("--y", `${Math.round(y - 15)}px`);
    });
    if (hero && links.length) hero.classList.toggle("here-crowded", (marks[0] / maxScroll) * (y1 - y0) < 34);
    const door = $(".door");
    if (door) {
      const field = $('input:not([type="hidden"]):not([name="firma_bestaetigung"]), textarea', door);
      if (field) door.style.setProperty("--door-line", `${Math.round(field.getBoundingClientRect().bottom - door.getBoundingClientRect().top)}px`);
    }
  };

  const update = () => {
    const y = scrollY;
    if (header && !(menu && !menu.hidden)) {
      const down = y > lastY + 4, up = y < lastY - 4;
      if (down && y > 260 && !header.contains(document.activeElement)) header.classList.add("is-hidden");
      else if (up || y < 120) header.classList.remove("is-hidden");
    }
    lastY = y;
    const p = clamp(y / maxScroll, 0, 1);
    let active = -1;
    marks.forEach((m, i) => { if (y >= m - innerHeight * 0.35) active = i; });
    if (dot) {
      let dy = y0 + p * (y1 - y0);
      if (mqReduce.matches && links.length) {
        const a = links[Math.max(active, 0)];
        dy = active < 0 ? y0 : parseFloat(a.parentElement.style.getPropertyValue("--y")) + 15;
      }
      spur.style.setProperty("--spur-y", `${dy.toFixed(1)}px`);
    }
    links.forEach((a, i) => { if (i === active) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    methodUpdate();
    umbauUpdate();
  };

  let ticking = false;
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); }
  };

  /* ---------- Fragen ---------- */
  const qs = $(".questions");
  if (qs) {
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { qs.classList.add("is-in"); io.disconnect(); } }), { rootMargin: "0px 0px -20% 0px" });
      io.observe(qs);
    } else qs.classList.add("is-in");
  }

  /* ---------- Methode: Punkt überquert die drei Marken ---------- */
  const method = $(".method");
  function methodUpdate() {
    if (!method) return;
    if (mqReduce.matches) { method.style.setProperty("--m", "1"); return; }
    const r = method.getBoundingClientRect();
    const m = clamp((innerHeight * 0.85 - r.top) / (innerHeight * 0.6), 0, 1);
    method.style.setProperty("--m", m.toFixed(3));
  }

  /* ---------- Der Umbau ---------- */
  const umbau = $(".umbau");
  const mock = umbau && $(".mock", umbau);
  const steps = umbau ? $$(".umbau__steps li", umbau) : [];
  const tabs = umbau ? $$(".umbau__tabs button", umbau) : [];
  const setState = (s, e = 0) => {
    if (!mock) return;
    mock.dataset.state = String(s);
    mock.style.setProperty("--e", e.toFixed(3));
    mock.classList.toggle("is-exploded", e > 0.12);
    steps.forEach((li, i) => { if (i === s - 1) li.setAttribute("aria-current", "true"); else li.removeAttribute("aria-current"); });
    tabs.forEach((b, i) => { b.setAttribute("aria-selected", String(i === s)); b.tabIndex = i === s ? 0 : -1; });
  };
  const scrubOn = () => umbau && mqDesk.matches && !mqReduce.matches;
  function umbauUpdate() {
    if (!umbau || !umbau.classList.contains("is-scrub")) return;
    const r = umbau.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    const sf = clamp(p * 3.7 - 0.35, 0, 3);
    const f = sf - Math.floor(sf);
    const e = sf >= 3 ? 0 : Math.pow(Math.sin(Math.PI * f), 1.4);
    setState(Math.round(sf), e);
  }
  const umbauMode = () => {
    if (!umbau) return;
    umbau.classList.toggle("is-scrub", scrubOn());
    if (!scrubOn()) { const i = tabs.findIndex((b) => b.getAttribute("aria-selected") === "true"); setState(i < 0 ? 0 : i, 0); }
  };
  if (umbau && mock) {
    setState(0, 0);
    tabs.forEach((b, i) => {
      b.addEventListener("click", () => setState(i, 0));
      b.addEventListener("keydown", (e) => {
        const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const n = (i + dir + tabs.length) % tabs.length;
        tabs[n].focus(); setState(n, 0);
      });
    });
    umbauMode();
    mqDesk.addEventListener("change", () => { umbauMode(); measure(); update(); });
    mqReduce.addEventListener("change", () => { umbauMode(); measure(); update(); });
  }

  /* ---------- Formulare ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const offers = {
    "Neue Website": "Paket „Auftritt“ ab 1.745 € – oder „Signatur“ ab 3.450 €",
    "Relaunch": "Kurz-Audit, danach „Auftritt“ oder „Signatur“",
    "Landingpage": "Paket „Fokus“ ab 745 €",
    "Onlineshop": "Festpreis nach Anforderungsanalyse",
    "Webanwendung / Schnittstelle": "Festpreis je Projektphase",
    "Betreuung": "Care ab 25 € im Monat",
    "Etwas anderes": "Klären wir im Erstgespräch",
  };

  $$("form[data-inbox]").forEach((form) => {
    const status = form.parentElement.querySelector("[data-form-status]");
    const submit = $("button[type=submit]", form);
    const required = $$("[required]", form);
    const setErr = (wrap, msg) => {
      if (!wrap) return;
      wrap.classList.toggle("is-invalid", !!msg);
      let el = $(".err", wrap);
      if (msg) {
        if (!el) { el = document.createElement("p"); el.className = "err"; el.id = `${(wrap.dataset.f || "f")}-err`; wrap.append(el); }
        el.textContent = msg;
        const input = $("input, textarea, select", wrap);
        if (input) { input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", [input.getAttribute("aria-describedby"), el.id].filter(Boolean).join(" ")); }
      } else if (el) {
        el.remove();
        $$("[aria-invalid]", wrap).forEach((i) => i.removeAttribute("aria-invalid"));
      }
    };
    const validate = () => {
      const bad = [];
      const radios = new Set();
      required.forEach((el) => {
        const wrap = el.closest("[data-f]");
        let msg = "";
        if (el.type === "radio") {
          if (radios.has(el.name)) return;
          radios.add(el.name);
          if (!form.querySelector(`input[name="${el.name}"]:checked`)) msg = "Bitte wählen Sie eine Option.";
        } else if (!el.value.trim()) msg = el.dataset.msg || "Bitte ausfüllen.";
        else if (el.type === "email" && !emailOk(el.value.trim())) msg = "Bitte prüfen Sie die E-Mail-Adresse.";
        setErr(wrap, msg);
        if (msg) bad.push(el);
      });
      return bad;
    };
    form.addEventListener("input", (e) => { const w = e.target.closest(".is-invalid"); if (w) setErr(w, ""); });
    form.addEventListener("change", (e) => { const w = e.target.closest(".is-invalid"); if (w) setErr(w, ""); overview(); });

    const overview = () => {
      const box = $("[data-overview]");
      if (!box) return;
      const d = new FormData(form);
      const p = d.get("projekt");
      $("[data-ov=projekt]", box).textContent = p || "noch nicht gewählt";
      $("[data-ov=budget]", box).textContent = d.get("budget") || "noch nicht gewählt";
      $("[data-ov=zeit]", box).textContent = d.get("zeitrahmen") || "noch nicht gewählt";
      $("[data-ov=angebot]", box).textContent = offers[p] || "Wählen Sie oben Ihr Vorhaben.";
    };

    // Vorbelegung aus dem Schwellen-Check (nur lokal im Browser gespeichert)
    const fromCheck = store.get("linua-check");
    if (fromCheck && /check/.test(location.search)) {
      const t = form.elements.nachricht;
      if (t && !t.value) t.value = fromCheck;
      const r = form.querySelector('input[name="projekt"][value="Relaunch"]');
      if (r) r.checked = true;
    }
    overview();

    const summary = (d) => [
      `Projekt: ${d.get("projekt") || "–"}`, `Budgetrahmen: ${d.get("budget") || "–"}`, `Zeitrahmen: ${d.get("zeitrahmen") || "–"}`,
      `Name: ${d.get("name")}`, `Unternehmen: ${d.get("firma") || "–"}`, `E-Mail: ${d.get("email")}`,
      `Telefon: ${d.get("telefon") || "–"}`, `Website: ${d.get("website") || "–"}`, "", `Nachricht: ${String(d.get("nachricht") || "")}`,
    ].join("\n");

    const show = (htmlStr) => {
      if (!status) return;
      status.innerHTML = htmlStr;
      status.hidden = false;
      form.hidden = true;
      status.focus();
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bad = validate();
      if (bad.length) { bad[0].focus(); return; }
      const d = new FormData(form);
      const first = esc(String(d.get("name")).trim().split(/\s+/)[0]);
      if (d.get("firma_bestaetigung")) { show('<p class="form-status__title">Danke!</p>'); return; }
      const label = $(".btn__label", submit);
      const old = label.textContent;
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
      if (sent) {
        show(`<p class="form-status__title">Danke, ${first}. Ihre Nachricht hat die Schwelle überquert.</p><p>Wir melden uns ${esc(form.dataset.response || "innerhalb von zwei Werktagen")} persönlich – mit einer ersten Einschätzung und einem Terminvorschlag für das kostenlose Erstgespräch.</p>`);
        return;
      }
      const mail = form.dataset.mail;
      const href = `mailto:${mail}?subject=${encodeURIComponent(`Projektanfrage: ${d.get("projekt") || "Kurzanfrage"} – ${d.get("name")}`)}&body=${encodeURIComponent(summary(d))}`;
      submit.removeAttribute("aria-busy"); submit.disabled = false; label.textContent = old;
      show(`<p class="form-status__title">Die Verbindung hat gerade nicht geklappt.</p><p>Ihre Angaben sind nicht verloren: <a href="${href}">E-Mail mit Ihrer Anfrage öffnen</a> oder direkt an <a href="mailto:${mail}">${mail}</a> schreiben.</p>`);
    });
  });

  /* ---------- Schwellen-Check ---------- */
  const check = $("[data-check]");
  if (check) {
    const out = $("[data-check-result]");
    const groups = { erkennen: "Erkennen", vertrauen: "Vertrauen", handeln: "Handeln" };
    check.addEventListener("submit", (e) => {
      e.preventDefault();
      const qsAll = $$(".check__q", check);
      const missing = qsAll.find((q) => !$("input:checked", q));
      if (missing) {
        let err = $(".err", missing);
        if (!err) { err = document.createElement("p"); err.className = "err"; err.textContent = "Bitte eine Antwort wählen."; missing.append(err); }
        $("input", missing).focus();
        return;
      }
      $$(".err", check).forEach((x) => x.remove());
      const rows = [], lines = ["Ergebnis meines Schwellen-Checks:"];
      Object.entries(groups).forEach(([key, name]) => {
        const qs2 = qsAll.filter((q) => q.dataset.group === key);
        let score = 0; const tips = [];
        qs2.forEach((q) => { const v = Number($("input:checked", q).value); score += v; if (v < 2) tips.push(q.dataset.tip); });
        const level = score >= 5 ? "stark" : score >= 3 ? "ausbaufähig" : "kritisch";
        lines.push(`${name}: ${level} (${score} von 6)`);
        rows.push(`<div class="result__row"><h3 class="h3">${name}<span class="result__badge" data-level="${level}">${level}</span></h3>${tips.length ? `<ul>${tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "<p>Hier ist Ihre Website schon gut aufgestellt.</p>"}</div>`);
      });
      store.set("linua-check", lines.join("\n") + "\n\nMeine Website: ");
      out.innerHTML = `<h2 class="h2" tabindex="-1">Ihr Ergebnis</h2><div class="result__rows">${rows.join("")}</div><p class="small muted" style="margin-top:20px">Das Ergebnis bleibt in Ihrem Browser. Gesendet wird nichts – erst wenn Sie selbst anfragen.</p><div class="actions" style="margin-top:28px"><a class="btn btn--dark" href="../kontakt.html?von=check"><span class="btn__dot" aria-hidden="true"></span>Erstgespräch anfragen</a><a class="link" href="../leistungen.html#relaunch">Was ein Relaunch umfasst</a></div>`;
      out.hidden = false;
      $("h2", out).focus();
    });
  }

  /* ---------- Start ---------- */
  measure(); update();
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { measure(); update(); });
  addEventListener("load", () => { measure(); update(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); update(); });
})();
