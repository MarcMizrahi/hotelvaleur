/**
 * Moteur de valorisation hôtelière.
 * Fonction PURE : mêmes entrées → mêmes sorties. Aucune I/O.
 * Toutes les valeurs monétaires en centimes (bigint côté DB, number ici).
 */

import type { TransactionType, WorksNeeded, ValuationMethod } from "@/lib/supabase/types";

export interface ValuationInput {
  regionSlug: string;
  starRating: number;
  roomCount: number;
  transactionType: TransactionType;
  worksNeeded?: WorksNeeded | null;
  hasRestaurant?: boolean;
  hasLicence4?: boolean;
  annualRevenueCents?: number | null;
  ebitdaCents?: number | null;
  occupancyRate?: number | null; // 0..100
}

export interface Coefficient {
  region_slug: string;
  star_rating: number;
  ebitda_multiple_low: number;
  ebitda_multiple_high: number;
  price_per_room_low_cents: number;
  price_per_room_high_cents: number;
}

export interface ValuationDetail {
  perRoom: { low: number; high: number } | null;
  ebitda: {
    low: number;
    high: number;
    used: number;
    estimated: boolean;
  } | null;
  combined: { low: number; high: number };
  adjustments: Array<{ label: string; factor: number }>;
  outlier: boolean;
  divergent: boolean;
  coefficient: {
    region_slug: string;
    star_rating: number;
    ebitda_multiple_low: number;
    ebitda_multiple_high: number;
    price_per_room_low_cents: number;
    price_per_room_high_cents: number;
  };
}

export interface ValuationResult {
  valueLowCents: number;
  valueHighCents: number;
  methodUsed: ValuationMethod;
  detail: ValuationDetail;
}

const MIN_SPREAD = 0.2; // 20 %
const DIVERGENCE_THRESHOLD = 0.6; // 60 %

function roundEurosBand(cents: number): number {
  // < 1 M€ : arrondi au millier d'euros ; >= 1 M€ : à 10 000 €
  const oneMillion = 100_000_000; // 1 000 000 € en centimes
  const stepEuros = cents >= oneMillion ? 10_000 : 1_000;
  const stepCents = stepEuros * 100;
  return Math.round(cents / stepCents) * stepCents;
}

export function computeValuation(
  input: ValuationInput,
  coefficient: Coefficient,
): ValuationResult {
  if (coefficient.region_slug !== input.regionSlug)
    throw new Error("Coefficient region mismatch");
  // 2. Méthode A – prix par chambre (toujours calculable)
  const perRoom = {
    low: input.roomCount * coefficient.price_per_room_low_cents,
    high: input.roomCount * coefficient.price_per_room_high_cents,
  };

  // 3. Méthode B – multiple d'EBITDA
  let ebitdaBand: ValuationDetail["ebitda"] = null;
  let ebitdaCents = input.ebitdaCents ?? null;
  let estimated = false;
  if ((!ebitdaCents || ebitdaCents <= 0) && input.annualRevenueCents && input.annualRevenueCents > 0) {
    // Estimation EBITDA à 28 % du CA
    ebitdaCents = Math.round(input.annualRevenueCents * 0.28);
    estimated = true;
  }
  if (ebitdaCents && ebitdaCents > 0) {
    let low = ebitdaCents * coefficient.ebitda_multiple_low;
    let high = ebitdaCents * coefficient.ebitda_multiple_high;
    if (estimated) {
      // Élargir de 15 % de chaque côté
      low = low * 0.85;
      high = high * 1.15;
    }
    ebitdaBand = { low, high, used: ebitdaCents, estimated };
  }

  // 4. Combinaison
  let methodUsed: ValuationMethod;
  let combined: { low: number; high: number };
  let divergent = false;

  if (ebitdaBand) {
    // Divergence : > 60 % d'écart entre les deux moyennes ?
    const meanA = (perRoom.low + perRoom.high) / 2;
    const meanB = (ebitdaBand.low + ebitdaBand.high) / 2;
    const relDiff = Math.abs(meanA - meanB) / Math.max(meanA, meanB);
    if (relDiff > DIVERGENCE_THRESHOLD) {
      divergent = true;
      combined = {
        low: Math.min(perRoom.low, ebitdaBand.low),
        high: Math.max(perRoom.high, ebitdaBand.high),
      };
    } else {
      // Moyenne pondérée 60 % B / 40 % A
      combined = {
        low: 0.4 * perRoom.low + 0.6 * ebitdaBand.low,
        high: 0.4 * perRoom.high + 0.6 * ebitdaBand.high,
      };
    }
    methodUsed = "blended";
  } else {
    // Seule méthode A – élargir de 20 % de chaque côté
    combined = { low: perRoom.low * 0.8, high: perRoom.high * 1.2 };
    methodUsed = "per_room";
  }

  // 5. Ajustements multiplicatifs
  const adjustments: Array<{ label: string; factor: number }> = [];

  const txMap: Record<TransactionType, number> = {
    murs_fonds: 1.0,
    fonds: 0.4,
    murs: 0.6,
  };
  adjustments.push({
    label: `Type de transaction : ${input.transactionType}`,
    factor: txMap[input.transactionType],
  });

  if (input.worksNeeded) {
    const worksMap: Record<WorksNeeded, number> = {
      aucun: 1.0,
      legers: 0.95,
      importants: 0.85,
    };
    adjustments.push({
      label: `Travaux à prévoir : ${input.worksNeeded}`,
      factor: worksMap[input.worksNeeded],
    });
  }
  if (input.hasRestaurant) adjustments.push({ label: "Restaurant", factor: 1.03 });
  if (input.hasLicence4) adjustments.push({ label: "Licence IV", factor: 1.02 });

  if (typeof input.occupancyRate === "number") {
    const o = input.occupancyRate;
    let f = 1.0;
    if (o < 45) f = 0.92;
    else if (o < 60) f = 1.0;
    else if (o < 70) f = 1.05;
    else f = 1.1;
    adjustments.push({ label: `Taux d'occupation : ${o.toFixed(1)} %`, factor: f });
  }

  let low = combined.low;
  let high = combined.high;
  for (const a of adjustments) {
    low *= a.factor;
    high *= a.factor;
  }

  // 6. Garde-fous
  let outlier = false;
  if (input.annualRevenueCents && input.roomCount > 0) {
    const perRoomRev = input.annualRevenueCents / input.roomCount;
    // 8 000 – 80 000 €
    if (perRoomRev < 8_000 * 100 || perRoomRev > 80_000 * 100) outlier = true;
  }

  // Écart minimum de 20 %
  const spread = (high - low) / Math.max(low, 1);
  if (spread < MIN_SPREAD) {
    const mid = (low + high) / 2;
    low = mid * (1 - MIN_SPREAD / 2);
    high = mid * (1 + MIN_SPREAD / 2);
  }

  // Arrondis d'affichage
  const valueLowCents = roundEurosBand(Math.max(0, Math.round(low)));
  const valueHighCents = roundEurosBand(Math.max(valueLowCents, Math.round(high)));

  return {
    valueLowCents,
    valueHighCents,
    methodUsed,
    detail: {
      perRoom,
      ebitda: ebitdaBand,
      combined,
      adjustments,
      outlier,
      divergent,
      coefficient: {
        region_slug: coefficient.region_slug,
        star_rating: coefficient.star_rating,
        ebitda_multiple_low: coefficient.ebitda_multiple_low,
        ebitda_multiple_high: coefficient.ebitda_multiple_high,
        price_per_room_low_cents: coefficient.price_per_room_low_cents,
        price_per_room_high_cents: coefficient.price_per_room_high_cents,
      },
    },
  };
}
