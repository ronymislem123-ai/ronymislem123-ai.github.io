#!/usr/bin/env python3
"""LINUA-Website bauen – ohne Fremdpakete.

    python3 build.py                 # Vorschau-Build nach dist/
    python3 build.py --production    # Live-Build (bricht bei [OFFEN] ab)

Seiten liegen in src/pages/*.html: oben ein Block <!--meta {...} -->, darunter der Inhalt von <main>.
Platzhalter {{schluessel}} kommen aus SITE, {{root}} ist der relative Pfad zur Wurzel.
src/static/ wird 1:1 kopiert, zentrale/ unverändert nach dist/zentrale/.
"""
import argparse, base64, hashlib, html, json, re, shutil, sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC, DIST = ROOT / "src", ROOT / "dist"

SITE = {
    "name": "LINUA",
    "claim": "Wo aus Besuchern Kunden werden.",
    "owner": "Rony",
    "email": "hallo@linua.de",
    "street": "",
    "zip": "",
    "city": "Leipzig",
    "url": "https://www.linua.de",
    "region": "Leipzig, Landkreis Leipzig und Nordsachsen persönlich – deutschlandweit per Video",
    "response": "innerhalb von zwei Werktagen",
    "price_fokus": "745 €", "price_auftritt": "1.745 €", "price_signatur": "3.450 €",
    "dur_fokus": "rund 3 Wochen", "dur_auftritt": "rund 7 Wochen", "dur_signatur": "rund 3 Monate",
    "care_basis": "25 €", "care_plus": "59 €", "care_wachstum": "145 €",
    "audit": "75 €",
    "inbox": "https://cypzmrogwltxksimadpn.supabase.co/rest/v1/zentrale_inbox",
    "inbox_key": "sb_publishable_Yu05MU7GprLn_WnLR_L3YQ_6nocdpAm",
    "year": str(date.today().year),
}

NAV = [("leistungen", "leistungen.html", "Leistungen"), ("projekte", "projekte.html", "Arbeiten"),
       ("ablauf", "ablauf.html", "Ablauf"), ("preise", "preise.html", "Preise"), ("ueber", "ueber.html", "Über")]

JS_FLAG = "document.documentElement.classList.add('js');try{if(localStorage.getItem('linua-motion')==='off')document.documentElement.classList.add('no-motion')}catch(e){}"
ICONS = (Path(__file__).resolve().parent / "src" / "icons.svg").read_text(encoding="utf-8")


def sha(s):
    return "sha256-" + base64.b64encode(hashlib.sha256(s.encode()).digest()).decode()


ICON = '<svg class="i" aria-hidden="true" focusable="false"><use href="#i-{}"/></svg>'


RING_N = [0]


def ring(txt):
    RING_N[0] += 1
    n = RING_N[0]
    return (f'<span class="ring" aria-hidden="true"><svg viewBox="0 0 120 120"><defs><path id="rp{n}" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0"/></defs>'
            f'<text><textPath href="#rp{n}" textLength="276">{html.escape(txt)}</textPath></text></svg><span class="ring__core"></span></span>')


def fill(text, extra):
    text = re.sub(r"\{\{i:([a-z0-9-]+)\}\}", lambda m: ICON.format(m.group(1)), text)
    text = re.sub(r"\{\{s:([a-z0-9-]+)\}\}", lambda m: f'<svg class="st st--{m.group(1)}" aria-hidden="true" focusable="false"><use href="#{m.group(1) if m.group(1).startswith("ob-") else "st-" + m.group(1)}"/></svg>', text)
    text = re.sub(r"\{\{ring:([^}]+)\}\}", lambda m: ring(m.group(1)), text)
    vals = dict(SITE, **extra)
    def rep(m):
        key = m.group(1).strip()
        if key not in vals:
            sys.exit(f"Unbekannter Platzhalter {{{{{key}}}}}")
        return vals[key]
    return re.sub(r"\{\{\s*([a-z_]+)\s*\}\}", rep, text)


def wordmark(root):
    return (f'<a class="wordmark" href="{root}index.html" aria-label="LINUA, zur Startseite">'
            '<span aria-hidden="true">l</span><span class="wordmark__i" aria-hidden="true"></span>'
            '<span aria-hidden="true">nua</span></a>')


def header(meta, root):
    items = "".join(
        f'<li><a href="{root}{href}"{" aria-current=\"page\"" if meta.get("nav") == key else ""}>{label}</a></li>'
        for key, href, label in NAV)
    cta = f'<a class="btn btn--dark btn--sm" href="{root}kontakt.html"><span class="btn__dot" aria-hidden="true"></span>Erstgespräch anfragen</a>'
    return f'''<header class="site-header" data-header>
  {wordmark(root)}
  <nav class="site-nav" aria-label="Hauptnavigation"><ul>{items}</ul>{cta}</nav>
  <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menue" data-menu-btn>Menü</button>
  <div class="menu" id="menue" hidden data-menu>
    <ul>{items}<li><a href="{root}faq.html">Fragen</a></li><li><a href="{root}check/index.html">Website prüfen</a></li></ul>
    {cta}
    <p class="menu__mail">Lieber direkt: <a href="mailto:{SITE["email"]}">{SITE["email"]}</a></p>
  </div>
</header>'''


def spur(meta):
    chapters = meta.get("chapters", [])
    nav = ""
    if chapters:
        lis = "".join(f'<li><a href="#{cid}" data-spur-link="{cid}">{html.escape(label)}</a></li>' for cid, label in chapters)
        nav = f'<nav class="spur-nav" aria-label="Kapitel dieser Seite" data-spur-nav><ol>{lis}</ol></nav>'
    return f'<div class="spur" aria-hidden="true" data-spur><span class="spur__line"></span><span class="spur__dot"></span></div>{nav}'


def footer(root):
    items = "".join(f'<li><a href="{root}{href}">{label}</a></li>' for _, href, label in NAV)
    return f'''<footer class="site-footer">
  <div class="site-footer__inner">
    <div class="site-footer__brand">
      {wordmark(root)}
      <p class="site-footer__claim">{SITE["claim"]}</p>
      <p>Webdesign und Entwicklung aus Leipzig.<br>{SITE["region"]}.</p>
    </div>
    <nav class="site-footer__nav" aria-label="Fußnavigation"><ul>{items}<li><a href="{root}faq.html">Fragen</a></li><li><a href="{root}check/index.html">Website prüfen</a></li><li><a href="{root}kontakt.html">Kontakt</a></li></ul></nav>
    <div class="site-footer__contact">
      <p><a href="mailto:{SITE["email"]}">{SITE["email"]}</a></p>
      <p>Antwort {SITE["response"]}.</p>
    </div>
  </div>
  <div class="site-footer__legal">
    <p>© {SITE["year"]} {SITE["name"]}</p>
    <ul><li><a href="{root}impressum.html">Impressum</a></li><li><a href="{root}datenschutz.html">Datenschutz</a></li><li><a href="{root}zentrale/" rel="nofollow">Agentur-Zentrale</a></li></ul>
  </div>
</footer>'''


NAV2 = [("leistungen", "leistungen.html", "Leistungen", "layers", "blue", "Websites, Shops, Web-Apps, Sichtbarkeit"),
        ("projekte", "projekte.html", "Arbeiten", "browser", "ochre", "Konzeptprojekte und eigene Software"),
        ("ablauf", "ablauf.html", "Ablauf", "calendar", "green", "Vom Erstgespräch bis zum Launch"),
        ("preise", "preise.html", "Preise", "euro", "violet", "Pakete, Betreuung, Zusatzleistungen"),
        ("ueber", "ueber.html", "Über", "user", "red", "Wer hinter LINUA steht")]


def header2(meta, root):
    cur = meta.get("nav")
    def item(key, href, label, icon, color, desc):
        on = cur == key
        ind = '<span class="hd__ind" aria-hidden="true"></span>' if on else ""
        a = f'<a href="{root}{href}" data-c="{color}"{" aria-current=\"page\"" if on else ""}>{ind}<span>{label}</span></a>'
        if key != "leistungen":
            return f"<li>{a}</li>"
        cards = "".join(
            f'<li><a class="mega__card" data-c="{c}" href="{root}leistungen.html#{anchor}">{ICON.format(ic)}<span><b>{t}</b><small>{d}</small><em>{pr}</em></span></a></li>'
            for anchor, t, d, pr, ic, c in [
                ("websites", "Websites und Landingpages", "Unternehmenswebsites, Landingpages, Relaunch, Texte", f"ab {SITE['price_fokus']}", "browser", "blue"),
                ("shops", "Onlineshops", "Produktseiten, Checkout, Zahlung und Versand", "Festpreis nach Analyse", "cart", "ochre"),
                ("anwendungen", "Web-Apps und Schnittstellen", "Portale, Buchungssysteme, Automatisierung", "Festpreis je Phase", "app", "green"),
                ("sichtbarkeit", "Sichtbarkeit und Betreuung", "Lokale SEO, Google-Profil, Pflege", f"ab {SITE['care_basis']} im Monat", "search", "violet")])
        mega = (f'<div class="mega" id="mega" hidden data-mega><ul class="mega__grid">{cards}</ul>'
                f'<div class="mega__side"><p class="mega__h">Nicht sicher, was Sie brauchen?</p><p>Neun Fragen zeigen, wo Ihre Website Besucher verliert.</p>'
                f'<a class="link" href="{root}check/index.html"><span>Website prüfen</span>{ICON.format("arrow")}</a>'
                f'<a class="link" href="{root}preise.html"><span>Preise ansehen</span>{ICON.format("arrow")}</a></div></div>')
        btn = f'<button class="hd__more" type="button" aria-expanded="false" aria-controls="mega" aria-label="Leistungen im Überblick" data-mega-btn>{ICON.format("right")}</button>'
        return f'<li class="has-mega" data-mega-wrap>{a}{btn}{mega}</li>'
    items = "".join(item(*n) for n in NAV2)
    tiles = "".join(
        f'<li><a class="tile tile--{color}" href="{root}{href}"{" aria-current=\"page\"" if cur == key else ""}>'
        f'{ICON.format(icon)}<span><b>{label}</b><small>{desc}</small></span></a></li>'
        for key, href, label, icon, color, desc in NAV2)
    return f'''<header class="hd" data-header>
  <div class="hd__in">
    {wordmark(root)}
    <nav class="hd__nav" aria-label="Hauptnavigation" data-hnav><span class="hd__hover" aria-hidden="true"></span><ul>{items}</ul></nav>
    <div class="hd__act">
      <button class="hd__search" type="button" data-palette-open aria-label="Seite durchsuchen">{ICON.format("search")}<span>Suchen</span><kbd>Strg K</kbd></button>
      <a class="hd__check{" is-current" if cur == "check" else ""}" href="{root}check/index.html">{ICON.format("gauge")}<span>Website prüfen</span></a>
      <a class="btn btn--red btn--sm" href="{root}kontakt.html" data-magnetic><span>Erstgespräch</span>{ICON.format("arrow")}</a>
      <button class="hd__menu" type="button" aria-expanded="false" aria-controls="menue" data-menu-btn>{ICON.format("menu")}<span>Menü</span></button>
    </div>
  </div>
  <div class="hd__progress" aria-hidden="true"><span data-progress></span></div>
  <div class="drawer" id="menue" hidden data-menu>
    <ul class="drawer__tiles">{tiles}</ul>
    <div class="drawer__more">
      <a href="{root}check/index.html">{ICON.format("gauge")}Website selbst prüfen</a>
      <a href="{root}faq.html">{ICON.format("chat")}Häufige Fragen</a>
      <button type="button" data-palette-open>{ICON.format("search")}Seite durchsuchen</button>
      <a href="mailto:{SITE["email"]}">{ICON.format("mail")}{SITE["email"]}</a>
    </div>
    <a class="btn btn--red" href="{root}kontakt.html"><span>Kostenloses Erstgespräch anfragen</span>{ICON.format("arrow")}</a>
  </div>
</header>'''


def tabbar(meta, root):
    cur = meta.get("nav")
    items = [("start", "index.html", "Start", "spark"), ("leistungen", "leistungen.html", "Leistungen", "layers"),
             ("preise", "preise.html", "Preise", "euro"), ("check", "check/index.html", "Prüfen", "gauge"), ("kontakt", "kontakt.html", "Kontakt", "chat")]
    lis = "".join(f'<li><a href="{root}{h}"{" aria-current=\"page\"" if cur == k else ""}>{ICON.format(i)}<span>{l}</span></a></li>' for k, h, l, i in items)
    return f'<nav class="tabbar" aria-label="Schnellzugriff" data-tabbar><ul>{lis}</ul></nav>'


def palette(root):
    return (f'<dialog class="palette" id="palette" aria-label="Seite durchsuchen" data-palette data-index="{root}assets/search.json" data-root="{root}">'
            f'<div class="palette__in"><div class="palette__field">{ICON.format("search")}'
            '<input type="search" placeholder="Wonach suchen Sie? Zum Beispiel Preise, Shop, Dauer" aria-label="Suchbegriff" autocomplete="off" '
            'role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" data-palette-input>'
            '<kbd>Esc</kbd></div><ul class="palette__list" id="palette-list" role="listbox" aria-label="Ergebnisse" data-palette-list></ul>'
            '<p class="palette__foot"><span><kbd>↑</kbd><kbd>↓</kbd> wählen</span><span><kbd>Enter</kbd> öffnen</span></p></div></dialog>')


def pagenav(meta):
    chapters = meta.get("chapters", [])
    if not chapters:
        return ""
    lis = "".join(f'<li><a href="#{c[0]}" data-c="{c[2] if len(c) > 2 else "ink"}">{html.escape(c[1])}</a></li>' for c in chapters)
    return f'<nav class="pagenav" aria-label="Auf dieser Seite" data-pagenav><ul>{lis}</ul></nav>'


def footer2(root):
    cols = "".join(f'<li><a href="{root}{href}">{label}</a></li>' for _, href, label, *_ in NAV2)
    return f'''<footer class="ft">
  <div class="ft__in">
    <div class="ft__brand">
      {wordmark(root)}
      <p class="ft__claim">{SITE["claim"]}</p>
      <p>Webdesign und Entwicklung aus Leipzig – für Selbstständige, Mittelstand und Start-ups.</p>
    </div>
    <nav class="ft__col" aria-label="Seiten"><p class="ft__h">Seiten</p><ul>{cols}</ul></nav>
    <nav class="ft__col" aria-label="Service"><p class="ft__h">Service</p><ul><li><a href="{root}check/index.html">Website prüfen</a></li><li><a href="{root}faq.html">Häufige Fragen</a></li><li><a href="{root}kontakt.html">Kontakt</a></li></ul></nav>
    <div class="ft__col"><p class="ft__h">Kontakt</p><ul><li><a href="mailto:{SITE["email"]}">{SITE["email"]}</a></li><li>Antwort {SITE["response"]}</li><li>{(SITE["street"] + ", " + SITE["zip"] + " ") if SITE["street"] else ""}{SITE["city"]}</li></ul></div>
  </div>
  <div class="ft__legal">
    <p>© {SITE["year"]} {SITE["name"]} · Preise sind Endpreise gemäß § 19 UStG.</p>
    <ul><li><button class="ft__motion" type="button" data-motion-toggle aria-pressed="false">Animationen pausieren</button></li><li><a href="{root}impressum.html">Impressum</a></li><li><a href="{root}datenschutz.html">Datenschutz</a></li><li><a href="{root}zentrale/" rel="nofollow">Agentur-Zentrale</a></li></ul>
  </div>
</footer>'''


def jsonld(meta, url):
    base = SITE["url"]
    if meta["out"] == "index.html":
        data = {"@context": "https://schema.org", "@graph": [
            {"@type": "WebSite", "@id": base + "/#website", "url": base + "/", "name": "LINUA", "inLanguage": "de-DE"},
            {"@type": "ProfessionalService", "@id": base + "/#studio", "name": "LINUA – Webdesign", "url": base + "/",
             "email": SITE["email"], "founder": {"@type": "Person", "name": SITE["owner"]},
             "address": {k: v for k, v in {"@type": "PostalAddress", "streetAddress": SITE["street"], "postalCode": SITE["zip"],
                         "addressLocality": SITE["city"], "addressCountry": "DE"}.items() if v},
             "areaServed": ["Leipzig", "Landkreis Leipzig", "Nordsachsen", "Deutschland"],
             "description": meta["description"], "slogan": SITE["claim"]}]}
    else:
        data = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Start", "item": base + "/"},
            {"@type": "ListItem", "position": 2, "name": meta.get("crumb", meta["title"]), "item": url}]}
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + "</script>"


def page(meta, body, root, prod):
    url = SITE["url"] + "/" + meta["out"].replace("index.html", "")
    csp = ("default-src 'self'; script-src 'self' '" + sha(JS_FLAG) + "'; style-src 'self' 'unsafe-inline'; "
           "img-src 'self' data:; font-src 'self'; connect-src 'self' https://cypzmrogwltxksimadpn.supabase.co; "
           "form-action 'self' mailto:; base-uri 'self'; object-src 'none'")
    robots = "index,follow" if meta.get("index", True) else "noindex,follow"
    title = html.escape(meta["title"])
    desc = html.escape(meta["description"])
    v2 = meta.get("v") == 2
    if v2 and '<section class="phero"' in body:
        objs = {"blue": ("ob-torus", "ob-pill"), "ochre": ("ob-pill", "ob-sphere"), "green": ("ob-cone", "ob-torus"),
                "violet": ("ob-cube", "ob-pill2"), "red": ("ob-sphere", "ob-cube"), "ink": ("ob-torus", "ob-sphere")}[meta.get("c", "red")]
        deco = (f'<div class="deco3d" aria-hidden="true"><svg class="ob ob--a" data-depth="26"><use href="#{objs[0]}"/></svg>'
                f'<svg class="ob ob--b" data-depth="-18"><use href="#{objs[1]}"/></svg><svg class="st st--spark sp1" data-depth="12"><use href="#st-spark"/></svg>'
                f'<svg class="st st--spark sp2" data-depth="-10"><use href="#st-spark"/></svg></div>')
        body = re.sub(r'(<section class="phero"[^>]*>)', lambda m: m.group(1).replace("<section ", "<section data-scene ") + deco, body, count=1)
    theme = "#FBF8F3" if v2 else ("#5E302D" if meta.get("theme") == "dark" else "#F6F6F3")
    css = "v2.css" if v2 else "site.css"
    js = "v2.js" if v2 else "site.js"
    top = (ICONS + header2(meta, root) + pagenav(meta)) if v2 else (header(meta, root) + spur(meta))
    words = ["Websites", "Onlineshops", "Web-Apps", "Festpreis vor Projektstart", "Ein Ansprechpartner", "Handgebaut in Leipzig", "Schnell geladen", "Alles gehört Ihnen"]
    run = "".join(f'<span>{w}</span><svg class="st st--spark"><use href="#st-spark"/></svg>' for w in words)
    marquee = f'<div class="marquee" data-c="{meta.get("c", "red")}" aria-hidden="true"><div class="marquee__in">{run}{run}</div></div>'
    foot = (marquee + footer2(root) + tabbar(meta, root) + palette(root)) if v2 else footer(root)
    return f'''<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{csp}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="{theme}">
<meta property="og:type" content="website">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="LINUA">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE["url"]}/assets/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{root}assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="{root}assets/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="{root}assets/img/apple-touch-icon.png">
<link rel="manifest" href="{root}site.webmanifest">
<link rel="preload" href="{root}assets/fonts/archivo-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{root}assets/css/{css}">
<script>{JS_FLAG}</script>
{jsonld(meta, url)}
</head>
<body class="page-{meta["slug"]}" data-page-c="{meta.get("c", "red")}">
<a class="skip" href="#inhalt">Zum Inhalt springen</a>
{top}
<main id="inhalt">
{body}
</main>
{foot}
<script src="{root}assets/js/{js}" defer></script>
</body>
</html>
'''


def check(dist, pages):
    problems = []
    files = {p.relative_to(dist).as_posix() for p in dist.rglob("*") if p.is_file()}
    for rel in pages:
        text = (dist / rel).read_text(encoding="utf-8")
        if text.count("<h1") != 1:
            problems.append(f"{rel}: {text.count('<h1')} H1")
        if "[OFFEN" in text:
            problems.append(f"{rel}: enthält [OFFEN]")
        ids = set(re.findall(r'\sid="([^"]+)"', text))
        for ref in re.findall(r'(?:href|src)="([^"]+)"', text):
            if re.match(r"(https?:|mailto:|tel:|data:)", ref):
                continue
            if ref.startswith("#"):
                if ref[1:] and ref[1:] not in ids:
                    problems.append(f"{rel}: Anker {ref} fehlt")
                continue
            path_part = ref.split("#")[0].split("?")[0]
            base = Path(".") if path_part.startswith("/") else Path(rel).parent
            target = (base / path_part.lstrip("/")).as_posix() + ("/" if path_part.endswith("/") else "")
            if target in ("./", "/", "."):
                target = ""
            target = re.sub(r"(^|/)\./", r"\1", target)
            while "/../" in "/" + target:
                target = re.sub(r"[^/]+/\.\./", "", target, count=1)
            if target == "" or target.endswith("/"):
                target += "index.html"
            if target not in files:
                problems.append(f"{rel}: Ziel fehlt {ref}")
    return problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--production", action="store_true")
    args = ap.parse_args()
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(SRC / "static", DIST)
    if (ROOT / "zentrale").exists():
        shutil.copytree(ROOT / "zentrale", DIST / "zentrale")
    built, sitemap, search = [], [], []
    for src in sorted((SRC / "pages").glob("*.html")):
        raw = src.read_text(encoding="utf-8")
        m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", raw, re.S)
        if not m:
            sys.exit(f"{src.name}: Meta-Block fehlt")
        meta = json.loads(m.group(1))
        meta.setdefault("slug", src.stem)
        out = meta["out"]
        root = "../" * out.count("/")
        body = fill(raw[m.end():], {"root": root})
        target = DIST / out
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page(meta, body, root, args.production), encoding="utf-8")
        built.append(out)
        if meta.get("v") == 2 and meta.get("index", True):
            name = meta.get("crumb") or "Start"
            search.append({"t": name, "d": meta["description"], "u": out, "g": "Seite", "c": meta.get("c", "red")})
            for ch in meta.get("chapters", []):
                search.append({"t": ch[1], "d": name, "u": f"{out}#{ch[0]}", "g": "Abschnitt", "c": ch[2] if len(ch) > 2 else meta.get("c", "red")})
            for fid, q in re.findall(r'<details[^>]*\bid="([^"]+)"[^>]*>\s*<summary[^>]*>(.*?)</summary>', body, re.S):
                search.append({"t": re.sub(r"<[^>]+>", "", q).strip(), "d": name, "u": f"{out}#{fid}", "g": "Frage", "c": meta.get("c", "red")})
        if meta.get("index", True):
            sitemap.append((SITE["url"] + "/" + out.replace("index.html", ""), meta.get("priority", "0.7")))
    (DIST / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc><lastmod>{date.today().isoformat()}</lastmod><priority>{p}</priority></url>\n" for u, p in sitemap)
        + "</urlset>\n", encoding="utf-8")
    (DIST / "assets" / "search.json").write_text(json.dumps(search, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (DIST / "robots.txt").write_text(f"User-agent: *\nDisallow: /zentrale/\n\nSitemap: {SITE['url']}/sitemap.xml\n", encoding="utf-8")
    problems = check(DIST, built)
    print(f"{len(built)} Seiten gebaut → {DIST}")
    for p in problems:
        print("  Problem:", p)
    if problems and args.production:
        sys.exit("Abbruch: Probleme im Produktions-Build.")


if __name__ == "__main__":
    main()
