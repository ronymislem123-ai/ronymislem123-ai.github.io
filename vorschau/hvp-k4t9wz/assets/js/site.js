/* HVP GmbH – Website-Entwurf · LINUA 2026 · Design-System 2.0 · ohne Fremdbibliotheken */
(function () {
  "use strict";
  var d = document, root = d.documentElement, w = window;
  root.classList.add("js");
  var mq = w.matchMedia("(prefers-reduced-motion: reduce)");
  var fine = w.matchMedia("(hover: hover) and (pointer: fine)");
  function still() { return mq.matches; }
  function motion() { root.classList.toggle("motion-off", mq.matches); }
  motion(); if (mq.addEventListener) mq.addEventListener("change", motion);

  /* ---------- Scroll: Header, Fortschritt, Parallax ---------- */
  var head = d.querySelector(".site-head"), bar = d.querySelector(".progress");
  var para = [].slice.call(d.querySelectorAll("[data-parallax] img"));
  var navOpen = false, ticking = false;
  function frame() {
    ticking = false;
    var y = w.scrollY || w.pageYOffset, max = d.documentElement.scrollHeight - w.innerHeight;
    if (head) head.classList.toggle("scrolled", y > 8 || navOpen);
    if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    if (!still()) para.forEach(function (im) { if (y < im.parentNode.offsetHeight + 200) im.style.transform = "translate3d(0," + (y * 0.12).toFixed(1) + "px,0)"; });
    else para.forEach(function (im) { im.style.transform = ""; });
  }
  function onScroll() { if (!ticking) { ticking = true; w.requestAnimationFrame(frame); } }
  frame(); w.addEventListener("scroll", onScroll, { passive: true }); w.addEventListener("resize", onScroll);

  /* ---------- Mobilmenü ---------- */
  var burger = d.querySelector(".burger"), nav = d.getElementById("nav");
  function setNav(open) {
    navOpen = open;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
    if (open && head) nav.style.top = Math.max(0, head.getBoundingClientRect().bottom) + "px";
    nav.classList.toggle("open", open);
    d.body.style.overflow = open ? "hidden" : "";
    frame();
  }
  if (burger && nav) {
    nav.querySelectorAll(":scope > ul > li").forEach(function (li, i) { li.style.setProperty("--i", i); });
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") !== "true"; setNav(open);
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
      else if (burger && burger.getAttribute("aria-expanded") === "true") { setNav(false); burger.focus(); }
    }
  });
  if (nav) nav.addEventListener("click", function (e) { var a = e.target.closest("a"); if (a && navOpen && a.getAttribute("href").charAt(0) === "#") setNav(false); });

  /* ---------- Einblenden beim Scrollen ---------- */
  var hasIO = "IntersectionObserver" in w;
  function settle(el) { if (el.classList.contains("rise")) w.setTimeout(function () { el.classList.add("settled"); }, 900 + (parseFloat(getComputedStyle(el).getPropertyValue("--i")) || 0) * 70); }
  var io = hasIO ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in-view"); settle(en.target); io.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }) : null;
  d.querySelectorAll(".rise,.burn,[data-observe]").forEach(function (el) { if (io) io.observe(el); else { el.classList.add("in-view"); settle(el); } });
  /* .cut ist per clip-path unsichtbar – Chrome meldet es dann nicht als sichtbar. Darum den Eltern-Container beobachten. */
  var proxies = new Map();
  var io2 = hasIO ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { (proxies.get(en.target) || []).forEach(function (c) { c.classList.add("in-view"); }); io2.unobserve(en.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }) : null;
  d.querySelectorAll(".cut").forEach(function (el) {
    if (!io2) { el.classList.add("in-view"); return; }
    var p = el.parentElement; if (!proxies.has(p)) { proxies.set(p, []); io2.observe(p); } proxies.get(p).push(el);
  });

  /* ---------- Zähler (nur echte Werte aus dem HTML) ---------- */
  var nums = d.querySelectorAll("[data-count]");
  if (hasIO && !still()) {
    var io3 = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return; io3.unobserve(en.target);
        var el = en.target, end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || "0", 10), t0 = null, dur = 1100;
        function step(t) {
          if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          el.textContent = (end * e).toLocaleString("de-DE", { minimumFractionDigits: dec, maximumFractionDigits: dec });
          if (k < 1) w.requestAnimationFrame(step);
        }
        w.requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io3.observe(n); });
  }

  /* ---------- Licht unter dem Zeiger und leichte Neigung (nur Maus) ---------- */
  if (fine.matches) {
    d.querySelectorAll(".lit").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", (x * 100).toFixed(1) + "%"); el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        if (el.classList.contains("tilt") && !still()) { el.style.setProperty("--rx", ((0.5 - y) * 4).toFixed(2) + "deg"); el.style.setProperty("--ry", ((x - 0.5) * 5).toFixed(2) + "deg"); }
      });
      el.addEventListener("pointerleave", function () { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
    });
  }

  /* ---------- Mobile Leiste über dem Footer ausblenden ---------- */
  var mbar = d.querySelector(".mbar"), foot = d.querySelector(".site-foot");
  if (mbar && foot && hasIO) new IntersectionObserver(function (es) { mbar.classList.toggle("hide", es[0].isIntersecting); }).observe(foot);

  /* ---------- Galerie und Lightbox ---------- */
  d.querySelectorAll(".gallery").forEach(function (g) {
    var main = g.querySelector(".main img"), tb = [].slice.call(g.querySelectorAll(".thumbs button")), idx = 0;
    var lb = g.querySelector(".lightbox"), lbImg = lb ? lb.querySelector("img") : null;
    function pick(i) {
      if (!tb.length) return; idx = (i + tb.length) % tb.length;
      tb.forEach(function (x, k) { x.setAttribute("aria-pressed", String(k === idx)); });
      main.src = tb[idx].dataset.src; main.alt = tb[idx].dataset.alt || "";
      if (lbImg) { lbImg.src = main.src; lbImg.alt = main.alt; }
    }
    tb.forEach(function (b, i) { b.addEventListener("click", function () { pick(i); }); });
    if (lb && lb.showModal) {
      var opener = g.querySelector(".zoom");
      opener.addEventListener("click", function () { lbImg.src = main.src; lbImg.alt = main.alt; lb.showModal(); });
      lb.querySelector(".lb-close").addEventListener("click", function () { lb.close(); });
      lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
      lb.addEventListener("close", function () { opener.focus(); });
      var pv = lb.querySelector(".lb-prev"), nx = lb.querySelector(".lb-next");
      if (pv) pv.addEventListener("click", function () { pick(idx - 1); });
      if (nx) nx.addEventListener("click", function () { pick(idx + 1); });
      lb.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") pick(idx - 1); if (e.key === "ArrowRight") pick(idx + 1); });
    } else if (lb) { var z = g.querySelector(".zoom"); if (z) z.hidden = true; }
  });

  /* ---------- Formatvergleich im Maßstab ---------- */
  var fv = d.querySelector("[data-formats]");
  if (fv) {
    var data = JSON.parse(d.getElementById("fv-data").textContent);
    var rects = fv.querySelectorAll(".fv-rect"), labels = fv.querySelectorAll(".fv-label");
    var items = fv.querySelectorAll(".fv-list li"), btns = fv.querySelectorAll(".fv-list button");
    var chips = fv.querySelectorAll(".fv-chips .chip"), detail = fv.querySelector(".fv-detail");
    var base = fv.getAttribute("data-base") || "/", shown = null;
    function show(id) {
      var f = data.filter(function (x) { return x.id === id; })[0]; if (!f || id === shown) return; shown = id;
      rects.forEach(function (r) { r.classList.toggle("on", r.dataset.id === id); });
      labels.forEach(function (l) { l.classList.toggle("on", l.dataset.id === id); });
      btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.id === id)); });
      var links = f.products.map(function (p) { return '<li><a href="' + base + p[0] + '/">' + p[1] + "</a></li>"; }).join("");
      detail.innerHTML = "<h3>" + f.label + " mm</h3><p class=\"muted\">Grundfläche " + (f.w * f.l / 1e6).toLocaleString("de-DE", { maximumFractionDigits: 2 }) + " m² · " + f.note + "</p><ul>" + links + "</ul>" +
        '<a class="btn btn-primary btn-sm" href="' + base + "kontakt/?produkt=" + encodeURIComponent(f.products[0][0]) + '">Angebot für ' + f.label + " anfordern</a>";
      detail.classList.remove("swap"); void detail.offsetWidth; detail.classList.add("swap");
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { show(b.dataset.id); });
      b.addEventListener("mouseenter", function () { if (fine.matches) show(b.dataset.id); });
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

  /* ---------- Sortiment-Filter ---------- */
  var fb = d.querySelector("[data-filter]");
  if (fb) {
    var fchips = fb.querySelectorAll(".chip"), blocks = d.querySelectorAll(".cat-block");
    fchips.forEach(function (c) {
      c.addEventListener("click", function () {
        fchips.forEach(function (x) { x.setAttribute("aria-pressed", String(x === c)); });
        blocks.forEach(function (b) {
          b.hidden = !(c.dataset.group === "alle" || b.dataset.group === c.dataset.group);
          if (!b.hidden) b.querySelectorAll(".rise").forEach(function (r) { r.classList.add("in-view"); });
        });
      });
    });
  }

  /* ---------- Schnellanfrage → Angebots-Assistent ---------- */
  d.querySelectorAll("form[data-quick]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = new URLSearchParams(new FormData(f)); var del = []; q.forEach(function (v, k) { if (!v) del.push(k); }); del.forEach(function (k) { q.delete(k); });
      w.location.href = f.getAttribute("action") + "?" + q.toString();
    });
  });

  /* ---------- Angebots-Assistent ---------- */
  var wz = d.querySelector("[data-wizard]");
  if (wz) {
    var steps = wz.querySelectorAll(".wz-step"), prog = wz.querySelectorAll(".wz-progress li"), wbar = wz.querySelector(".wz-bar i"), cur = 0;
    var params = new URLSearchParams(location.search);
    var p = params.get("produkt");
    if (p) { var r = wz.querySelector('input[name="produkt"][value="' + CSS.escape(p) + '"]') || wz.querySelector('input[name="produkt"][data-alias~="' + CSS.escape(p) + '"]'); if (r) r.checked = true; }
    ["menge", "ort"].forEach(function (k) { var v = params.get(k), el = wz.querySelector('[name="' + k + '"]'); if (v && el) el.value = v; });
    function go(i) {
      cur = i;
      steps.forEach(function (s, k) { s.hidden = k !== i; });
      prog.forEach(function (li, k) { li.classList.toggle("cur", k === i); li.classList.toggle("done", k < i); if (k === i) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current"); });
      if (wbar) wbar.style.width = ((i + 1) / steps.length * 100) + "%";
      var h = steps[i].querySelector("h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
      wz.scrollIntoView({ block: "start", behavior: still() ? "auto" : "smooth" });
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
