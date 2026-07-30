import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computeValuation, type Coefficient } from "@/lib/valuation";

const submitSchema = z.object({
  regionSlug: z.string().min(1).max(80),
  departmentCode: z.string().min(1).max(4),
  city: z.string().max(120).optional().nullable(),
  transactionType: z.enum(["murs", "fonds", "murs_fonds"]),
  leaseYearsRemaining: z.number().int().min(0).max(99).optional().nullable(),
  isEmphyteotic: z.boolean().optional().nullable(),
  emphyteoticYearsRemaining: z.number().int().min(0).max(99).optional().nullable(),
  hotelName: z.string().max(160).optional().nullable(),
  roomCount: z.number().int().min(1).max(500),
  starRating: z.number().int().min(0).max(5),
  isIndependent: z.boolean().default(true),
  hasRestaurant: z.boolean().default(false),
  hasLicence4: z.boolean().default(false),
  worksNeeded: z.enum(["aucun", "legers", "importants"]).optional().nullable(),
  annualRevenueCents: z.number().int().nonnegative().optional().nullable(),
  ebitdaCents: z.number().int().nonnegative().optional().nullable(),
  occupancyRate: z.number().min(0).max(100).optional().nullable(),
  email: z.string().email().max(200),
  phone: z.string().max(50).optional().nullable(),
  firstName: z.string().max(80).optional().nullable(),
  lastName: z.string().max(80).optional().nullable(),
  saleIntent: z.enum(["moins_1_an", "1_a_2_ans", "plus_2_ans", "curiosite"]),
  consentContact: z.boolean(),
  consentMarketing: z.boolean(),
  utm_source: z.string().max(100).optional().nullable(),
  utm_medium: z.string().max(100).optional().nullable(),
  utm_campaign: z.string().max(100).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  landing_page: z.string().max(500).optional().nullable(),
  turnstileToken: z.string().max(4000).optional().nullable(),
});

async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // pas configuré → on n'exige pas
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export const submitEstimation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data }) => {
    // 1. Anti-spam
    const okTurnstile = await verifyTurnstile(data.turnstileToken);
    if (!okTurnstile) {
      throw new Error("Vérification anti-spam échouée. Merci de recharger la page.");
    }

    // 1b. Anti-abus : email jetable
    const { isDisposableEmail } = await import("@/lib/disposable-emails");
    if (isDisposableEmail(data.email)) {
      throw new Error("Merci d'utiliser une adresse email personnelle ou professionnelle.");
    }

    // 2. Client privilégié pour insertion (bypass RLS, écriture serveur uniquement)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 2b. Limite de débit : max 5 soumissions / heure / email
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const emailLower = data.email.toLowerCase().trim();
    const { count } = await supabaseAdmin
      .from("estimation")
      .select("id", { count: "exact", head: true })
      .eq("email", emailLower)
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 5) {
      throw new Error("Trop de soumissions récentes. Réessayez dans une heure.");
    }

    // 3. Coefficient de la région × classement
    const { data: coef, error: coefErr } = await supabaseAdmin
      .from("valuation_coefficient")
      .select("*")
      .eq("region_slug", data.regionSlug)
      .eq("star_rating", data.starRating)
      .single();
    if (coefErr || !coef) {
      throw new Error("Coefficient de valorisation introuvable pour cette région/classement.");
    }

    // 4. Recalcul côté serveur (autoritatif)
    const result = computeValuation(
      {
        regionSlug: data.regionSlug,
        starRating: data.starRating,
        roomCount: data.roomCount,
        transactionType: data.transactionType,
        worksNeeded: data.worksNeeded ?? null,
        hasRestaurant: data.hasRestaurant,
        hasLicence4: data.hasLicence4,
        annualRevenueCents: data.annualRevenueCents ?? null,
        ebitdaCents: data.ebitdaCents ?? null,
        occupancyRate: data.occupancyRate ?? null,
        leaseYearsRemaining: data.leaseYearsRemaining ?? null,
        isEmphyteotic: data.isEmphyteotic ?? null,
        emphyteoticYearsRemaining: data.emphyteoticYearsRemaining ?? null,
      },
      coef as unknown as Coefficient,
    );

    // 5. Insert
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("estimation")
      .insert({
        region_slug: data.regionSlug,
        department_code: data.departmentCode,
        city: data.city ?? null,
        transaction_type: data.transactionType,
        room_count: data.roomCount,
        star_rating: data.starRating,
        is_independent: data.isIndependent,
        has_restaurant: data.hasRestaurant,
        has_licence_4: data.hasLicence4,
        works_needed: data.worksNeeded ?? null,
        annual_revenue_cents: data.annualRevenueCents ?? null,
        ebitda_cents: data.ebitdaCents ?? null,
        occupancy_rate: data.occupancyRate ?? null,
        value_low_cents: result.valueLowCents,
        value_high_cents: result.valueHighCents,
        method_used: result.methodUsed,
        calculation_detail: result.detail as never,
        email: data.email.toLowerCase().trim(),
        phone: data.phone ?? null,
        first_name: data.firstName ?? null,
        last_name: data.lastName ?? null,
        sale_intent: data.saleIntent,
        consent_contact: data.consentContact,
        consent_marketing: data.consentMarketing,
        utm_source: data.utm_source ?? null,
        utm_medium: data.utm_medium ?? null,
        utm_campaign: data.utm_campaign ?? null,
        referrer: data.referrer ?? null,
        landing_page: data.landing_page ?? null,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.error("insert estimation failed", insertErr);
      throw new Error("Enregistrement impossible. Veuillez réessayer.");
    }

    // 6. Envoi du rapport par email (best-effort — n'échoue jamais le parcours)
    let reportSent = false;
    try {
      const { sendEstimationReport } = await import("@/lib/send-report.server");
      const r = await sendEstimationReport({
        estimationId: inserted.id,
        email: emailLower,
        low: result.valueLowCents,
        high: result.valueHighCents,
        methodUsed: result.methodUsed,
        regionSlug: data.regionSlug,
        saleIntent: data.saleIntent,
        draft: {
          regionSlug: data.regionSlug,
          departmentCode: data.departmentCode,
          city: data.city ?? undefined,
          transactionType: data.transactionType,
          roomCount: data.roomCount,
          starRating: data.starRating,
          hasRestaurant: data.hasRestaurant,
          hasLicence4: data.hasLicence4,
          annualRevenueCents: data.annualRevenueCents ?? undefined,
          ebitdaCents: data.ebitdaCents ?? undefined,
          occupancyRate: data.occupancyRate ?? undefined,
          firstName: data.firstName ?? undefined,
          lastName: data.lastName ?? undefined,
          email: emailLower,
          phone: data.phone ?? undefined,
        },
      });
      reportSent = r.ok;
    } catch (err) {
      console.error("sendEstimationReport failed", err);
    }

    return {
      id: inserted.id,
      valueLowCents: result.valueLowCents,
      valueHighCents: result.valueHighCents,
      methodUsed: result.methodUsed,
      outlier: result.detail.outlier,
      divergent: result.detail.divergent,
      reportSent,
    };
  });
