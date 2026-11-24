# Quellcode-Zweig

Dieser Zweig wird **nicht veröffentlicht**. Die Website geht nur bei einem Push auf `main` live (`.github/workflows/pages.yml`).

Inhalt:
- `supabase/schema.sql` – Datenbankschema der Agentur-Zentrale, am 24.11.2026 nur lesend aus der laufenden Datenbank rekonstruiert (Tabellen, Regeln, Funktionen, Trigger, Rechte, Speicher). Ersetzt das verlorene `setup.sql`. Keine Daten, keine Geheimnisse.

Hintergrund: Der ursprüngliche Website-Build (`build.py`, `src/`) und die Supabase-Dateien lagen nur in einer Arbeitsumgebung und sind verloren. Der Build für das Redesign 2026 entsteht neu auf dem Zweig `redesign` und kommt erst nach Ronys Freigabe nach `main`.
