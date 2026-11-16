/* LIMEN — main.js
   Kleines, abhängigkeitsfreies Skript. Alle Inhalte sind ohne JavaScript sichtbar;
   das Skript ergänzt nur Bewegung, Menü und Formularversand. */
(() => {
  "use strict";

  const doc = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Header: Zustand + Lesefortschritt ---------- */
  const header = $(".site-header");
  const progress = $(".progress");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, y / max));
      if (header) header.classList.toggle("is-scrolled", y > 8);
      if (progress) {
        progress.style.setProperty("--p", p.toFixed(4));
        progress.style.setProperty("--po", y > 40 ? "1" : "0");
      }
      updateTimeline();
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  /* ---------- Mobiles Menü ---------- */
  const menuBtn = $(".menu-btn");
  const menu = $("#mobile-menu");
  const inertTargets = () => [$("main"), $(".site-footer")].filter(Boolean);
  const setMenu = (open) => {
    if (!menuBtn || !menu) return;
    doc.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.querySelector(".menu-btn__label").textContent = open ? "Schließen" : "Menü";
    menu.setAttribute("aria-hidden", String(!open));
    inertTargets().forEach((el) => (el.inert = open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      menu.style.setProperty("--menu-top", Math.max(0, header.getBoundingClientRect().bottom) + "px");
      const first = menu.querySelector("a");
      if (first) setTimeout(() => first.focus(), 60);
    }
  };
  if (menuBtn && menu) {
    menu.setAttribute("aria-hidden", "true");
    menuBtn.addEventListener("click", () => setMenu(!doc.classList.contains("menu-open")));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && doc.classList.contains("menu-open")) { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia("(min-width: 1100px)").addEventListener("change", (m) => { if (m.matches) setMenu(false); });
  }

  /* ---------- Headline wortweise einblenden ---------- */
  const splitWords = (el) => {
    const kicker = el.querySelector(".h1-kicker");
    const rest = el.cloneNode(true); const k2 = rest.querySelector(".h1-kicker"); if (k2) k2.remove();
    el.setAttribute("aria-label", ((kicker ? kicker.textContent.trim() + ": " : "") + rest.textContent).replace(/\s+/g, " ").trim());
    let w = 0;
    const wrap = (node) => {
      const outer = document.createElement("span");
      outer.className = "sw";
      outer.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.style.setProperty("--w", w++);
      inner.appendChild(node);
      outer.appendChild(inner);
      return outer;
    };
    Array.from(el.childNodes).forEach((node) => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(" "));
          else frag.appendChild(wrap(document.createTextNode(part)));
        });
        el.replaceChild(frag, node);
      } else if (node.nodeType === 1 && !node.classList.contains("h1-kicker")) {
        el.replaceChild(wrap(node.cloneNode(true)), node);
      } else if (node.nodeType === 1) {
        node.setAttribute("aria-hidden", "true");
      }
    });
    el.classList.add("is-split");
  };
  if (!reduceMotion) $$("[data-split]").forEach(splitWords);

  /* ---------- Reveals ---------- */
  const revealEls = $$("[data-reveal], [data-split]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }
  // Gestaffelte Gruppen
  $$("[data-stagger]").forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      child.setAttribute("data-reveal", "");
      child.style.setProperty("--i", Math.min(i, 6));
    });
  });
  // erneut beobachten (gestaffelte Kinder kamen nach dem ersten Lauf hinzu)
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io2.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    $$("[data-stagger] > [data-reveal]").forEach((el) => io2.observe(el));
  } else {
    $$("[data-stagger] > [data-reveal]").forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Signature: Die Schwelle ---------- */
  const schwelle = $(".schwelle[data-anim]");
  if (schwelle) {
    const stations = $$(".station", schwelle);
    const marks = stations.map((s) => parseFloat(s.dataset.at || "0") / 100);
    const finish = () => {
      schwelle.style.setProperty("--sig", "1");
      stations.forEach((s) => s.classList.add("is-lit"));
      schwelle.classList.add("is-done");
    };
    if (reduceMotion) {
      schwelle.removeAttribute("data-anim");
      finish();
    } else {
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const run = () => {
        schwelle.classList.add("is-ready");
        const duration = 2600, delay = 350;
        let start = null;
        const step = (ts) => {
          if (start === null) start = ts;
          const t = Math.min(1, Math.max(0, (ts - start - delay) / duration));
          const v = ease(t);
          schwelle.style.setProperty("--sig", v.toFixed(4));
          stations.forEach((s, i) => { if (v >= marks[i]) s.classList.add("is-lit"); });
          if (t < 1) requestAnimationFrame(step);
          else finish();
        };
        requestAnimationFrame(step);
      };
      // Start, sobald die Schwelle wirklich zu sehen ist (und die Schriften geladen sind)
      let started = false;
      const go = () => { if (!started) { started = true; setTimeout(run, 120); } };
      const whenVisible = () => {
        if (!("IntersectionObserver" in window)) return go();
        const sio = new IntersectionObserver(([e]) => { if (e.isIntersecting) { sio.disconnect(); go(); } }, { threshold: 0.9 });
        sio.observe($(".schwelle__track", schwelle));
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(whenVisible); else whenVisible();
    }
  }

  /* ---------- Schwellen-Prinzip: Sticky-Mockup folgt den Schritten ---------- */
  const mock = $(".principle .mock");
  const psteps = $$(".pstep");
  if (psteps.length && "IntersectionObserver" in window) {
    const activate = (el) => {
      psteps.forEach((s) => s.classList.toggle("is-active", s === el));
      if (mock) mock.dataset.step = el.dataset.step;
    };
    const pio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) activate(e.target); });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    psteps.forEach((s) => pio.observe(s));
  }

  /* ---------- Ablauf: Fortschritt der Zeitleiste ---------- */
  const timeline = $(".timeline");
  const tlItems = timeline ? $$(".tl", timeline) : [];
  function updateTimeline() {
    if (!timeline) return;
    const r = timeline.getBoundingClientRect();
    const mid = window.innerHeight * 0.55;
    const p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
    timeline.style.setProperty("--tp", p.toFixed(4));
    tlItems.forEach((el) => el.classList.toggle("is-passed", el.getBoundingClientRect().top + 8 < mid));
  }

  onScroll();

  /* ---------- Formular ---------- */
  const form = $("#anfrage-form");
  if (form) {
    const statusBox = $("#form-status");
    const submitBtn = form.querySelector("[type=submit]");
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const setInvalid = (wrapper, msg) => {
      wrapper.classList.add("is-invalid");
      const err = wrapper.querySelector(".field__error");
      if (err && msg) err.textContent = msg;
      wrapper.querySelectorAll("input, textarea, select").forEach((i) => i.setAttribute("aria-invalid", "true"));
    };
    const clearInvalid = (wrapper) => {
      wrapper.classList.remove("is-invalid");
      wrapper.querySelectorAll("[aria-invalid]").forEach((i) => i.removeAttribute("aria-invalid"));
    };
    form.addEventListener("input", (e) => {
      const w = e.target.closest(".field, .fieldset");
      if (w && w.classList.contains("is-invalid")) clearInvalid(w);
    });

    const validate = () => {
      const errors = [];
      const projekt = form.querySelector("[name=projekt]:checked");
      const projektSet = $("#fs-projekt");
      if (!projekt) { setInvalid(projektSet, "Bitte wählen Sie aus, worum es geht."); errors.push(projektSet); }
      const name = form.elements.name;
      if (!name.value.trim()) { setInvalid(name.closest(".field"), "Bitte geben Sie Ihren Namen an, damit ich Sie ansprechen kann."); errors.push(name); }
      const email = form.elements.email;
      if (!emailRe.test(email.value.trim())) { setInvalid(email.closest(".field"), "Bitte geben Sie eine gültige E-Mail-Adresse an, damit ich Ihnen antworten kann."); errors.push(email); }
      const msg = form.elements.nachricht;
      if (msg.value.trim().length < 20) { setInvalid(msg.closest(".field"), "Ein, zwei Sätze zu Ihrem Vorhaben genügen – mindestens 20 Zeichen."); errors.push(msg); }
      return errors;
    };

    const summary = (data) => {
      const lines = [
        `Projekt: ${data.get("projekt") || "–"}`,
        `Budgetrahmen: ${data.get("budget") || "–"}`,
        `Zeitrahmen: ${data.get("zeitrahmen") || "–"}`,
        `Name: ${data.get("name")}`,
        `Unternehmen: ${data.get("firma") || "–"}`,
        `E-Mail: ${data.get("email")}`,
        `Telefon: ${data.get("telefon") || "–"}`,
        `Website: ${data.get("website") || "–"}`,
        "",
        String(data.get("nachricht") || ""),
      ];
      return lines.join("\n");
    };

    const showStatus = (html, ok) => {
      statusBox.innerHTML = html;
      statusBox.hidden = false;
      statusBox.classList.toggle("form-status--ok", !!ok);
      form.hidden = true;
      statusBox.focus();
      statusBox.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    };
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      form.querySelectorAll(".is-invalid").forEach(clearInvalid);
      const errors = validate();
      if (errors.length) {
        const first = errors[0].matches("fieldset") ? errors[0].querySelector("input") : errors[0];
        first.focus();
        return;
      }
      const data = new FormData(form);
      const firstName = esc(String(data.get("name")).trim().split(/\s+/)[0]);
      if (data.get("firma_bestaetigung")) { // Honeypot: Bots freundlich ins Leere laufen lassen
        showStatus(`<p class="form-status__title">Danke!</p>`, true);
        return;
      }
      submitBtn.setAttribute("aria-busy", "true");
      submitBtn.disabled = true;
      submitBtn.querySelector(".btn__label").textContent = "Wird gesendet …";

      let sent = false;
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 9000);
        const res = await fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" }, signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json().catch(() => null);
          sent = !!(json && json.ok);
        }
      } catch (_) { sent = false; }

      if (sent) {
        showStatus(
          `<p class="form-status__title">Danke, ${firstName}! Ihre Anfrage ist angekommen.</p>
           <p class="muted" style="margin-top:.75rem">Ich melde mich innerhalb eines Werktags persönlich bei Ihnen – meist mit einer ersten Einschätzung und einem Terminvorschlag für das kostenlose Erstgespräch.</p>`,
          true
        );
        return;
      }

      // Fallback: kein Server-Versand verfügbar → vorbereitete E-Mail, nie "gesendet" behaupten
      const to = form.dataset.mail;
      const subject = `Projektanfrage: ${data.get("projekt")} – ${data.get("name")}`;
      const body = summary(data);
      const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      showStatus(
        `<p class="form-status__title">Fast geschafft, ${firstName}.</p>
         <p class="muted" style="margin-top:.75rem">Der automatische Versand ist gerade nicht erreichbar – Ihre Anfrage wurde deshalb <strong>noch nicht gesendet</strong>. Sie ist aber fertig vorbereitet: Öffnen Sie sie mit einem Klick in Ihrem E-Mail-Programm oder kopieren Sie den Text an <strong>${esc(to)}</strong>.</p>
         <div class="cluster" style="margin-top:1.25rem">
           <a class="btn" href="${mailto}"><span>E-Mail öffnen</span><span class="btn__arrow" aria-hidden="true">→</span></a>
           <button type="button" class="btn btn--ghost" data-copy>Text kopieren</button>
           <button type="button" class="btn btn--ghost" data-edit>Angaben bearbeiten</button>
         </div>
         <pre aria-label="Ihre vorbereitete Anfrage">${esc(body)}</pre>
         <p class="small muted" data-copy-status role="status" style="margin-top:.5rem"></p>`,
        false
      );
      const copyBtn = statusBox.querySelector("[data-copy]");
      copyBtn.addEventListener("click", async () => {
        const out = statusBox.querySelector("[data-copy-status]");
        try { await navigator.clipboard.writeText(`An: ${to}\nBetreff: ${subject}\n\n${body}`); out.textContent = "Kopiert – fügen Sie den Text in eine neue E-Mail ein."; }
        catch (_) { out.textContent = "Kopieren nicht möglich – bitte markieren Sie den Text oben manuell."; }
      });
      statusBox.querySelector("[data-edit]").addEventListener("click", () => {
        statusBox.hidden = true; form.hidden = false; form.elements.nachricht.focus();
      });
      submitBtn.removeAttribute("aria-busy");
      submitBtn.disabled = false;
      submitBtn.querySelector(".btn__label").textContent = "Anfrage senden";
    });
  }

  /* ---------- Mobiler CTA: erscheint nach dem Hero, verschwindet vor dem CTA-Band/Footer ---------- */
  const mobileCta = $(".mobile-cta");
  if (mobileCta && "IntersectionObserver" in window) {
    let pastHero = false, nearEnd = false;
    const sync = () => mobileCta.classList.toggle("is-visible", pastHero && !nearEnd);
    const hero = $(".hero, .page-hero");
    if (hero) new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }).observe(hero);
    const ends = $$(".cta-band, .site-footer");
    const visibleEnds = new Set();
    const eio = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visibleEnds.add(e.target) : visibleEnds.delete(e.target)));
      nearEnd = visibleEnds.size > 0; sync();
    });
    ends.forEach((el) => eio.observe(el));
  }

  /* ---------- Kleinkram ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  const pill = $(".preview-pill");
  if (pill) {
    let hidden = false;
    try { hidden = sessionStorage.getItem("limen-preview-pill") === "0"; } catch (_) {}
    if (hidden) pill.remove();
    else pill.querySelector("button").addEventListener("click", () => {
      pill.remove();
      try { sessionStorage.setItem("limen-preview-pill", "0"); } catch (_) {}
    });
  }
})();
