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
  const { data: own } = await context.supabase
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

    const { data: agent } = await context.supabase
      .from("broker_agent")
      .select(
        "id, full_name, company, email, phone, photo_url, bio, regions, star_ratings, transaction_types, min_rooms, max_rooms, languages, transactions_count, monthly_capacity, is_active, is_public, created_at",
      )
      .eq("id", agentId)
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
        monthly_capacity: z.number().int().min(0).max(500).optional(),
        is_active: z.boolean().optional(),
        is_public: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const agentId = await resolveAgentId(context as any);
    if (!agentId) throw new Error("Forbidden");

    const { error } = await context.supabase
      .from("broker_agent")
      .update(data)
      .eq("id", agentId);
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

    const { error } = await context.supabase
      .from("brokerage_lead")
      .update(patch)
      .eq("id", data.id)
      .eq("agent_id", agentId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
