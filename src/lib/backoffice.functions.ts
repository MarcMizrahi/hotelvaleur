import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("profile")
    .select("role")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (error || data?.role !== "admin") throw new Error("Accès refusé.");
}

/** Liste allégée des agents, pour les sélecteurs d'attribution. */
export const listAgentsLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("broker_agent")
      .select("id, full_name, company, email, is_active, regions, monthly_capacity")
      .order("full_name");
    return { agents: data ?? [] };
  });

/** Attribue (ou retire) un agent sur une estimation. */
export const assignEstimationAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        estimationId: z.string().uuid(),
        agentId: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabase } = context as never as { supabase: any };
    const { error } = await supabase
      .from("estimation")
      .update({
        agent_id: data.agentId,
        assigned_at: data.agentId ? new Date().toISOString() : null,
      })
      .eq("id", data.estimationId);
    if (error) throw new Error("Attribution impossible.");
    return { ok: true };
  });

/** KPI consolidés du tableau de bord. */
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabase } = context as never as { supabase: any };

    const since = new Date();
    since.setDate(since.getDate() - 89);
    const sinceIso = since.toISOString();

    const [estimations, brokerageLeads, agents, transactions, runs] = await Promise.all([
      supabase
        .from("estimation")
        .select(
          "id, created_at, region_slug, sale_intent, status, agent_id, value_low_cents, value_high_cents",
        )
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("brokerage_lead")
        .select("id, created_at, status, agent_id")
        .gte("created_at", sinceIso)
        .limit(5000),
      supabase.from("broker_agent").select("id, full_name, is_active"),
      supabase.from("market_transaction").select("id, status").limit(5000),
      supabase
        .from("scrape_run")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1),
    ]);

    const rows: any[] = estimations.data ?? [];
    const byDay = new Map<string, number>();
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of rows) {
      const key = String(r.created_at).slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }

    const last30 = rows.filter(
      (r) => new Date(r.created_at).getTime() > Date.now() - 30 * 86400000,
    );
    const prev30 = rows.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t <= Date.now() - 30 * 86400000 && t > Date.now() - 60 * 86400000;
    });
    const qualified = last30.filter((r) =>
      ["moins_1_an", "1_a_2_ans"].includes(r.sale_intent),
    );

    const midValues = last30
      .map((r) => (Number(r.value_low_cents) + Number(r.value_high_cents)) / 2)
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => a - b);
    const medianValue = midValues.length
      ? (midValues[Math.floor((midValues.length - 1) / 2)]! +
          midValues[Math.ceil((midValues.length - 1) / 2)]!) /
        2
      : 0;

    const bLeads: any[] = brokerageLeads.data ?? [];
    const txs: any[] = transactions.data ?? [];

    return {
      estimations30: last30.length,
      estimationsPrev30: prev30.length,
      qualified30: qualified.length,
      unassignedLeads: last30.filter((r) => !r.agent_id).length,
      brokerageLeads30: bLeads.length,
      brokerageUnassigned: bLeads.filter((l) => !l.agent_id).length,
      agentsActive: (agents.data ?? []).filter((a: any) => a.is_active).length,
      agentsTotal: (agents.data ?? []).length,
      txPending: txs.filter((t) => t.status === "pending").length,
      txValidated: txs.filter((t) => t.status === "validated").length,
      medianValueCents: Math.round(medianValue),
      series: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
      lastRun: (runs.data ?? [])[0] ?? null,
    };
  });

/** Liste les comptes et leur rôle. */
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw new Error("Lecture des comptes impossible.");
    const { data: profiles } = await supabaseAdmin.from("profile").select("id, role");
    const roleById = new Map((profiles ?? []).map((p: any) => [p.id, p.role]));
    return {
      users: data.users.map((u) => ({
        id: u.id,
        email: u.email ?? "",
        role: (roleById.get(u.id) as string) ?? "viewer",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
      })),
    };
  });

/** Change le rôle d'un compte. Un admin ne peut pas se rétrograder lui-même. */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "viewer"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    if (data.userId === (context as never as { userId: string }).userId) {
      throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profile")
      .upsert({ id: data.userId, role: data.role }, { onConflict: "id" });
    if (error) throw new Error("Mise à jour du rôle impossible.");
    return { ok: true };
  });
