import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";


export const listMarketTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabase } = context as never as { supabase: any };
    const [{ data: transactions }, { data: runs }] = await Promise.all([
      supabase
        .from("market_transaction")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("scrape_run").select("*").order("started_at", { ascending: false }).limit(10),
    ]);
    return { transactions: transactions ?? [], runs: runs ?? [] };
  });

export const setTransactionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "validated", "rejected"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabase } = context as never as { supabase: any };
    const { error } = await supabase
      .from("market_transaction")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error("Mise à jour impossible.");
    return { ok: true };
  });

export const runScrapeNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { runMarketScrape } = await import("@/lib/market-scrape.server");
    return await runMarketScrape();
  });

/** Transactions validées, exposées aux écrans de calibration (admin). */
export const listValidatedTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabase } = context as never as { supabase: any };
    const { data } = await supabase
      .from("market_transaction")
      .select("region_slug, star_rating, transaction_type, price_per_room_cents, room_count")
      .eq("status", "validated")
      .not("price_per_room_cents", "is", null);
    return { transactions: data ?? [] };
  });

/** Journal d'audit : transactions écartées par la déduplication et motif du rejet. */
export const listDedupLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabase } = context as never as { supabase: any };
    const { data } = await supabase
      .from("market_transaction_dedup_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return { entries: data ?? [] };
  });
