import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LEAD_STATUSES = ["nouveau", "qualifie", "injoignable", "hors_cible", "archive"] as const;

/**
 * Retourne l'id de la fiche agent liée au compte connecté.
 * Auto-liaison : si une fiche agent porte la même adresse email que le compte
 * et n'est encore rattachée à personne, on la rattache une seule fois.
 */
async function resolveAgentId(context: {
  supabase: any;
  userId: string;
  claims: any;
}): Promise<string | null> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const { data: own } = await admin
    .from("broker_agent")
    .select("id")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (own?.id) return own.id;

  const email = (context.claims?.email as string | undefined)?.toLowerCase().trim();
  if (!email) return null;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: match } = await supabaseAdmin
    .from("broker_agent")
    .select("id, user_id")
    .ilike("email", email)
    .is("user_id", null)
    .maybeSingle();
  if (!match) return null;

  const { error } = await supabaseAdmin
    .from("broker_agent")
    .update({ user_id: context.userId })
    .eq("id", match.id)
    .is("user_id", null);
  if (error) return null;
  return match.id;
}

export const getAgentSpace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agentId = await resolveAgentId(context as any);
    if (!agentId) return { isAgent: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: agent } = await supabaseAdmin
      .from("broker_agent")
      .select(
        "id, full_name, company, email, phone, photo_url, bio, regions, star_ratings, transaction_types, min_rooms, max_rooms, languages, transactions_count, monthly_capacity, is_active, is_public, created_at",
      )
      .eq("id", agentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!agent) return { isAgent: false as const };

    const { data: estimations } = await context.supabase
      .from("estimation")
      .select(
        "id, hotel_name, city, region_slug, department_code, room_count, star_rating, transaction_type, value_low_cents, value_high_cents, sale_intent, status, assigned_at, created_at",
      )
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: leads } = await context.supabase
      .from("brokerage_lead")
      .select(
        "id, estimation_id, sale_horizon, operation_type, has_mandate, confidential, availability, phone, message, status, assigned_at, contacted_at, created_at",
      )
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(200);

    return {
      isAgent: true as const,
      agent,
      estimations: estimations ?? [],
      leads: leads ?? [],
    };
  });

export const updateAgentContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        phone: z.string().max(40).nullable().optional(),
        bio: z.string().max(2000).nullable().optional(),
        company: z.string().max(160).nullable().optional(),
        is_active: z.boolean().optional(),
        is_public: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const agentId = await resolveAgentId(context as any);
    if (!agentId) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("broker_agent")
      .update(data)
      .eq("id", agentId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updateAgentLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(LEAD_STATUSES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const agentId = await resolveAgentId(context as any);
    if (!agentId) throw new Error("Forbidden");

    const patch = {
      status: data.status,
      ...(data.status === "qualifie" ? { contacted_at: new Date().toISOString() } : {}),
    };

    // Mise à jour côté serveur, limitée au statut (pas d'accès direct à assigned_at).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("brokerage_lead")
      .update(patch)
      .eq("id", data.id)
      .eq("agent_id", agentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Demandes de valorisation : dossiers de la zone couverte par l'agent. */
export const getAgentValuationRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agentId = await resolveAgentId(context as any);
    if (!agentId) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: agent } = await supabaseAdmin
      .from("broker_agent")
      .select("id, regions, star_ratings, min_rooms, max_rooms")
      .eq("id", agentId)
      .maybeSingle();
    if (!agent) throw new Error("Forbidden");

    let query = supabaseAdmin
      .from("estimation")
      .select(
        "id, hotel_name, city, region_slug, department_code, room_count, star_rating, transaction_type, sale_intent, status, value_low_cents, value_high_cents, price_expectation_cents, agent_id, assigned_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(120);

    const regions = (agent.regions ?? []) as string[];
    // Sans région : uniquement les demandes déjà attribuées à l'agent.
    if (regions.length > 0) {
      query = query.or(`agent_id.eq.${agentId},region_slug.in.(${regions.map((r) => `"${r.replace(/"/g, "")}"`).join(",")})`);
    } else {
      query = query.eq("agent_id", agentId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []).filter(
      (e: any) => e.agent_id === agentId || e.agent_id === null,
    );

    return {
      agentId,
      requests: rows.map((e: any) => ({
        id: e.id,
        hotel_name: e.hotel_name,
        city: e.city,
        region_slug: e.region_slug,
        department_code: e.department_code,
        room_count: e.room_count,
        star_rating: e.star_rating,
        transaction_type: e.transaction_type,
        sale_intent: e.sale_intent,
        status: e.status,
        value_low_cents: e.value_low_cents,
        value_high_cents: e.value_high_cents,
        price_expectation_cents: e.price_expectation_cents,
        created_at: e.created_at,
        mine: e.agent_id === agentId,
      })),
    };
  });

/** L'agent se positionne sur une demande encore non attribuée. */
export const claimValuationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const agentId = await resolveAgentId(context as any);
    if (!agentId) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("estimation")
      .update({ agent_id: agentId, assigned_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("agent_id", null)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Cette demande a déjà été attribuée.");
    return { ok: true as const };
  });

/** Transactions de marché en attente de validation, filtrées sur la zone de l'agent. */
export const getAgentPendingTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agentId = await resolveAgentId(context as any);
    if (!agentId) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: agent } = await supabaseAdmin
      .from("broker_agent")
      .select("regions")
      .eq("id", agentId)
      .maybeSingle();

    const regions = (agent?.regions ?? []) as string[];
    if (regions.length === 0) return { transactions: [] };

    const { data, error } = await supabaseAdmin
      .from("market_transaction")
      .select(
        "id, source_name, source_url, title, published_at, hotel_name, city, department_code, region_slug, star_rating, room_count, transaction_type, price_cents, price_per_room_cents, confidence, created_at",
      )
      .eq("status", "pending")
      .in("region_slug", regions)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(150);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    return {
      transactions: rows.map((t: any) => ({
        ...t,
        inMyRegion: regions.includes(t.region_slug ?? ""),
      })),
    };
  });

/** Fil de notifications dérivé de l'activité récente de l'agent. */
export const getAgentNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agentId = await resolveAgentId(context as any);
    if (!agentId) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

    const [estRes, leadRes, txRes] = await Promise.all([
      supabaseAdmin
        .from("estimation")
        .select("id, hotel_name, city, assigned_at, created_at")
        .eq("agent_id", agentId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("brokerage_lead")
        .select("id, operation_type, sale_horizon, status, created_at")
        .eq("agent_id", agentId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("market_transaction")
        .select("id, hotel_name, city, created_at")
        .eq("status", "pending")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const items = [
      ...(estRes.data ?? []).map((e: any) => ({
        id: `est-${e.id}`,
        type: "estimation" as const,
        title: `Estimation attribuée : ${e.hotel_name || "hôtel non nommé"}`,
        detail: e.city ?? "",
        at: e.assigned_at ?? e.created_at,
      })),
      ...(leadRes.data ?? []).map((l: any) => ({
        id: `lead-${l.id}`,
        type: "lead" as const,
        title: `Mise en relation ${l.operation_type}`,
        detail: `Horizon ${l.sale_horizon} · statut ${l.status}`,
        at: l.created_at,
      })),
      ...(txRes.data ?? []).map((t: any) => ({
        id: `tx-${t.id}`,
        type: "transaction" as const,
        title: `Transaction à valider : ${t.hotel_name || "sans nom"}`,
        detail: t.city ?? "",
        at: t.created_at,
      })),
    ].sort((a, b) => (a.at < b.at ? 1 : -1));

    return { items };
  });

/** L'agent soumet une demande de valorisation à l'administration. */
export const submitAgentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        hotelName: z.string().trim().min(2).max(160),
        city: z.string().trim().max(120).optional().nullable(),
        regionSlug: z.string().trim().max(80).optional().nullable(),
        departmentCode: z.string().trim().max(5).optional().nullable(),
        roomCount: z.number().int().min(1).max(2000).optional().nullable(),
        starRating: z.number().int().min(0).max(5).optional().nullable(),
        transactionType: z.enum(["murs_fonds", "fonds", "murs", "bail"]).optional().nullable(),
        contactName: z.string().trim().max(120).optional().nullable(),
        contactEmail: z.string().trim().email().max(200).optional().nullable().or(z.literal("")),
        contactPhone: z.string().trim().max(40).optional().nullable(),
        urgency: z.enum(["normale", "prioritaire", "urgente"]),
        message: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const agentId = await resolveAgentId(context as any);
    if (!agentId) throw new Error("Forbidden");

    const { error } = await context.supabase.from("agent_valuation_request").insert({
      agent_id: agentId,
      hotel_name: data.hotelName,
      city: data.city || null,
      region_slug: data.regionSlug || null,
      department_code: data.departmentCode || null,
      room_count: data.roomCount ?? null,
      star_rating: data.starRating ?? null,
      transaction_type: data.transactionType ?? null,
      contact_name: data.contactName || null,
      contact_email: data.contactEmail ? String(data.contactEmail).toLowerCase() : null,
      contact_phone: data.contactPhone || null,
      urgency: data.urgency,
      message: data.message || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Historique des demandes envoyées par l'agent à l'administration. */
export const listMyAgentRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agentId = await resolveAgentId(context as any);
    if (!agentId) throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("agent_valuation_request")
      .select(
        "id, hotel_name, city, region_slug, department_code, room_count, star_rating, transaction_type, contact_name, contact_email, contact_phone, urgency, message, status, admin_notes, created_at",
      )
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { requests: data ?? [] };
  });

/** Rapports PDF de valorisation reçus par l'agent connecté. */
export const listMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const agentId = await resolveAgentId(context as any);
    if (!agentId) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("estimation_report")
      .select("id, estimation_id, storage_path, sent_to, status, error_message, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const reports = rows ?? [];
    const ids = Array.from(new Set(reports.map((r) => r.estimation_id)));
    let estimations: Record<
      string,
      {
        hotel_name: string | null;
        city: string | null;
        department_code: string;
        room_count: number;
        star_rating: number;
        value_low_cents: number;
        value_high_cents: number;
      }
    > = {};
    if (ids.length > 0) {
      const { data: est } = await supabaseAdmin
        .from("estimation")
        .select(
          "id, hotel_name, city, department_code, room_count, star_rating, value_low_cents, value_high_cents",
        )
        .in("id", ids)
        .eq("agent_id", agentId);
      for (const e of est ?? []) {
        const { id, ...rest } = e as any;
        estimations[id] = rest;
      }
    }

    return {
      reports: reports.map((r) => ({ ...r, estimation: estimations[r.estimation_id] ?? null })),
    };
  });

/** Lien de téléchargement signé pour un rapport appartenant à l'agent. */
export const getMyReportUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const agentId = await resolveAgentId(context as any);
    if (!agentId) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: report } = await supabaseAdmin
      .from("estimation_report")
      .select("storage_path")
      .eq("id", data.id)
      .eq("agent_id", agentId)
      .maybeSingle();
    if (!report) throw new Error("Forbidden");

    const { data: signed, error } = await supabaseAdmin.storage
      .from("estimation-reports")
      .createSignedUrl(report.storage_path, 600);
    if (error || !signed?.signedUrl) throw new Error(error?.message ?? "Lien indisponible");
    return { url: signed.signedUrl };
  });
