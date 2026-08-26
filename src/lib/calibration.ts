/**
 * Calibrage continu des coefficients de valorisation.
 *
 * Fonction PURE : à partir des transactions marché validées et des coefficients
 * actuels, elle propose une nouvelle fourchette de prix par chambre pour chaque
 * segment (région × catégorie).
 *
 * Principes :
 * - on ne calibre que sur des comparables « murs + fonds » (base de référence) ;
 * - un segment sans échantillon suffisant n'est jamais modifié ;
 * - le déplacement est amorti (poids croissant avec la taille de l'échantillon)
 *   et borné à ±10 % par exécution : le moteur converge lentement vers le marché
 *   au lieu de suivre une transaction atypique ;
 * - la largeur relative de la fourchette actuelle est conservée.
 */

import { STAR_CURVE, median, type ComparableRow } from "@/lib/comparables";

export interface CalibrationCoefficient {
  id: string;
  region_slug: string;
  star_rating: number;
  price_per_room_low_cents: number;
  price_per_room_high_cents: number;
}

export interface CalibrationTransaction extends ComparableRow {
  region_slug: string | null;
}

export type CalibrationStatus = "adjusted" | "stable" | "insufficient_data";

export interface CalibrationProposal {
  id: string;
  region_slug: string;
  star_rating: number;
  status: CalibrationStatus;
  /** Périmètre de l'échantillon retenu. */
  scope: "segment" | "region" | null;
  sampleSize: number;
  /** Médiane observée du prix par chambre (centimes). */
  observedMedianCents: number | null;
  currentLowCents: number;
  currentHighCents: number;
  currentMidCents: number;
  proposedLowCents: number;
  proposedHighCents: number;
  /** Écart brut entre marché observé et milieu de fourchette actuel. */
  deltaRatio: number;
  /** Poids appliqué au marché observé (0–0,5). */
  weight: number;
  /** Variation effective du milieu de fourchette. */
  moveRatio: number;
}

/** Bornes de sécurité (identiques à la validation du back-office). */
const MIN_PER_ROOM_CENTS = 500_000;
const MAX_PER_ROOM_CENTS = 200_000_000;

/** Déplacement maximal du milieu de fourchette par exécution. */
export const MAX_MOVE = 0.1;
/** Poids maximal accordé au marché observé. */
const MAX_WEIGHT = 0.5;
/** En-deçà de ce mouvement, le segment est considéré comme stable. */
const STABLE_EPSILON = 0.005;

function usableRows(rows: CalibrationTransaction[], regionSlug: string): CalibrationTransaction[] {
  return rows.filter(
    (r) =>
      r.region_slug === regionSlug &&
      r.price_per_room_cents != null &&
      r.price_per_room_cents > 0 &&
      (!r.transaction_type || r.transaction_type === "murs_fonds"),
  );
}

/** Échantillon retenu pour un segment : même catégorie, sinon catégories voisines normalisées. */
function sampleFor(
  rows: CalibrationTransaction[],
  starRating: number,
): { values: number[]; scope: "segment" | "region" } | null {
  const same = rows
    .filter((r) => r.star_rating === starRating)
    .map((r) => r.price_per_room_cents!);
  if (same.length >= 3) return { values: same, scope: "segment" };

  const target = STAR_CURVE[starRating];
  const near = rows
    .filter(
      (r) =>
        r.star_rating != null &&
        STAR_CURVE[r.star_rating] != null &&
        Math.abs(r.star_rating - starRating) <= 1,
    )
    .map((r) => {
      const src = STAR_CURVE[r.star_rating!]!;
      return target
        ? Math.round((r.price_per_room_cents! * target) / src)
        : r.price_per_room_cents!;
    });
  if (near.length >= 4) return { values: near, scope: "region" };

  return null;
}

function clampCents(v: number): number {
  return Math.min(MAX_PER_ROOM_CENTS, Math.max(MIN_PER_ROOM_CENTS, Math.round(v)));
}

export function proposeCalibration(
  coefficients: CalibrationCoefficient[],
  transactions: CalibrationTransaction[],
): CalibrationProposal[] {
  return coefficients.map((c) => {
    const currentLow = Number(c.price_per_room_low_cents);
    const currentHigh = Number(c.price_per_room_high_cents);
    const mid = (currentLow + currentHigh) / 2;

    const base: CalibrationProposal = {
      id: c.id,
      region_slug: c.region_slug,
      star_rating: c.star_rating,
      status: "insufficient_data",
      scope: null,
      sampleSize: 0,
      observedMedianCents: null,
      currentLowCents: currentLow,
      currentHighCents: currentHigh,
      currentMidCents: Math.round(mid),
      proposedLowCents: currentLow,
      proposedHighCents: currentHigh,
      deltaRatio: 0,
      weight: 0,
      moveRatio: 0,
    };

    const sample = sampleFor(usableRows(transactions, c.region_slug), c.star_rating);
    if (!sample || mid <= 0) return base;

    const observed = median(sample.values);
    const deltaRatio = observed / mid - 1;
    const maxWeight = sample.scope === "segment" ? MAX_WEIGHT : MAX_WEIGHT * 0.6;
    const weight = Math.min(maxWeight, sample.values.length / 10);

    // Mouvement amorti puis borné.
    const rawMove = weight * deltaRatio;
    const move = Math.min(MAX_MOVE, Math.max(-MAX_MOVE, rawMove));

    const factor = 1 + move;
    const proposedLow = clampCents(currentLow * factor);
    const proposedHigh = clampCents(currentHigh * factor);

    return {
      ...base,
      status: Math.abs(move) < STABLE_EPSILON ? "stable" : "adjusted",
      scope: sample.scope,
      sampleSize: sample.values.length,
      observedMedianCents: observed,
      proposedLowCents: proposedLow,
      proposedHighCents: proposedHigh > proposedLow ? proposedHigh : proposedLow + 1,
      deltaRatio: Number(deltaRatio.toFixed(4)),
      weight: Number(weight.toFixed(2)),
      moveRatio: Number(move.toFixed(4)),
    };
  });
}
