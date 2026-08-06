import type { MarketComparables } from "@/lib/valuation";

/** Ligne minimale d'une transaction marché utilisable comme comparable. */
export interface ComparableRow {
  star_rating: number | null;
  price_per_room_cents: number | null;
  transaction_type: string | null;
}

/**
 * Courbe de positionnement : prix par chambre relatif d'une catégorie
 * rapporté au 3 étoiles (base 1,0). Calibrée sur les benchmarks marché.
 */
export const STAR_CURVE: Record<number, number> = {
  0: 0.246,
  1: 0.277,
  2: 0.448,
  3: 1.0,
  4: 2.177,
  5: 4.542,
};

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
}

/**
 * Sélectionne les comparables marché pour un segment donné.
 *
 * - Périmètre « segment » : même région ET même catégorie (≥ 2 transactions).
 * - Repli « region » : catégories voisines (±1 étoile, ≥ 3 transactions),
 *   chaque prix étant normalisé vers la catégorie cible via la courbe de
 *   positionnement pour éviter tout biais de catégorie.
 * - Seules les transactions murs+fonds (ou de type inconnu) sont retenues :
 *   c'est la base de référence du moteur avant application du facteur de
 *   transaction (fonds seul / murs seuls).
 *
 * `rows` doit déjà être filtré sur la région et le statut « validated ».
 */
export function selectComparables(
  rows: ComparableRow[],
  starRating: number,
): MarketComparables | null {
  const usable = rows.filter(
    (c) =>
      c.price_per_room_cents != null &&
      c.price_per_room_cents > 0 &&
      (!c.transaction_type || c.transaction_type === "murs_fonds"),
  );

  const sameStar = usable
    .filter((c) => c.star_rating === starRating)
    .map((c) => c.price_per_room_cents!);
  if (sameStar.length >= 2) {
    return {
      medianPerRoomCents: median(sameStar),
      sampleSize: sameStar.length,
      scope: "segment",
    };
  }

  const target = STAR_CURVE[starRating];
  const nearStars = usable
    .filter(
      (c) =>
        c.star_rating != null &&
        STAR_CURVE[c.star_rating] != null &&
        Math.abs(c.star_rating - starRating) <= 1,
    )
    .map((c) => {
      const src = STAR_CURVE[c.star_rating!]!;
      return target ? Math.round((c.price_per_room_cents! * target) / src) : c.price_per_room_cents!;
    });
  if (nearStars.length >= 3) {
    return {
      medianPerRoomCents: median(nearStars),
      sampleSize: nearStars.length,
      scope: "region",
    };
  }

  return null;
}
