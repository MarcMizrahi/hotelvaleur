import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Coefficient } from "@/lib/valuation";
import type { ComparableRow } from "@/lib/comparables";

// Ensures the caller is an admin. Throws otherwise.
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("profile")
    .select("role")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.role !== "admin") throw new Error("Forbidden");
}

export const checkAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profile")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    return { isAdmin: data?.role === "admin", userId: context.userId };
  });

const periodSchema = z.object({
  days: z.enum(["7", "30", "90", "all"]).default("30"),
});

function daysToSince(days: string): string | null {
  if (days === "all") return null;
  const n = Number(days);
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const QUALIFIED_INTENTS = ["moins_1_an", "1_a_2_ans"];

export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const since = daysToSince(data.days);

    // Month leads
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const prevMonthStart = new Date(monthStart);
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

    const [monthLeads, prevMonthLeads, totalLeads, totalEstimations, periodEstimations, periodLeads] =
      await Promise.all([
        context.supabase
          .from("estimation")
          .select("id", { count: "exact", head: true })
          .in("sale_intent", QUALIFIED_INTENTS)
          .gte("created_at", monthStart.toISOString()),
        context.supabase
          .from("estimation")
          .select("id", { count: "exact", head: true })
          .in("sale_intent", QUALIFIED_INTENTS)
          .gte("created_at", prevMonthStart.toISOString())
          .lt("created_at", monthStart.toISOString()),
        context.supabase
          .from("estimation")
          .select("id", { count: "exact", head: true })
          .in("sale_intent", QUALIFIED_INTENTS),
        context.supabase.from("estimation").select("id", { count: "exact", head: true }),
        context.supabase
          .from("estimation")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since ?? "1970-01-01"),
        context.supabase
          .from("estimation")
          .select("id", { count: "exact", head: true })
          .in("sale_intent", QUALIFIED_INTENTS)
          .gte("created_at", since ?? "1970-01-01"),
      ]);

    // Funnel from analytics_event
    const funnelSteps = [
      "visite",
      "funnel_vendeur.started",
      "estimation.step_1",
      "estimation.step_2",
      "estimation.step_3",
      "estimation.step_4",
      "estimation.step_5",
      "estimation.step_6",
      "estimation.completed",
    ];
    let eventsQuery = context.supabase
      .from("analytics_event")
      .select("name, session_id");
    if (since) eventsQuery = eventsQuery.gte("created_at", since);
    const { data: events } = await eventsQuery.limit(50000);
    const byStep = new Map<string, Set<string>>();
    funnelSteps.forEach((s) => byStep.set(s, new Set()));
    (events ?? []).forEach((e: any) => {
      if (byStep.has(e.name)) byStep.get(e.name)!.add(e.session_id);
    });
    const funnel = funnelSteps.map((s) => ({ step: s, sessions: byStep.get(s)!.size }));

    // Sources
    let srcQuery = context.supabase
      .from("estimation")
      .select("utm_source, utm_medium, utm_campaign, referrer, sale_intent, created_at");
    if (since) srcQuery = srcQuery.gte("created_at", since);
    const { data: srcRows } = await srcQuery.limit(10000);
    const sources = new Map<
      string,
      { source: string; estimations: number; qualified: number }
    >();
    (srcRows ?? []).forEach((r: any) => {
      const key =
        r.utm_source ||
        (r.referrer ? new URL(r.referrer.startsWith("http") ? r.referrer : `https://${r.referrer}`).hostname : "direct");
      const cur = sources.get(key) ?? { source: key, estimations: 0, qualified: 0 };
      cur.estimations += 1;
      if (QUALIFIED_INTENTS.includes(r.sale_intent)) cur.qualified += 1;
      sources.set(key, cur);
    });
    const sourcesList = Array.from(sources.values())
      .sort((a, b) => b.qualified - a.qualified)
      .slice(0, 20);

    return {
      monthLeads: monthLeads.count ?? 0,
      prevMonthLeads: prevMonthLeads.count ?? 0,
      totalLeads: totalLeads.count ?? 0,
      totalEstimations: totalEstimations.count ?? 0,
      periodEstimations: periodEstimations.count ?? 0,
      periodLeads: periodLeads.count ?? 0,
      qualifiedRate:
        (totalEstimations.count ?? 0) > 0
          ? (totalLeads.count ?? 0) / (totalEstimations.count ?? 1)
          : 0,
      funnel,
      sources: sourcesList,
    };
  });

const leadsFilterSchema = z.object({
  intent: z.string().optional(),
  region: z.string().optional(),
  status: z.string().optional(),
  days: z.enum(["7", "30", "90", "all"]).default("all"),
  hasFinancials: z.boolean().optional(),
  limit: z.number().min(1).max(500).default(100),
});

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => leadsFilterSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("estimation")
      .select(
        "id, created_at, region_slug, department_code, city, hotel_name, room_count, star_rating, transaction_type, value_low_cents, value_high_cents, sale_intent, status, email, phone, first_name, last_name, consent_contact, consent_marketing, method_used, calculation_detail, annual_revenue_cents, ebitda_cents, price_expectation_cents, works_needed, works_cost_cents, agent_id, assigned_at"
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.intent) q = q.eq("sale_intent", data.intent);
    if (data.region) q = q.eq("region_slug", data.region);
    if (data.status) q = q.eq("status", data.status);
    if (data.hasFinancials) q = q.not("ebitda_cents", "is", null);
    const since = daysToSince(data.days);
    if (since) q = q.gte("created_at", since);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const [{ data: lead }, { data: emails }] = await Promise.all([
      context.supabase.from("estimation").select("*").eq("id", data.id).maybeSingle(),
      context.supabase
        .from("email_log")
        .select("*")
        .eq("estimation_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (!lead) throw new Error("Not found");
    return { lead, emails: emails ?? [] };
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z
          .enum(["nouveau", "qualifie", "injoignable", "hors_cible", "archive"])
          .optional(),
        internal_notes: z.string().max(5000).optional(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const patch: { status?: string; internal_notes?: string } = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.internal_notes !== undefined) patch.internal_notes = data.internal_notes;
    const { error } = await context.supabase.from("estimation").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);

    // Estimation validée (qualifiée) → rapport PDF généré et envoyé à l'agent.
    let report: { ok: boolean; sentTo?: string; reason?: string } | null = null;
    if (data.status === "qualifie") {
      try {
        const { generateAndSendEstimationReport } = await import(
          "@/lib/estimation-report.server"
        );
        const res = await generateAndSendEstimationReport(data.id);
        report = {
          ok: res.ok,
          ...(res.sentTo ? { sentTo: res.sentTo } : {}),
          ...(res.reason ? { reason: res.reason } : {}),
        };
      } catch (err) {
        console.error("[report] auto delivery failed", err);
        report = { ok: false, reason: "Rapport non généré" };
      }
    }
    return { ok: true, report };
  });

/** Génère (ou régénère) le rapport PDF d'une estimation et l'envoie à l'agent. */
export const sendEstimationReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), force: z.boolean().default(true) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { generateAndSendEstimationReport } = await import(
      "@/lib/estimation-report.server"
    );
    const res = await generateAndSendEstimationReport(data.id, { force: data.force });
    return res;
  });

/** Historique des rapports générés pour une estimation (admin). */
export const listEstimationReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("estimation_report")
      .select("*")
      .eq("estimation_id", data.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });


export const listCoefficients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("valuation_coefficient")
      .select("*")
      .order("region_slug")
      .order("star_rating");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateCoefficient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        ebitda_multiple_low: z.number().min(1).max(20),
        ebitda_multiple_high: z.number().min(1).max(20),
        price_per_room_low_cents: z.number().int().min(500_000).max(200_000_000),
        price_per_room_high_cents: z.number().int().min(500_000).max(200_000_000),
      })
      .refine((v) => v.ebitda_multiple_low < v.ebitda_multiple_high, {
        message: "multiple bas doit être < multiple haut",
      })
      .refine((v) => v.price_per_room_low_cents < v.price_per_room_high_cents, {
        message: "prix bas doit être < prix haut",
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("valuation_coefficient")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listEmailLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("email_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Recalcul automatique de la fourchette d'une estimation à partir du moteur
 * déterministe (coefficients région × étoiles + comparables marché validés).
 * `apply: false` renvoie une simulation, `apply: true` enregistre le résultat.
 */
const recomputeSchema = z.object({
  id: z.string().uuid(),
  apply: z.boolean().default(false),
  overrides: z
    .object({
      roomCount: z.number().int().min(1).max(2000).nullable().optional(),
      starRating: z.number().int().min(0).max(5).nullable().optional(),
      annualRevenueCents: z.number().int().min(0).nullable().optional(),
      ebitdaCents: z.number().int().min(0).nullable().optional(),
      occupancyRate: z.number().min(0).max(100).nullable().optional(),
      worksCostCents: z.number().int().min(0).nullable().optional(),
    })
    .default({}),
});

export const recomputeEstimation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recomputeSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { computeValuation } = await import("@/lib/valuation");
    const { selectComparables } = await import("@/lib/comparables");

    const { data: row, error } = await supabaseAdmin
      .from("estimation")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Estimation introuvable");

    const o = data.overrides ?? {};
    const pick = <T,>(override: T | null | undefined, current: T | null): T | null =>
      override === undefined ? current : override;

    const starRating = pick(o.starRating, row.star_rating) ?? row.star_rating;
    const roomCount = pick(o.roomCount, row.room_count) ?? row.room_count;

    const { data: coef } = await supabaseAdmin
      .from("valuation_coefficient")
      .select("*")
      .eq("region_slug", row.region_slug)
      .eq("star_rating", starRating)
      .maybeSingle();
    if (!coef) throw new Error("Coefficient introuvable pour cette région / ce classement.");

    const { data: comps } = await supabaseAdmin
      .from("market_transaction")
      .select("star_rating, price_per_room_cents, transaction_type")
      .eq("status", "validated")
      .eq("region_slug", row.region_slug)
      .not("price_per_room_cents", "is", null);

    const comparables = selectComparables((comps ?? []) as ComparableRow[], starRating);

    const result = computeValuation(
      {
        regionSlug: row.region_slug,
        starRating,
        roomCount,
        hotelName: row.hotel_name,
        transactionType: row.transaction_type as never,
        worksNeeded: row.works_needed as never,
        worksCostCents: pick(o.worksCostCents, row.works_cost_cents as number | null),
        hasRestaurant: row.has_restaurant,
        hasLicence4: row.has_licence_4,
        annualRevenueCents: pick(o.annualRevenueCents, row.annual_revenue_cents as number | null),
        ebitdaCents: pick(o.ebitdaCents, row.ebitda_cents as number | null),
        occupancyRate: pick(o.occupancyRate, row.occupancy_rate as number | null),
        comparables,
      },
      coef as unknown as Coefficient,
    );

    if (data.apply) {
      const { error: upErr } = await supabaseAdmin
        .from("estimation")
        .update({
          star_rating: starRating,
          room_count: roomCount,
          annual_revenue_cents: pick(o.annualRevenueCents, row.annual_revenue_cents as number | null),
          ebitda_cents: pick(o.ebitdaCents, row.ebitda_cents as number | null),
          occupancy_rate: pick(o.occupancyRate, row.occupancy_rate as number | null),
          works_cost_cents: pick(o.worksCostCents, row.works_cost_cents as number | null),
          value_low_cents: result.valueLowCents,
          value_high_cents: result.valueHighCents,
          method_used: result.methodUsed,
          calculation_detail: result.detail as never,
        })
        .eq("id", data.id);
      if (upErr) throw new Error(upErr.message);
    }

    const d = result.detail;
    const formula: string[] = [];
    if (d.perRoom) {
      formula.push(
        `Prix par chambre : ${roomCount} chambres × ${(coef.price_per_room_low_cents / 100_000).toFixed(0)} k€–${(coef.price_per_room_high_cents / 100_000).toFixed(0)} k€`,
      );
    }
    if (d.ebitda) {
      formula.push(
        `Multiple d'EBITDA : EBITDA ${(d.ebitda.used / 100_000).toFixed(0)} k€${d.ebitda.estimated ? " (estimé)" : ""} × ${coef.ebitda_multiple_low}–${coef.ebitda_multiple_high}`,
      );
    }
    if (d.perRoom && d.ebitda) {
      formula.push("Combinaison pondérée des deux méthodes");
    }
    if (d.marketAnchor) {
      formula.push(
        `Recentrage marché : médiane ${(d.marketAnchor.medianPerRoomCents / 100_000).toFixed(0)} k€/chambre sur ${d.marketAnchor.sampleSize} transaction(s) (poids ${Math.round(d.marketAnchor.weight * 100)} %)`,
      );
    }
    for (const a of d.adjustments) {
      formula.push(`Ajustement ${a.label} : ×${a.factor.toFixed(2)}`);
    }
    if (d.worksDeductionCents > 0) {
      formula.push(`Déduction travaux : −${(d.worksDeductionCents / 100_000).toFixed(0)} k€`);
    }

    return {
      applied: data.apply,
      previous: {
        valueLowCents: Number(row.value_low_cents),
        valueHighCents: Number(row.value_high_cents),
        methodUsed: row.method_used,
      },
      valueLowCents: result.valueLowCents,
      valueHighCents: result.valueHighCents,
      methodUsed: result.methodUsed,
      formula,
      warnings: [
        ...(d.outlier ? ["Valeur atypique par rapport au segment"] : []),
        ...(d.divergent ? ["Méthodes divergentes (> 60 % d'écart)"] : []),
      ],
    };
  });
