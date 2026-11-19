import { timingSafeEqual } from "crypto";

/**
 * Authentification des webhooks appelés par le planificateur (pg_cron).
 * Server-only.
 *
 * - Si CRON_SECRET est défini, seule cette valeur est acceptée
 *   (en-tête `x-cron-secret`, `apikey` ou `Authorization: Bearer …`).
 * - Sinon, comportement historique : la clé publishable Supabase est acceptée.
 *   Cette clé est publique (présente dans le bundle client) : définir
 *   CRON_SECRET et l'ajouter aux jobs pg_cron est recommandé.
 */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function getProvidedCronKey(headers: Headers): string | null {
  return (
    headers.get("x-cron-secret") ??
    headers.get("apikey") ??
    headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null
  );
}

export function isAuthorizedCronRequest(
  headers: Headers,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const provided = getProvidedCronKey(headers);
  if (!provided) return false;
  const cronSecret = env["CRON_SECRET"]?.trim();
  const expected = cronSecret || env["SUPABASE_PUBLISHABLE_KEY"] || env["SUPABASE_ANON_KEY"];
  if (!expected) return false;
  return safeEqual(provided, expected);
}

export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
