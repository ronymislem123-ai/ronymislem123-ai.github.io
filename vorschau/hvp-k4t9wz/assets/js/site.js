/* HVP GmbH – Website-Entwurf · LINUA 2026 · ohne Fremdbibliotheken */
(function () {
  "use strict";
  var d = document, root = d.documentElement;
  root.classList.add("js");
  var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  function motion() { root.classList.toggle("motion-off", mq.matches); }
  motion(); if (mq.addEventListener) mq.addEventListener("change", motion);

  /* Header-Schatten */
  var head = d.querySelector(".site-head");
  function onScroll() { if (head) head.classList.toggle("scrolled", window.scrollY > 8); }
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobilmenü */
  var burger = d.querySelector(".burger"), nav = d.getElementById("nav");
  function closeNav() { if (!burger) return; burger.setAttribute("aria-expanded", "false"); nav.classList.remove("open"); d.body.style.overflow = ""; }
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") !== "true";
      burger.setAttribute("aria-expanded", String(open)); nav.classList.toggle("open", open);
      d.body.style.overflow = open ? "hidden" : "";
      if (open) { var f = nav.querySelector("a,button"); if (f) f.focus(); }
    });
  }
  /* Mega-Menü Sortiment */
  var mbtn = d.querySelector(".navbtn"), mega = d.getElementById("mega");
  function closeMega() { if (mbtn) { mbtn.setAttribute("aria-expanded", "false"); mega.classList.remove("open"); } }
  if (mbtn && mega) {
    mbtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = mbtn.getAttribute("aria-expanded") !== "true";
      mbtn.setAttribute("aria-expanded", String(open)); mega.classList.toggle("open", open);
    });
    d.addEventListener("click", function (e) { if (!mega.contains(e.target)) closeMega(); });
  }
  d.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (mega && mega.classList.contains("open")) { closeMega(); mbtn.focus(); }
      else if (burger && burger.getAttribute("aria-expanded") === "true") { closeNav(); burger.focus(); }
    }
  });

  /* Einblenden beim Scrollen */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in-view"); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }) : null;
  /* .cut ist per clip-path unsichtbar – Chrome zählt es dann nicht als sichtbar. Darum den Eltern-Container beobachten. */
  var proxies = new Map();
  var io2 = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { (proxies.get(en.target) || []).forEach(function (c) { c.classList.add("in-view"); }); io2.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }) : null;
  d.querySelectorAll(".rise,.burn").forEach(function (el) { if (io) io.observe(el); else el.classList.add("in-view"); });
  d.querySelectorAll(".cut").forEach(function (el) {
    if (!io2) { el.classList.add("in-view"); return; }
    var p = el.parentElement; if (!proxies.has(p)) { proxies.set(p, []); io2.observe(p); } proxies.get(p).push(el);
  });

  /* Galerie Produktseite */
  d.querySelectorAll(".gallery").forEach(function (g) {
    var main = g.querySelector(".main img");
    g.querySelectorAll(".thumbs button").forEach(function (b) {
      b.addEventListener("click", function () {
        g.querySelectorAll(".thumbs button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        main.src = b.dataset.src; main.alt = b.dataset.alt || "";
      });
    });
  });

  /* Formatvergleich im Maßstab */
  var fv = d.querySelector("[data-formats]");
  if (fv) {
    var data = JSON.parse(d.getElementById("fv-data").textContent);
    var rects = fv.querySelectorAll(".fv-rect"), labels = fv.querySelectorAll(".fv-label");
    var items = fv.querySelectorAll(".fv-list li"), btns = fv.querySelectorAll(".fv-list button");
    var chips = fv.querySelectorAll(".fv-chips .chip"), detail = fv.querySelector(".fv-detail");
    var base = fv.getAttribute("data-base") || "/";
    function show(id) {
      var f = data.filter(function (x) { return x.id === id; })[0]; if (!f) return;
      rects.forEach(function (r) { var on = r.dataset.id === id; r.classList.toggle("on", on); r.classList.toggle("dim", !on); });
      labels.forEach(function (l) { l.classList.toggle("on", l.dataset.id === id); });
      btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.id === id)); });
      var links = f.products.map(function (p) { return '<li><a href="' + base + p[0] + '/">' + p[1] + "</a></li>"; }).join("");
      detail.innerHTML = "<h3>" + f.label + " mm</h3><p class=\"muted\">Grundfläche " + (f.w * f.l / 1e6).toLocaleString("de-DE", { maximumFractionDigits: 2 }) + " m² · " + f.note + "</p><ul>" + links + "</ul>" +
        '<a class="btn btn-light btn-sm" href="' + base + "kontakt/?produkt=" + encodeURIComponent(f.products[0][0]) + '">Angebot für ' + f.label + " anfordern</a>";
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { show(b.dataset.id); });
      b.addEventListener("mouseenter", function () { if (window.matchMedia("(hover:hover)").matches) show(b.dataset.id); });
    });
    rects.forEach(function (r) { r.addEventListener("click", function () { show(r.dataset.id); }); });
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        chips.forEach(function (x) { x.setAttribute("aria-pressed", String(x === c)); });
        var g = c.dataset.group, first = null;
        items.forEach(function (li) {
          var ok = g === "alle" || (li.dataset.groups || "").split(" ").indexOf(g) > -1;
          li.hidden = !ok; if (ok && !first) first = li.querySelector("button").dataset.id;
        });
        rects.forEach(function (r) { var ok = g === "alle" || (r.dataset.groups || "").split(" ").indexOf(g) > -1; r.style.display = ok ? "" : "none"; });
        if (first) show(first);
      });
    });
    show(fv.getAttribute("data-start"));
  }

  /* Sortiment-Filter */
  var fb = d.querySelector("[data-filter]");
  if (fb) {
    var fchips = fb.querySelectorAll(".chip"), blocks = d.querySelectorAll(".cat-block");
    fchips.forEach(function (c) {
      c.addEventListener("click", function () {
        fchips.forEach(function (x) { x.setAttribute("aria-pressed", String(x === c)); });
        blocks.forEach(function (b) { b.hidden = !(c.dataset.group === "alle" || b.dataset.group === c.dataset.group); });
      });
    });
  }

  /* Schnellanfrage → Angebots-Assistent */
  d.querySelectorAll("form[data-quick]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = new URLSearchParams(new FormData(f)); q.forEach(function (v, k) { if (!v) q.delete(k); });
      window.location.href = f.getAttribute("action") + "?" + q.toString();
    });
  });

  /* Angebots-Assistent */
  var wz = d.querySelector("[data-wizard]");
  if (wz) {
    var steps = wz.querySelectorAll(".wz-step"), prog = wz.querySelectorAll(".wz-progress li"), cur = 0;
    var params = new URLSearchParams(location.search);
    var p = params.get("produkt");
    if (p) { var r = wz.querySelector('input[name="produkt"][value="' + CSS.escape(p) + '"]') || wz.querySelector('input[name="produkt"][data-alias~="' + CSS.escape(p) + '"]'); if (r) r.checked = true; }
    ["menge", "ort"].forEach(function (k) { var v = params.get(k), el = wz.querySelector('[name="' + k + '"]'); if (v && el) el.value = v; });
    function go(i) {
      cur = i;
      steps.forEach(function (s, k) { s.hidden = k !== i; });
      prog.forEach(function (li, k) { li.classList.toggle("cur", k === i); li.classList.toggle("done", k < i); if (k === i) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current"); });
      var h = steps[i].querySelector("h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
      wz.scrollIntoView({ block: "start", behavior: mq.matches ? "auto" : "smooth" });
    }
    function valid(step) {
      var ok = true;
      step.querySelectorAll("[data-req]").forEach(function (el) {
        var fld = el.closest(".field") || el.closest("fieldset"), good;
        if (el.type === "radio") good = !!step.querySelector('input[name="' + el.name + '"]:checked');
        else if (el.type === "checkbox") good = el.checked;
        else if (el.type === "email") good = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
        else good = el.value.trim() !== "";
        if (fld) fld.classList.toggle("invalid", !good);
        if (!good && ok) { ok = false; el.focus(); }
      });
      return ok;
    }
    wz.querySelectorAll("[data-next]").forEach(function (b) { b.addEventListener("click", function () { if (valid(steps[cur])) { if (cur === steps.length - 2) summary(); go(cur + 1); } }); });
    wz.querySelectorAll("[data-prev]").forEach(function (b) { b.addEventListener("click", function () { go(cur - 1); }); });
    function val(n) { var el = wz.querySelector('[name="' + n + '"]:checked') || wz.querySelector('[name="' + n + '"]:not([type=radio])'); if (!el) return ""; if (el.type === "radio") return el.closest(".opt").querySelector("b").textContent; return el.value.trim(); }
    function summary() {
      var rows = [["Produkt", val("produkt")], ["Menge", val("menge") ? val("menge") + " Stück" : "–"], ["Format / Maß", val("format") || "–"], ["Zustand", val("zustand") || "–"], ["IPPC", val("ippc") || "–"], ["Lieferung", val("lieferung") || "–"], ["PLZ / Ort", val("ort") || "–"], ["Termin", val("termin") || "–"]];
      wz.querySelector("[data-summary]").innerHTML = "<dl>" + rows.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1].replace(/</g, "&lt;") + "</dd>"; }).join("") + "</dl>";
    }
    var form = wz.querySelector("form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!valid(steps[cur])) return;
      if (form.querySelector(".hp input").value) return;
      var out = wz.querySelector("[data-result]");
      out.hidden = false; out.focus();
      form.querySelector('button[type="submit"]').disabled = true;
    });
  }
})();
