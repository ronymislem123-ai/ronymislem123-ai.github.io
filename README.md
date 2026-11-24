# linua.de – Website und Agentur-Zentrale

- `src/pages/*.html` – Seiteninhalte (oben ein `<!--meta {...} -->`-Block)
- `src/static/` – wird 1:1 veröffentlicht (CSS, JS, Schrift, Bilder, CNAME)
- `zentrale/` – interne Agentur-Zentrale, wird unverändert mitkopiert
- `supabase/schema.sql` – Datenbankschema der Zentrale (nur lesend rekonstruiert, 24.11.2026)
- `build.py` – baut nach `dist/` (nur Python 3, keine Pakete) und prüft Links, H1 und `[OFFEN]`

Lokal: `python3 build.py` · Live: Push auf `main` → GitHub Actions baut mit `--production` und veröffentlicht `dist/`.
Design-System „Portal“: Linie und Punkt, Archivo (OFL, lokal), Farben in `src/static/assets/css/site.css`.
