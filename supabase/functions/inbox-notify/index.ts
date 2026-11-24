// LINUA – E-Mail-Benachrichtigung bei neuer Anfrage im Eingang der Agentur-Zentrale.
// Ausgelöst vom Datenbank-Trigger zentrale_inbox_notify (pg_net) mit { id }.
// Versand über das Strato-Postfach hallo@linua.de (SMTPS, Port 465).
// Secret SMTP_PASS trägt Rony selbst im Supabase-Dashboard ein (Edge Functions → Secrets).
// Kein eigenes Geheimnis nötig: Die Funktion liest die Anfrage selbst aus der Datenbank
// (direkte Verbindung über SUPABASE_DB_URL, unabhängig von API-Schlüsseln)
// und verschickt nur für Einträge, die jünger als 10 Minuten sind.
import nodemailer from "npm:nodemailer@6.9.16";
import postgres from "npm:postgres@3.4.4";

const MAX_AGE_MS = 10 * 60 * 1000;
const oneLine = (s: unknown) => String(s ?? "").replace(/[\r\n"<>]+/g, " ").trim().slice(0, 180);
const emailOk = (v: unknown) => typeof v === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && v.length <= 254;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Nur POST", { status: 405 });
  let id = "";
  try { id = String((await req.json()).id ?? ""); } catch { return new Response("Ungültige Anfrage", { status: 400 }); }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Ungültige ID", { status: 400 });

  let row: { id: string; created_at: string; subject: string; body: string; name: string | null; email: string } | undefined;
  const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
  try {
    [row] = await sql`select id, created_at, subject, body, name, email from public.zentrale_inbox where id = ${id}::uuid`;
  } catch (e) {
    console.error("Datenbank-Abfrage fehlgeschlagen:", e instanceof Error ? e.message : e);
    return new Response("Datenbankfehler", { status: 500 });
  } finally {
    await sql.end({ timeout: 2 });
  }
  if (!row) { console.error("Anfrage nicht gefunden:", id); return new Response("Nicht gefunden", { status: 404 }); }
  if (Date.now() - new Date(row.created_at).getTime() > MAX_AGE_MS) return new Response("Zu alt", { status: 409 });

  const pass = Deno.env.get("SMTP_PASS");
  if (!pass) return new Response("SMTP_PASS fehlt", { status: 500 });
  const user = Deno.env.get("SMTP_USER") ?? "hallo@linua.de";
  const to = Deno.env.get("NOTIFY_TO") ?? "hallo@linua.de";

  const when = new Date(row.created_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" });
  const name = oneLine(row.name) || "Unbekannt";
  const text = [
    `Neue Anfrage über linua.de – ${when} Uhr`,
    "",
    `Von: ${name} <${row.email}>`,
    "",
    String(row.body),
    "",
    "—",
    "Antworten: einfach auf diese E-Mail antworten (geht an die anfragende Person).",
    "Eingang der Agentur-Zentrale: https://www.linua.de/zentrale/",
  ].join("\n");

  try {
    const t = nodemailer.createTransport({ host: "smtp.strato.de", port: 465, secure: true, auth: { user, pass } });
    await t.sendMail({
      from: `"LINUA Website" <${user}>`,
      to,
      replyTo: emailOk(row.email) ? `"${name}" <${row.email}>` : undefined,
      subject: `Neue Anfrage: ${oneLine(row.subject)}`,
      text,
    });
  } catch (e) {
    console.error("Versand fehlgeschlagen:", e instanceof Error ? e.message : e);
    return new Response("Versand fehlgeschlagen", { status: 502 });
  }
  return new Response("ok");
});
