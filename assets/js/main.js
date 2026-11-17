/* LINUA — main.js
   Kleines, abhängigkeitsfreies Skript. Alle Inhalte sind ohne JavaScript sichtbar;
   das Skript ergänzt nur Bewegung, Menü und Formularversand. */
(() => {
  "use strict";

  // Interner Bereich (Agenturzentrale) ohne Seitenübergang öffnen – dort gelten eigene, strengere Regeln
  addEventListener("pageswap", (e) => {
    const vt = e.viewTransition; const to = e.activation && e.activation.entry && e.activation.entry.url;
    if (vt && to && new URL(to).pathname.includes("/zentrale/")) vt.skipTransition();
  });

  const doc = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Header: Zustand + Lesefortschritt ---------- */
  const header = $(".site-header");
  const progress = $(".progress");
  let ticking = false;
  let lastY = window.scrollY;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, y / max));
      if (header) {
        header.classList.toggle("is-scrolled", y > 8);
        // Smart Header: beim Weiterlesen ausweichen, beim Zurückscrollen sofort wieder da
        const busy = doc.classList.contains("menu-open") || header.classList.contains("mega-open") || header.contains(document.activeElement);
        if (y < 480 || busy || y < lastY - 6) header.classList.remove("is-tucked");
        else if (y > lastY + 6) header.classList.add("is-tucked");
        if (Math.abs(y - lastY) > 6) lastY = y;
      }
      if (progress) {
        progress.style.setProperty("--p", p.toFixed(4));
        progress.style.setProperty("--po", y > 40 ? "1" : "0");
      }
      updateTimeline();
      updateScrub();
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
  // Seitenüberschriften stehen immer im ersten Bildschirm: direkt einblenden, ohne auf den Observer zu warten
  requestAnimationFrame(() => $$("[data-split]").forEach((el) => el.classList.add("is-in")));
  let ioAlive = false;
  const revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      ioAlive = true;
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
    // Sicherheitsnetz: meldet der Observer sich nie (z. B. eingebettete oder gedrosselte Ansichten), alles zeigen
    setTimeout(() => { if (!ioAlive) $$("[data-reveal], [data-split]").forEach((el) => el.classList.add("is-in")); }, 1200);
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
        const track = $(".schwelle__track", schwelle);
        if (!("IntersectionObserver" in window)) return go();
        const sio = new IntersectionObserver(([e]) => { if (e.isIntersecting) { sio.disconnect(); go(); } }, { threshold: 0.9 });
        sio.observe(track);
        // Fallback: liegt die Schwelle schon im Bild, auch ohne Observer-Meldung starten
        setTimeout(() => { if (track.getBoundingClientRect().top < window.innerHeight) { sio.disconnect(); go(); } }, 1800);
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
      if (!name.value.trim()) { setInvalid(name.closest(".field"), "Bitte geben Sie Ihren Namen an, damit wir Sie ansprechen können."); errors.push(name); }
      const email = form.elements.email;
      if (!emailRe.test(email.value.trim())) { setInvalid(email.closest(".field"), "Bitte geben Sie eine gültige E-Mail-Adresse an, damit wir Ihnen antworten können."); errors.push(email); }
      const msg = form.elements.nachricht;
      if (msg.value.trim().length < 20) { setInvalid(msg.closest(".field"), "Ein, zwei Sätze zu Ihrem Vorhaben genügen – mindestens 20 Zeichen."); errors.push(msg); }
      return errors;
    };

    // Format-Vertrag mit der internen Agentur-Zentrale (/zentrale/): Betreff beginnt mit „Projektanfrage“,
    // Felder als „Feld: Wert“-Zeilen. Die Zentrale liest solche Mails über Gmail ein und legt den Lead automatisch an.
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
        `Nachricht: ${String(data.get("nachricht") || "")}`,
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
      const inbox = form.dataset.inbox; // Eingang der Agenturzentrale (Supabase) – wenn eingerichtet
      const mailMode = form.dataset.mode === "mailto" && !inbox;
      const btnText = submitBtn.querySelector(".btn__label").textContent;
      submitBtn.setAttribute("aria-busy", "true");
      submitBtn.disabled = true;
      submitBtn.querySelector(".btn__label").textContent = mailMode ? "Wird vorbereitet …" : "Wird gesendet …";

      let sent = false;
      if (inbox) try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 9000);
        const res = await fetch(inbox, {
          method: "POST", signal: ctrl.signal, credentials: "omit",
          headers: Object.assign({ "Content-Type": "application/json", apikey: form.dataset.key, Prefer: "return=minimal" }, /^eyJ/.test(form.dataset.key) ? { Authorization: `Bearer ${form.dataset.key}` } : {}),
          body: JSON.stringify({ subject: `Projektanfrage: ${data.get("projekt")} – ${data.get("name")}`.slice(0, 200), body: summary(data).slice(0, 8000), name: String(data.get("name")).trim().slice(0, 200), email: String(data.get("email")).trim(), hp: "" })
        });
        clearTimeout(timer);
        sent = res.ok;
      } catch (_) { sent = false; }
      else if (!mailMode) try {
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
           <p class="muted" style="margin-top:.75rem">Wir melden uns innerhalb eines Werktags persönlich bei Ihnen – meist mit einer ersten Einschätzung und einem Terminvorschlag für das kostenlose Erstgespräch.</p>`,
          true
        );
        return;
      }

      // Kein Server-Versand (Mailto-Modus oder Server nicht erreichbar) → vorbereitete E-Mail, nie "gesendet" behaupten
      const to = form.dataset.mail;
      const subject = `Projektanfrage: ${data.get("projekt")} – ${data.get("name")}`;
      const body = summary(data);
      const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      if (mailMode) { try { window.location.href = mailto; } catch (_) {} }
      const intro = mailMode
        ? `Ihr E-Mail-Programm sollte sich jetzt mit der fertigen Anfrage öffnen. Bitte tippen Sie dort nur noch auf <strong>Senden</strong> – erst dann erreicht uns Ihre Nachricht. Hat sich nichts geöffnet? Öffnen Sie die E-Mail erneut oder kopieren Sie den Text an <strong>${esc(to)}</strong>.`
        : `Der automatische Versand ist gerade nicht erreichbar – Ihre Anfrage wurde deshalb <strong>noch nicht gesendet</strong>. Sie ist aber fertig vorbereitet: Öffnen Sie sie mit einem Klick in Ihrem E-Mail-Programm oder kopieren Sie den Text an <strong>${esc(to)}</strong>.`;
      showStatus(
        `<p class="form-status__title">${mailMode ? `Fast fertig, ${firstName}.` : `Fast geschafft, ${firstName}.`}</p>
         <p class="muted" style="margin-top:.75rem">${intro}</p>
         <div class="cluster" style="margin-top:1.25rem">
           <a class="btn" href="${mailto}"><span>${mailMode ? "E-Mail erneut öffnen" : "E-Mail öffnen"}</span><span class="btn__arrow" aria-hidden="true">→</span></a>
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
      submitBtn.querySelector(".btn__label").textContent = btnText;
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



  /* ---------- Redaktionelle Überschriften: Wörter füllen sich beim Scrollen mit Tinte ---------- */
  const scrubs = [];
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    $$("[data-scrub]").forEach((el) => {
      const words = [];
      const wrapText = (node) => {
        Array.from(node.childNodes).forEach((ch) => {
          if (ch.nodeType === 3) {
            const frag = document.createDocumentFragment();
            ch.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              const w = document.createElement("span"); w.className = "scrub-w"; w.textContent = part; frag.appendChild(w); words.push(w);
            });
            ch.replaceWith(frag);
          } else if (ch.nodeType === 1) { ch.classList.add("scrub-w"); words.push(ch); }
        });
      };
      wrapText(el);
      words.forEach((w, i) => w.style.setProperty("--i", i));
      el.style.setProperty("--n", words.length);
      el.classList.add("is-scrub");
      scrubs.push(el);
    });
  }
  function updateScrub() {
    const vh = window.innerHeight;
    scrubs.forEach((el) => {
      const top = el.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, (vh * 0.92 - top) / (vh * 0.4)));
      el.style.setProperty("--p", p.toFixed(3));
    });
  }
  updateScrub();

  /* ---------- Kontakt: Vorhaben aus dem Link vorauswählen (z. B. von der Preisseite) ---------- */
  const pre = new URLSearchParams(location.search).get("vorhaben");
  if (pre) {
    const radio = $$("#anfrage-form [name=projekt]").find((r) => r.value === pre);
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event("change", { bubbles: true })); }
  }

  /* ---------- Leistungs-Menü (Desktop): öffnet per Klick, Tastatur oder kurzem Verweilen ---------- */
  const megaBtn = $(".nav__more");
  const mega = $("#mega-leistungen");
  if (megaBtn && mega && header) {
    const item = megaBtn.closest(".nav__item--mega");
    let openTimer = 0, closeTimer = 0;
    const setMega = (open, focusBack) => {
      clearTimeout(openTimer); clearTimeout(closeTimer);
      if (open === !mega.hidden) return;
      mega.hidden = !open;
      megaBtn.setAttribute("aria-expanded", String(open));
      header.classList.toggle("mega-open", open);
      if (open) header.classList.remove("is-tucked");
      if (!open && focusBack) megaBtn.focus();
    };
    megaBtn.addEventListener("click", () => setMega(mega.hidden));
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const enter = () => { if (!fine.matches) return; clearTimeout(closeTimer); openTimer = setTimeout(() => setMega(true), 140); };
    const leave = () => { clearTimeout(openTimer); closeTimer = setTimeout(() => setMega(false), 220); };
    [item, mega].forEach((el) => { el.addEventListener("pointerenter", enter); el.addEventListener("pointerleave", leave); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !mega.hidden) setMega(false, true); });
    document.addEventListener("pointerdown", (e) => { if (!mega.hidden && !mega.contains(e.target) && !item.contains(e.target)) setMega(false); });
    header.addEventListener("focusout", (e) => {
      const to = e.relatedTarget;
      if (!mega.hidden && to && !mega.contains(to) && !item.contains(to)) setMega(false);
    });
    mega.addEventListener("click", (e) => { if (e.target.closest("a")) setMega(false); });
  }

  /* ---------- Hero-Bühne: Karten legen sich auf, folgen dezent dem Zeiger ---------- */
  const stage = $(".hero-stage");
  if (stage) {
    const fit = () => { const c = stage.querySelector(".hero-stage__card"); if (c && c.clientWidth) stage.style.setProperty("--k", (c.clientWidth / 640).toFixed(4)); };
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(stage);
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add("is-in")));
    const hero = stage.closest(".hero");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fineP = window.matchMedia("(hover: hover) and (pointer: fine)");
    let raf = 0, px = 0, py = 0;
    const apply = () => { raf = 0; stage.style.setProperty("--px", px.toFixed(3)); stage.style.setProperty("--py", py.toFixed(3)); };
    hero.addEventListener("pointermove", (e) => {
      if (calm.matches || !fineP.matches || e.pointerType !== "mouse") return;
      const r = stage.getBoundingClientRect();
      px = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      py = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
      if (!raf) raf = requestAnimationFrame(apply);
    });
    hero.addEventListener("pointerleave", () => { px = 0; py = 0; if (!raf) raf = requestAnimationFrame(apply); });
  }

  /* ---------- Anfrage-Überblick: zeigt vor dem Absenden, was ankommt ---------- */
  const summary = $("[data-summary]");
  const sumForm = $("#anfrage-form");
  if (summary && sumForm) {
    const out = (k) => summary.querySelector(`[data-sum="${k}"]`);
    const set = (k, text, empty) => {
      const el = out(k); if (!el || el.textContent === text) return;
      el.textContent = text; el.classList.toggle("is-empty", !!empty);
      el.classList.remove("is-changed"); void el.offsetWidth; el.classList.add("is-changed");
    };
    const refresh = () => {
      const pr = sumForm.querySelector("[name=projekt]:checked");
      const bu = sumForm.querySelector("[name=budget]:checked");
      const ze = sumForm.elements.zeitrahmen;
      set("projekt", pr ? pr.value : "noch nicht gewählt", !pr);
      set("budget", bu ? bu.value : "noch nicht gewählt", !bu);
      set("zeitrahmen", ze && ze.value ? ze.value : "noch nicht gewählt", !(ze && ze.value));
      set("offer", pr && pr.dataset.offer ? pr.dataset.offer : "Wählen Sie oben Ihr Vorhaben.", !pr);
    };
    ["projekt", "budget", "zeitrahmen", "offer"].forEach((k) => { const el = out(k); if (el) el.classList.add("is-empty"); });
    sumForm.addEventListener("change", refresh);
    refresh();
  }

  /* ---------- Kleinkram ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  const pill = $(".preview-pill");
  if (pill) {
    let hidden = false;
    try { hidden = sessionStorage.getItem("linua-preview-pill") === "0"; } catch (_) {}
    if (hidden) pill.remove();
    else pill.querySelector("button").addEventListener("click", () => {
      pill.remove();
      try { sessionStorage.setItem("linua-preview-pill", "0"); } catch (_) {}
    });
  }
})();
