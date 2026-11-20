import { timingSafeEqual } from "crypto";

/**
 * Authentification des webhooks appelés par le planificateur (pg_cron).
 * Server-only.
 *
 * Ordre de vérification (en-tête `x-cron-secret`, `apikey` ou `Authorization: Bearer …`) :
 * 1. La variable d'environnement CRON_SECRET si elle est définie.
 * 2. Le secret partagé `cron_secret` de la table `app_config` (lu avec le rôle
 *    service) — c'est la valeur envoyée par les jobs pg_cron.
 * 3. À défaut, la clé publishable Supabase (comportement historique ; elle est
 *    publique, présente dans le bundle client — ne pas s'y fier durablement).
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

/**
 * Vérification asynchrone complète : CRON_SECRET, puis secret partagé en base,
 * puis clé publishable. À utiliser dans les webhooks.
 */
export async function isAuthorizedCronRequestAsync(headers: Headers): Promise<boolean> {
  const provided = getProvidedCronKey(headers);
  if (!provided) return false;

  const envSecret = process.env["CRON_SECRET"]?.trim();
  if (envSecret) return safeEqual(provided, envSecret);

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", "cron_secret")
      .maybeSingle();
    const shared = data?.value?.trim();
    if (shared) return safeEqual(provided, shared);
  } catch (err) {
    console.error("[cron-auth] lecture du secret partagé impossible", err);
  }

  const fallback = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_ANON_KEY"];
  return fallback ? safeEqual(provided, fallback) : false;
}

export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
