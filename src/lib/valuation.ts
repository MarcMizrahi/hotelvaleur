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
  /**
   * Comparables marché observés (transactions validées) pour ce segment.
   * Utilisés pour recentrer la méthode « prix par chambre ».
   */
  comparables?: MarketComparables | null;
}

export interface MarketComparables {
  /** Médiane observée du prix par chambre, en centimes. */
  medianPerRoomCents: number;
  /** Nombre de transactions retenues. */
  sampleSize: number;
  /** Périmètre : segment exact (région + étoiles) ou élargi (région seule). */
  scope: "segment" | "region";
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
  /** Recentrage appliqué à partir des transactions observées, le cas échéant. */
  marketAnchor: {
    medianPerRoomCents: number;
    sampleSize: number;
    scope: "segment" | "region";
    weight: number;
    /** Écart entre la médiane observée et le milieu de la fourchette théorique. */
    deltaRatio: number;
  } | null;
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
  let perRoomLowUnit = coefficient.price_per_room_low_cents;
  let perRoomHighUnit = coefficient.price_per_room_high_cents;

  // 2b. Recentrage sur les comparables marché observés (transactions validées).
  // Le poids croît avec la taille de l'échantillon et se limite à 50 % (segment)
  // ou 30 % (périmètre régional élargi), pour éviter qu'un échantillon étroit
  // ne pilote seul la valorisation.
  let marketAnchor: ValuationDetail["marketAnchor"] = null;
  const cmp = input.comparables;
  if (cmp && cmp.sampleSize > 0 && cmp.medianPerRoomCents > 0) {
    const mid = (perRoomLowUnit + perRoomHighUnit) / 2;
    const maxWeight = cmp.scope === "segment" ? 0.5 : 0.3;
    const weight = Math.min(maxWeight, cmp.sampleSize / 10);
    // Le recentrage est borné à ±40 % pour rester robuste aux transactions atypiques.
    const rawRatio = cmp.medianPerRoomCents / mid;
    const ratio = Math.min(1.25, Math.max(0.6, rawRatio));
    const factor = 1 + weight * (ratio - 1);
    perRoomLowUnit = perRoomLowUnit * factor;
    perRoomHighUnit = perRoomHighUnit * factor;
    marketAnchor = {
      medianPerRoomCents: cmp.medianPerRoomCents,
      sampleSize: cmp.sampleSize,
      scope: cmp.scope,
      weight: Number(weight.toFixed(2)),
      deltaRatio: Number((rawRatio - 1).toFixed(3)),
    };
  }

  const perRoom = {
    low: input.roomCount * perRoomLowUnit,
    high: input.roomCount * perRoomHighUnit,
  };

  // 3. Méthode B – multiple d'EBITDA
  let ebitdaBand: ValuationDetail["ebitda"] = null;
  let ebitdaCents = input.ebitdaCents ?? null;
  let estimated = false;
  if ((!ebitdaCents || ebitdaCents <= 0) && input.annualRevenueCents && input.annualRevenueCents > 0) {
    // Estimation EBITDA : marge nette observée par positionnement (18–28 % du CA).
    const marginByStar: Record<number, number> = {
      0: 0.18, 1: 0.18, 2: 0.20, 3: 0.22, 4: 0.25, 5: 0.28,
    };
    const margin = marginByStar[input.starRating] ?? 0.22;
    ebitdaCents = Math.round(input.annualRevenueCents * margin);
    estimated = true;
  }
  if (ebitdaCents && ebitdaCents > 0) {
    // Les multiples de la table sont des multiples d'actif complet (murs + fonds).
    // Sur une cession de fonds seul, l'exploitant paiera un loyer : le multiple
    // applicable au résultat d'exploitation est nettement plus faible (~×0,7).
    const multipleScope = input.transactionType === "fonds" ? 0.7 : 1;
    let low = ebitdaCents * coefficient.ebitda_multiple_low * multipleScope;
    let high = ebitdaCents * coefficient.ebitda_multiple_high * multipleScope;
    if (estimated) {
      // Élargir prudemment : plus bas en bas qu'en haut (EBITDA non audité)
      low = low * 0.85;
      high = high * 1.08;
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
    divergent = relDiff > DIVERGENCE_THRESHOLD && input.transactionType !== "fonds";

    // Pondération selon la nature de l'opération : le prix par chambre est un
    // indicateur d'actif (murs), le multiple d'EBITDA un indicateur de rendement
    // (exploitation). Un fonds de commerce se valorise d'abord au rendement,
    // des murs d'abord à l'actif.
    const wEbitdaByTx: Record<TransactionType, number> = {
      // Fonds seul : le prix par chambre valorise un actif immobilier qui n'est
      // pas cédé — il n'entre pas dans la combinaison.
      fonds: 1,
      murs_fonds: 0.45,
      murs: 0.3,
    };
    let wEbitda = wEbitdaByTx[input.transactionType];
    // Un EBITDA estimé depuis le CA est moins fiable : on réduit son poids.
    if (input.transactionType !== "fonds" && ebitdaBand.estimated)
      wEbitda = Math.max(0.25, wEbitda - 0.15);
    const wPerRoom = 1 - wEbitda;


    combined = {
      low: wPerRoom * perRoom.low + wEbitda * ebitdaBand.low,
      high: wPerRoom * perRoom.high + wEbitda * ebitdaBand.high,
    };

    if (divergent) {
      // Les deux méthodes s'opposent : on élargit la fourchette de ±15 %
      // (au lieu de prendre l'union des deux bandes, qui produisait des
      // fourchettes allant du simple au sextuple).
      combined = { low: combined.low * 0.85, high: combined.high * 1.08 };
    }
    methodUsed = "blended";
  } else {
    // Seule méthode A – les coefficients par chambre étant désormais calibrés
    // sur des fourchettes de marché déjà larges (±33 %), on n'élargit que de 10 %.
    combined = { low: perRoom.low * 0.9, high: perRoom.high * 1.0 };
    methodUsed = "per_room";
  }

  // 4b. Fourchette lisible : le haut ne peut pas dépasser 1,75× le bas.
  const MAX_RATIO = 1.75;
  if (combined.low > 0 && combined.high / combined.low > MAX_RATIO) {
    const mid = Math.sqrt(combined.low * combined.high);
    combined = { low: mid / Math.sqrt(MAX_RATIO), high: mid * Math.sqrt(MAX_RATIO) };
  }


  // 5. Ajustements multiplicatifs
  const adjustments: Array<{ label: string; factor: number }> = [];

  // 5a. Type de transaction
  // Les trois natures d'opération sont désormais traitées à part entière
  // (multiplicateur = 1) pour refléter la valorisation intégrale de l'actif.
  const txMap: Record<TransactionType, number> = {
    murs_fonds: 1.0,
    fonds: 1.0,
    murs: 1.0,
  };
  adjustments.push({
    label: `Type de transaction : ${input.transactionType}`,
    factor: txMap[input.transactionType],
  });


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

  // 5b bis. Signal du nom commercial (enseigne / positionnement)
  const brand = brandSignal(input.hotelName);
  if (brand.isBranded)
    adjustments.push({ label: "Enseigne / chaîne reconnue", factor: 1.04 });
  if (brand.isPremium)
    adjustments.push({ label: "Positionnement premium (nom de l'établissement)", factor: 1.03 });


  if (typeof input.occupancyRate === "number") {
    const o = input.occupancyRate;
    let f = 1.0;
    if (o < 45) f = 0.92;
    else if (o < 60) f = 1.0;
    else if (o < 70) f = 1.05;
    else f = 1.1;
    adjustments.push({ label: `Taux d'occupation : ${o.toFixed(1)} %`, factor: f });
  }

  // 5b ter. Effet taille : les très petites unités se négocient avec une décote
  // (coûts fixes d'exploitation, marché d'acquéreurs plus étroit), les grandes
  // unités bénéficient d'une prime d'intérêt institutionnel.
  if (input.roomCount > 0) {
    const n = input.roomCount;
    let f = 1.0;
    if (n < 12) f = 0.88;
    else if (n < 20) f = 0.94;
    else if (n <= 80) f = 1.0;
    else if (n <= 150) f = 1.04;
    else f = 1.07;
    if (f !== 1.0) adjustments.push({ label: `Taille : ${n} chambres`, factor: f });
  }

  // 5c. Bail emphytéotique (murs ou murs+fonds) : décote temporelle
  // Approximation d'une actualisation sur la durée restante :
  //   factor = 1 - exp(-années / 30)
  // 99 ans → ×0.96, 50 → ×0.81, 30 → ×0.63, 15 → ×0.39, 5 → ×0.15.
  // Au-delà de 60 ans, le bail est considéré comme quasi-perpétuel : pas d'impact.
  if (
    input.isEmphyteotic &&
    (input.transactionType === "murs" || input.transactionType === "murs_fonds") &&
    typeof input.emphyteoticYearsRemaining === "number" &&
    input.emphyteoticYearsRemaining > 0 &&
    input.emphyteoticYearsRemaining <= 60
  ) {
    const y = input.emphyteoticYearsRemaining;
    const f = 1 - Math.exp(-y / 30);
    adjustments.push({
      label: `Bail emphytéotique : ${y} an(s) restants`,
      factor: Number(f.toFixed(3)),
    });
  }


  // 5d. Prudence sur la borne haute : les estimations en ligne surestiment
  // structurellement le haut de fourchette (prix affichés ≠ prix actés).
  const HIGH_PRUDENCE = 0.9;

  let low = combined.low;
  let high = combined.high * HIGH_PRUDENCE;
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
      marketAnchor,
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
