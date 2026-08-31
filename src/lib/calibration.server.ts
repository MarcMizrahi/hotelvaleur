/**
 * Exécution du calibrage continu côté serveur.
 * Lecture des transactions validées + coefficients, calcul des propositions,
 * application optionnelle et journalisation dans `calibration_run`.
 */

import {
  proposeCalibration,
  type CalibrationCoefficient,
  type CalibrationProposal,
  type CalibrationTransaction,
} from "@/lib/calibration";

export interface CalibrationRunResult {
  applied: boolean;
  mode: string;
  segmentsConsidered: number;
  segmentsAdjusted: number;
  transactionsUsed: number;
  proposals: CalibrationProposal[];
  runId: string | null;
}

export async function runCalibration(opts: {
  apply: boolean;
  mode: "auto" | "manual";
  actor?: string | null;
}): Promise<CalibrationRunResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: coefRows, error: coefError }, { data: txRows, error: txError }] =
    await Promise.all([
      supabaseAdmin
        .from("valuation_coefficient")
        .select("id, region_slug, star_rating, price_per_room_low_cents, price_per_room_high_cents")
        .order("region_slug")
        .order("star_rating"),
      supabaseAdmin
        .from("market_transaction")
        .select("region_slug, star_rating, transaction_type, price_per_room_cents")
        .eq("status", "validated")
        .not("price_per_room_cents", "is", null),
    ]);

  if (coefError) throw new Error(coefError.message);
  if (txError) throw new Error(txError.message);

  const coefficients: CalibrationCoefficient[] = (coefRows ?? []).map((r) => ({
    id: r.id,
    region_slug: r.region_slug,
    star_rating: r.star_rating,
    price_per_room_low_cents: Number(r.price_per_room_low_cents),
    price_per_room_high_cents: Number(r.price_per_room_high_cents),
  }));

  const transactions: CalibrationTransaction[] = (txRows ?? []).map((r) => ({
    region_slug: r.region_slug,
    star_rating: r.star_rating,
    transaction_type: r.transaction_type,
    price_per_room_cents: r.price_per_room_cents == null ? null : Number(r.price_per_room_cents),
  }));

  const proposals = proposeCalibration(coefficients, transactions);
  const adjusted = proposals.filter((p) => p.status === "adjusted");

  if (opts.apply && adjusted.length > 0) {
    for (const p of adjusted) {
      const { error } = await supabaseAdmin
        .from("valuation_coefficient")
        .update({
          price_per_room_low_cents: p.proposedLowCents,
          price_per_room_high_cents: p.proposedHighCents,
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id);
      if (error) throw new Error(error.message);
    }
  }

  const { data: run } = await supabaseAdmin
    .from("calibration_run")
    .insert({
      mode: opts.mode,
      applied: opts.apply,
      segments_considered: proposals.length,
      segments_adjusted: opts.apply ? adjusted.length : 0,
      transactions_used: transactions.length,
      actor: opts.actor ?? null,
      detail: adjusted.map((p) => ({
        region_slug: p.region_slug,
        star_rating: p.star_rating,
        scope: p.scope,
        sample_size: p.sampleSize,
        move_ratio: p.moveRatio,
        from: [p.currentLowCents, p.currentHighCents],
        to: [p.proposedLowCents, p.proposedHighCents],
      })),
    })
    .select("id")
    .maybeSingle();

  return {
    applied: opts.apply,
    mode: opts.mode,
    segmentsConsidered: proposals.length,
    segmentsAdjusted: opts.apply ? adjusted.length : 0,
    transactionsUsed: transactions.length,
    proposals,
    runId: run?.id ?? null,
  };
}
