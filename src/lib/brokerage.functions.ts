import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BROKERAGE_PURPOSE = "brokerage";

/* ------------------------------------------------------------------ */
/* Public : contexte de la page de mise en relation                     */
/* ------------------------------------------------------------------ */

export const getBrokerageContext = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(10).max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const { verifyToken } = await import("@/lib/hmac.server");
    const payload = verifyToken(data.token, BROKERAGE_PURPOSE);
    if (!payload) return { ok: false as const, reason: "invalid" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: est } = await supabaseAdmin
      .from("estimation")
      .select(
        "id, hotel_name, city, region_slug, department_code, room_count, star_rating, transaction_type, value_low_cents, value_high_cents, first_name, phone",
      )
      .eq("id", payload.subject)
      .maybeSingle();
    if (!est) return { ok: false as const, reason: "invalid" as const };

    const { data: existing } = await supabaseAdmin
      .from("brokerage_lead")
      .select("id, status, agent_id")
      .eq("estimation_id", est.id)
      .maybeSingle();

    let agentName: string | null = null;
    if (existing?.agent_id) {
      const { data: ag } = await supabaseAdmin
        .from("broker_agent")
        .select("full_name, company")
        .eq("id", existing.agent_id)
        .maybeSingle();
      agentName = ag ? `${ag.full_name}${ag.company ? ` — ${ag.company}` : ""}` : null;
    }

    return {
      ok: true as const,
      estimation: est,
      alreadySubmitted: !!existing,
      agentName,
    };
  });

/* ------------------------------------------------------------------ */
/* Public : soumission de la demande                                    */
/* ------------------------------------------------------------------ */

const requestSchema = z.object({
  token: z.string().min(10).max(2000),
  saleHorizon: z.enum(["moins_6_mois", "6_18_mois", "exploration", "fonds_seul"]),
  operationType: z.enum(["murs_fonds", "fonds", "murs", "bail"]),
  hasMandate: z.boolean(),
  confidential: z.boolean(),
  availability: z.string().trim().max(300).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().max(1500).optional().nullable(),
  consentShare: z.literal(true),
});

export const submitBrokerageRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestSchema.parse(d))
  .handler(async ({ data }) => {
    const { verifyToken } = await import("@/lib/hmac.server");
    const payload = verifyToken(data.token, BROKERAGE_PURPOSE);
    if (!payload) throw new Error("Lien expiré ou invalide. Relancez une estimation.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: est } = await supabaseAdmin
      .from("estimation")
      .select(
        "id, hotel_name, city, region_slug, department_code, room_count, star_rating, transaction_type, value_low_cents, value_high_cents, email, first_name, last_name, phone",
      )
      .eq("id", payload.subject)
      .maybeSingle();
    if (!est) throw new Error("Estimation introuvable.");

    const { data: existing } = await supabaseAdmin
      .from("brokerage_lead")
      .select("id")
      .eq("estimation_id", est.id)
      .maybeSingle();
    if (existing) {
      return { ok: true as const, alreadySubmitted: true, agentName: null as string | null };
    }

    const { data: lead, error } = await supabaseAdmin
      .from("brokerage_lead")
      .insert({
        estimation_id: est.id,
        sale_horizon: data.saleHorizon,
        operation_type: data.operationType,
        has_mandate: data.hasMandate,
        confidential: data.confidential,
        availability: data.availability ?? null,
        phone: data.phone ?? est.phone ?? null,
        message: data.message ?? null,
        consent_share: true,
      })
      .select("*")
      .single();
    if (error || !lead) throw new Error("Enregistrement impossible. Réessayez.");

    await supabaseAdmin.from("brokerage_lead_event").insert({
      lead_id: lead.id,
      event_type: "created",
      to_value: "nouveau",
      actor: "owner",
    });

    const { autoAssignAgent, sendBrokerageEmails } = await import("@/lib/brokerage.server");
    let agentName: string | null = null;
    try {
      const { agent } = await autoAssignAgent(lead.id, {
        regionSlug: est.region_slug,
        starRating: est.star_rating,
        roomCount: est.room_count,
        operationType: data.operationType,
      });
      agentName = agent ? `${agent.full_name}${agent.company ? ` — ${agent.company}` : ""}` : null;
      await sendBrokerageEmails(est as never, lead as never, agent);
    } catch (err) {
      console.error("brokerage assignment/email failed", err);
    }

    return { ok: true as const, alreadySubmitted: false, agentName };
  });

/* ------------------------------------------------------------------ */
/* Public : agents affichés sur /experts                                */
/* ------------------------------------------------------------------ */

export const listPublicAgents = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await client
    .from("broker_agent")
    .select(
      "id, full_name, company, photo_url, bio, regions, star_ratings, transaction_types, languages, transactions_count",
    )
    .eq("is_public", true)
    .eq("is_active", true)
    .order("transactions_count", { ascending: false });
  return { agents: data ?? [] };
});

/* ------------------------------------------------------------------ */
/* Admin                                                                */
/* ------------------------------------------------------------------ */

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("profile")
    .select("role")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (error || data?.role !== "admin") throw new Error("Accès refusé.");
}

export const listBrokerageLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabase } = context as never as { supabase: any };
    const [{ data: leads }, { data: agents }, { data: events }, { count: estimationCount }] =
      await Promise.all([
        supabase
          .from("brokerage_lead")
          .select(
            "*, estimation:estimation_id (id, hotel_name, city, region_slug, department_code, room_count, star_rating, value_low_cents, value_high_cents, email, first_name, last_name, phone)",
          )
          .order("created_at", { ascending: false })
          .limit(300),
        (await import("@/integrations/supabase/client.server")).supabaseAdmin
          .from("broker_agent")
          .select("*")
          .order("full_name"),
        supabase
          .from("brokerage_lead_event")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase.from("estimation").select("id", { count: "exact", head: true }),
      ]);
    return {
      leads: leads ?? [],
      agents: agents ?? [],
      events: events ?? [],
      estimationCount: estimationCount ?? 0,
    };
  });

export const assignAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ leadId: z.string().uuid(), agentId: z.string().uuid().nullable() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabase } = context as never as { supabase: any };
    const { data: before } = await supabase
      .from("brokerage_lead")
      .select("agent_id, status")
      .eq("id", data.leadId)
      .maybeSingle();
    const { error } = await supabase
      .from("brokerage_lead")
      .update({
        agent_id: data.agentId,
        assigned_at: data.agentId ? new Date().toISOString() : null,
        status: data.agentId && before?.status === "nouveau" ? "attribue" : before?.status,
      })
      .eq("id", data.leadId);
    if (error) throw new Error("Attribution impossible.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("brokerage_lead_event").insert({
      lead_id: data.leadId,
      event_type: data.agentId ? "assigned" : "unassigned",
      from_value: before?.agent_id ?? null,
      to_value: data.agentId,
      agent_id: data.agentId,
      detail: "Attribution manuelle (admin)",
      actor: "admin",
    });
    return { ok: true };
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        leadId: z.string().uuid(),
        status: z.enum(["nouveau", "attribue", "contacte", "mandat", "perdu"]),
        internalNotes: z.string().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabase } = context as never as { supabase: any };
    const { data: before } = await supabase
      .from("brokerage_lead")
      .select("status")
      .eq("id", data.leadId)
      .maybeSingle();
    const patch: Record<string, unknown> = { status: data.status };
    if (data.internalNotes !== undefined) patch["internal_notes"] = data.internalNotes;
    if (data.status === "contacte") patch["contacted_at"] = new Date().toISOString();
    const { error } = await supabase.from("brokerage_lead").update(patch).eq("id", data.leadId);
    if (error) throw new Error("Mise à jour impossible.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("brokerage_lead_event").insert({
      lead_id: data.leadId,
      event_type: "status",
      from_value: before?.status ?? null,
      to_value: data.status,
      actor: "admin",
    });
    return { ok: true };
  });

const agentSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  fullName: z.string().trim().min(2).max(120),
  company: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  bio: z.string().trim().max(1500).optional().nullable(),
  photoUrl: z.string().trim().url().max(500).optional().nullable(),
  regions: z.array(z.string().max(80)).max(30),
  starRatings: z.array(z.number().int().min(0).max(5)).max(6),
  transactionTypes: z.array(z.enum(["murs_fonds", "fonds", "murs", "bail"])).max(4),
  minRooms: z.number().int().min(0).max(500).optional().nullable(),
  maxRooms: z.number().int().min(0).max(500).optional().nullable(),
  languages: z.array(z.string().max(40)).max(10),
  transactionsCount: z.number().int().min(0).max(10000),
  monthlyCapacity: z.number().int().min(1).max(200),
  isActive: z.boolean(),
  isPublic: z.boolean(),
});

export const upsertAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => agentSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const row = {
      full_name: data.fullName,
      company: data.company ?? null,
      email: data.email.toLowerCase(),
      phone: data.phone ?? null,
      bio: data.bio ?? null,
      photo_url: data.photoUrl ?? null,
      regions: data.regions,
      star_ratings: data.starRatings,
      transaction_types: data.transactionTypes,
      min_rooms: data.minRooms ?? null,
      max_rooms: data.maxRooms ?? null,
      languages: data.languages,
      transactions_count: data.transactionsCount,
      monthly_capacity: data.monthlyCapacity,
      is_active: data.isActive,
      is_public: data.isPublic,
    };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = data.id
      ? await supabaseAdmin.from("broker_agent").update(row).eq("id", data.id)
      : await supabaseAdmin.from("broker_agent").insert(row);
    if (error) throw new Error("Enregistrement de l'agent impossible.");
    return { ok: true };
  });

export const getAgentDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ agentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabase } = context as never as { supabase: any };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: agent }, { data: estimations }, { data: leads }, { data: requests }] =
      await Promise.all([
        supabaseAdmin.from("broker_agent").select("*").eq("id", data.agentId).maybeSingle(),
        supabase
          .from("estimation")
          .select(
            "id, hotel_name, city, region_slug, room_count, star_rating, status, value_low_cents, value_high_cents, email, created_at, assigned_at",
          )
          .eq("agent_id", data.agentId)
          .order("assigned_at", { ascending: false })
          .limit(100),
        supabase
          .from("brokerage_lead")
          .select(
            "id, status, sale_horizon, operation_type, phone, created_at, assigned_at, contacted_at, estimation:estimation_id (id, hotel_name, city, room_count, star_rating, value_low_cents, value_high_cents, first_name, last_name, email)",
          )
          .eq("agent_id", data.agentId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabaseAdmin
          .from("agent_valuation_request")
          .select("*")
          .eq("agent_id", data.agentId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
    if (!agent) throw new Error("Agent introuvable.");
    return {
      agent,
      estimations: estimations ?? [],
      leads: leads ?? [],
      requests: requests ?? [],
    };
  });

export const updateAgentRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["nouveau", "en_cours", "traite", "refuse"]),
        adminNotes: z.string().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { status: string; admin_notes?: string | null } = { status: data.status };
    if (data.adminNotes !== undefined) patch.admin_notes = data.adminNotes;
    const { error } = await supabaseAdmin
      .from("agent_valuation_request")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error("Mise à jour impossible.");
    return { ok: true };
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("broker_agent").delete().eq("id", data.id);
    if (error) throw new Error("Suppression impossible.");
    return { ok: true };
  });
