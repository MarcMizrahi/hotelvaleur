import { describe, it, expect } from "vitest";
import { regions } from "@/lib/regions";
import { selectComparables, type ComparableRow } from "@/lib/comparables";
import { computeValuation, type Coefficient, type ValuationInput } from "@/lib/valuation";

const STARS = [0, 1, 2, 3, 4, 5];

/** Coefficient synthétique déterministe : évite toute dépendance à la base. */
function coefficientFor(regionSlug: string, star: number): Coefficient {
  const base = 60_000_00 + star * 40_000_00; // 60 k€ → 260 k€ / chambre
  return {
    region_slug: regionSlug,
    star_rating: star,
    ebitda_multiple_low: 5,
    ebitda_multiple_high: 7,
    price_per_room_low_cents: Math.round(base * 0.75),
    price_per_room_high_cents: Math.round(base * 1.25),
  };
}

function baseInput(regionSlug: string, star: number): ValuationInput {
  return {
    regionSlug,
    starRating: star,
    roomCount: 40,
    transactionType: "murs_fonds",
  };
}

describe("comparables appliqués sur les 78 segments (13 régions × 6 catégories)", () => {
  it("couvre bien 78 segments", () => {
    expect(regions.length * STARS.length).toBe(78);
  });

  it("applique l'ancrage marché sur chaque segment et augmente la valeur quand le marché est au-dessus", () => {
    const failures: string[] = [];

    for (const region of regions) {
      for (const star of STARS) {
        const coef = coefficientFor(region.slug, star);
        const mid = (coef.price_per_room_low_cents + coef.price_per_room_high_cents) / 2;
        const observed = Math.round(mid * 1.25); // marché 25 % au-dessus

        const rows: ComparableRow[] = [
          { star_rating: star, price_per_room_cents: observed, transaction_type: "murs_fonds" },
          { star_rating: star, price_per_room_cents: observed, transaction_type: "murs_fonds" },
        ];
        const cmp = selectComparables(rows, star);
        if (!cmp || cmp.scope !== "segment") {
          failures.push(`${region.slug}/${star}: comparables segment non sélectionnés`);
          continue;
        }

        const withCmp = computeValuation({ ...baseInput(region.slug, star), comparables: cmp }, coef);
        const without = computeValuation(baseInput(region.slug, star), coef);

        const anchor = withCmp.detail.marketAnchor;
        if (!anchor) {
          failures.push(`${region.slug}/${star}: marketAnchor absent`);
          continue;
        }
        // 2 transactions → poids = min(0.5, 2/10) = 0.2 ; facteur = 1 + 0.2 × 0.25
        if (anchor.weight !== 0.2) failures.push(`${region.slug}/${star}: poids ${anchor.weight}`);
        if (Math.abs(anchor.deltaRatio - 0.25) > 0.01)
          failures.push(`${region.slug}/${star}: deltaRatio ${anchor.deltaRatio}`);
        if (anchor.scope !== "segment") failures.push(`${region.slug}/${star}: scope ${anchor.scope}`);
        if (!(withCmp.valueHighCents > without.valueHighCents))
          failures.push(`${region.slug}/${star}: valeur non recentrée à la hausse`);
        if (without.detail.marketAnchor !== null)
          failures.push(`${region.slug}/${star}: ancrage appliqué sans comparables`);
      }
    }

    expect(failures).toEqual([]);
  });

  it("le repli ±1 étoile s'applique sur tous les segments éligibles (1★ à 4★)", () => {
    const failures: string[] = [];
    for (const region of regions) {
      for (const star of [1, 2, 3, 4]) {
        const coef = coefficientFor(region.slug, star);
        const rows: ComparableRow[] = [
          { star_rating: star - 1, price_per_room_cents: 150_000, transaction_type: "murs_fonds" },
          { star_rating: star + 1, price_per_room_cents: 150_000, transaction_type: "murs_fonds" },
          { star_rating: star + 1, price_per_room_cents: 150_000, transaction_type: "murs_fonds" },
        ];
        const cmp = selectComparables(rows, star);
        if (!cmp || cmp.scope !== "region") {
          failures.push(`${region.slug}/${star}: repli régional non déclenché`);
          continue;
        }
        const res = computeValuation({ ...baseInput(region.slug, star), comparables: cmp }, coef);
        const anchor = res.detail.marketAnchor;
        if (!anchor) {
          failures.push(`${region.slug}/${star}: marketAnchor absent en repli`);
          continue;
        }
        // 3 transactions, périmètre élargi → poids = min(0.3, 0.3) = 0.3
        if (anchor.weight !== 0.3) failures.push(`${region.slug}/${star}: poids repli ${anchor.weight}`);
        if (anchor.scope !== "region") failures.push(`${region.slug}/${star}: scope ${anchor.scope}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("les transactions « fonds seul » n'alimentent jamais l'ancrage, sur tous les segments", () => {
    const failures: string[] = [];
    for (const region of regions) {
      for (const star of STARS) {
        const coef = coefficientFor(region.slug, star);
        const rows: ComparableRow[] = Array.from({ length: 5 }, () => ({
          star_rating: star,
          price_per_room_cents: 500_000,
          transaction_type: "fonds",
        }));
        const cmp = selectComparables(rows, star);
        if (cmp) failures.push(`${region.slug}/${star}: comparables fonds seul retenus`);
        const res = computeValuation({ ...baseInput(region.slug, star), comparables: cmp }, coef);
        if (res.detail.marketAnchor !== null)
          failures.push(`${region.slug}/${star}: ancrage issu de fonds seul`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("non-régression : bornes et exceptions de l'ancrage", () => {
  const coef = coefficientFor("ile-de-france", 3);
  const mid = (coef.price_per_room_low_cents + coef.price_per_room_high_cents) / 2;

  it("borne le recentrage à +40 % même sur un marché très supérieur", () => {
    const res = computeValuation(
      {
        ...baseInput("ile-de-france", 3),
        comparables: { medianPerRoomCents: mid * 10, sampleSize: 20, scope: "segment" },
      },
      coef,
    );
    const ref = computeValuation(baseInput("ile-de-france", 3), coef);
    // poids max 0,5 et ratio borné à 1,4 → facteur max = 1,2
    expect(res.valueHighCents / ref.valueHighCents).toBeLessThanOrEqual(1.2001);
    expect(res.valueHighCents / ref.valueHighCents).toBeGreaterThan(1.19);
  });

  it("borne le recentrage à -40 % sur un marché très inférieur", () => {
    const res = computeValuation(
      {
        ...baseInput("ile-de-france", 3),
        comparables: { medianPerRoomCents: 1, sampleSize: 20, scope: "segment" },
      },
      coef,
    );
    const ref = computeValuation(baseInput("ile-de-france", 3), coef);
    expect(res.valueHighCents / ref.valueHighCents).toBeGreaterThanOrEqual(0.7999);
  });

  it("plafonne le poids à 30 % en périmètre régional élargi", () => {
    const res = computeValuation(
      {
        ...baseInput("ile-de-france", 3),
        comparables: { medianPerRoomCents: mid * 2, sampleSize: 50, scope: "region" },
      },
      coef,
    );
    expect(res.detail.marketAnchor?.weight).toBe(0.3);
  });

  it("ignore un échantillon vide ou une médiane nulle", () => {
    for (const cmp of [
      { medianPerRoomCents: 0, sampleSize: 5, scope: "segment" as const },
      { medianPerRoomCents: 300_000, sampleSize: 0, scope: "segment" as const },
      null,
    ]) {
      const res = computeValuation({ ...baseInput("ile-de-france", 3), comparables: cmp }, coef);
      expect(res.detail.marketAnchor).toBeNull();
    }
  });

  it("l'ancrage se propage à une estimation « fonds seul » sans EBITDA (facteur 1,0)", () => {
    const input: ValuationInput = { ...baseInput("ile-de-france", 3), transactionType: "fonds" };
    const cmp = { medianPerRoomCents: Math.round(mid * 1.2), sampleSize: 10, scope: "segment" as const };
    const withCmp = computeValuation({ ...input, comparables: cmp }, coef);
    const without = computeValuation(input, coef);
    expect(withCmp.detail.marketAnchor).not.toBeNull();
    expect(withCmp.valueHighCents).toBeGreaterThan(without.valueHighCents);
    expect(
      without.detail.adjustments.some((a) => a.factor === 1.0 && a.label.includes("fonds")),
    ).toBe(true);
  });

  it("« fonds seul » avec EBITDA et CA suit désormais la méthode mixte avec ancrage marché", () => {
    const input: ValuationInput = {
      ...baseInput("ile-de-france", 3),
      transactionType: "fonds",
      annualRevenueCents: 1_500_000_00,
      ebitdaCents: 400_000_00,
    };
    const cmp = { medianPerRoomCents: Math.round(mid * 1.3), sampleSize: 10, scope: "segment" as const };
    const withCmp = computeValuation({ ...input, comparables: cmp }, coef);
    const without = computeValuation(input, coef);
    // L'ancrage marché influe désormais le résultat car le fonds n'est plus retraité en dur.
    expect(withCmp.valueHighCents).not.toBe(without.valueHighCents);
    expect(
      withCmp.detail.adjustments.some((a) => a.label.includes("fonds")),
    ).toBe(true);
    expect(withCmp.detail.marketAnchor).not.toBeNull();
  });


  it("le bail emphytéotique au-delà de 60 ans n'a pas d'impact", () => {
    const input: ValuationInput = {
      ...baseInput("ile-de-france", 3),
      transactionType: "murs",
      isEmphyteotic: true,
    };
    const withDiscount = computeValuation({ ...input, emphyteoticYearsRemaining: 60 }, coef);
    const noImpact = computeValuation({ ...input, emphyteoticYearsRemaining: 61 }, coef);
    const withoutEmphyteotic = computeValuation({ ...input, isEmphyteotic: false }, coef);
    expect(
      withDiscount.detail.adjustments.some((a) => a.label.startsWith("Bail emphytéotique")),
    ).toBe(true);
    expect(
      noImpact.detail.adjustments.some((a) => a.label.startsWith("Bail emphytéotique")),
    ).toBe(false);
    expect(noImpact.valueHighCents).toBe(withoutEmphyteotic.valueHighCents);
    expect(noImpact.valueLowCents).toBe(withoutEmphyteotic.valueLowCents);
  });


    const input: ValuationInput = {
      ...baseInput("bretagne", 4),
      comparables: { medianPerRoomCents: 220_000_00, sampleSize: 4, scope: "segment" },
      annualRevenueCents: 1_200_000_00,
      occupancyRate: 68,
    };
    const c = coefficientFor("bretagne", 4);
    expect(computeValuation(input, c)).toEqual(computeValuation(input, c));
  });
});
