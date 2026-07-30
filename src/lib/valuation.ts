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
  /** Nom commercial de l'établissement — sert à détecter enseigne et positionnement. */
  hotelName?: string | null;

  worksNeeded?: WorksNeeded | null;
  hasRestaurant?: boolean;
  hasLicence4?: boolean;
  annualRevenueCents?: number | null;
  ebitdaCents?: number | null;
  occupancyRate?: number | null; // 0..100
  /** Années restantes du bail commercial — pertinent pour transactionType = "fonds". */
  leaseYearsRemaining?: number | null;
  /** Vrai si les murs sont détenus via un bail emphytéotique — pertinent pour "murs" ou "murs_fonds". */
  isEmphyteotic?: boolean | null;
  /** Années restantes du bail emphytéotique. */
  emphyteoticYearsRemaining?: number | null;
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

/** Enseignes / chaînes nationales ou internationales reconnues. */
const KNOWN_BRANDS = [
  "accor", "ibis", "mercure", "novotel", "sofitel", "pullman", "mgallery", "adagio",
  "best western", "campanile", "kyriad", "premiere classe", "première classe",
  "b&b hotel", "b&b hôtel", "logis", "citotel", "brit hotel", "brit hôtel",
  "the originals", "inter-hotel", "inter hotel", "hilton", "marriott", "radisson",
  "holiday inn", "mercure", "ramada", "nh hotel", "okko", "mama shelter", "appart city",
  "appart'city", "relais & chateaux", "relais et chateaux", "relais & châteaux",
];

/** Termes de positionnement haut de gamme dans le nom commercial. */
const PREMIUM_TERMS = [
  "palace", "chateau", "château", "manoir", "domaine", "spa", "thalasso",
  "resort", "golf", "abbaye", "bastide", "mas ", "villa",
];

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Signal tiré du nom commercial : enseigne reconnue et/ou positionnement premium. */
export function brandSignal(hotelName?: string | null): {
  isBranded: boolean;
  isPremium: boolean;
} {
  if (!hotelName || hotelName.trim().length < 2) return { isBranded: false, isPremium: false };
  const n = normalizeName(hotelName);
  const norm = (s: string) => normalizeName(s);
  return {
    isBranded: KNOWN_BRANDS.some((b) => n.includes(norm(b))),
    isPremium: PREMIUM_TERMS.some((t) => n.includes(norm(t))),
  };
}


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

  // 5a. Type de transaction
  // Cas particulier "fonds seul" : si l'on dispose d'un EBITDA (réel ou estimé)
  // et d'un CA, on retraite l'EBITDA d'un loyer implicite de 10 % du CA
  // (fourchette usuelle 8–12 % en hôtellerie) et on applique un multiple 3–5×,
  // conforme aux pratiques de marché pour le fonds de commerce seul.
  let fondsRepriced = false;
  if (
    input.transactionType === "fonds" &&
    ebitdaBand &&
    input.annualRevenueCents &&
    input.annualRevenueCents > 0
  ) {
    const impliedRent = Math.round(input.annualRevenueCents * 0.1);
    const ebitdaFonds = Math.max(0, ebitdaBand.used - impliedRent);
    if (ebitdaFonds > 0) {
      combined = { low: ebitdaFonds * 3, high: ebitdaFonds * 5 };
      fondsRepriced = true;
      adjustments.push({
        label: "Fonds seul : EBITDA retraité (loyer implicite 10 % du CA) × 3–5",
        factor: 1.0,
      });
    }
  }

  if (!fondsRepriced) {
    const txMap: Record<TransactionType, number> = {
      murs_fonds: 1.0,
      fonds: 0.4,
      murs: 0.6,
    };
    adjustments.push({
      label: `Type de transaction : ${input.transactionType}`,
      factor: txMap[input.transactionType],
    });
  }

  // 5b. Durée du bail commercial (pertinent pour "fonds")
  if (
    input.transactionType === "fonds" &&
    typeof input.leaseYearsRemaining === "number" &&
    input.leaseYearsRemaining >= 0
  ) {
    const y = input.leaseYearsRemaining;
    let f = 1.0;
    if (y < 3) f = 0.75;
    else if (y < 6) f = 0.9;
    else f = 1.0;
    adjustments.push({ label: `Bail commercial restant : ${y} an(s)`, factor: f });
  }

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

  // 5c. Bail emphytéotique (murs ou murs+fonds) : décote temporelle
  // Approximation d'une actualisation sur la durée restante :
  //   factor = 1 - exp(-années / 30)
  // 99 ans → ×0.96, 50 → ×0.81, 30 → ×0.63, 15 → ×0.39, 5 → ×0.15.
  if (
    input.isEmphyteotic &&
    (input.transactionType === "murs" || input.transactionType === "murs_fonds") &&
    typeof input.emphyteoticYearsRemaining === "number" &&
    input.emphyteoticYearsRemaining > 0
  ) {
    const y = input.emphyteoticYearsRemaining;
    const f = 1 - Math.exp(-y / 30);
    adjustments.push({
      label: `Bail emphytéotique : ${y} an(s) restants`,
      factor: Number(f.toFixed(3)),
    });
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
