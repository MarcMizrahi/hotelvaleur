import { describe, it, expect } from "vitest";
import { selectComparables, median, STAR_CURVE, type ComparableRow } from "@/lib/comparables";

const row = (p: Partial<ComparableRow> & { price_per_room_cents: number }): ComparableRow => ({
  star_rating: 3,
  transaction_type: "murs_fonds",
  ...p,
});

describe("median", () => {
  it("retourne la valeur centrale sur un échantillon impair", () => {
    expect(median([300, 100, 200])).toBe(200);
  });
  it("moyenne les deux valeurs centrales sur un échantillon pair", () => {
    expect(median([100, 200, 300, 500])).toBe(250);
  });
  it("ne mute pas le tableau d'entrée", () => {
    const v = [3, 1, 2];
    median(v);
    expect(v).toEqual([3, 1, 2]);
  });
});

describe("selectComparables — périmètre segment", () => {
  it("retient la médiane de la catégorie exacte dès 2 transactions", () => {
    const res = selectComparables(
      [row({ price_per_room_cents: 200_00_000 }), row({ price_per_room_cents: 300_00_000 })],
      3,
    );
    expect(res).toEqual({
      medianPerRoomCents: 250_00_000,
      sampleSize: 2,
      scope: "segment",
    });
  });

  it("ne bascule pas en segment avec une seule transaction", () => {
    const res = selectComparables([row({ price_per_room_cents: 200_00_000 })], 3);
    expect(res).toBeNull();
  });
});

describe("selectComparables — repli régional ±1 étoile", () => {
  it("normalise les prix voisins vers la catégorie cible", () => {
    const rows: ComparableRow[] = [
      row({ star_rating: 2, price_per_room_cents: 100_000 }),
      row({ star_rating: 2, price_per_room_cents: 100_000 }),
      row({ star_rating: 4, price_per_room_cents: 100_000 }),
    ];
    const res = selectComparables(rows, 3);
    expect(res?.scope).toBe("region");
    expect(res?.sampleSize).toBe(3);
    const norm2 = Math.round((100_000 * STAR_CURVE[3]!) / STAR_CURVE[2]!);
    expect(res?.medianPerRoomCents).toBe(norm2);
  });

  it("exige au moins 3 transactions pour le repli", () => {
    const rows: ComparableRow[] = [
      row({ star_rating: 2, price_per_room_cents: 100_000 }),
      row({ star_rating: 4, price_per_room_cents: 100_000 }),
    ];
    expect(selectComparables(rows, 3)).toBeNull();
  });

  it("ignore les catégories distantes de plus d'une étoile", () => {
    const rows: ComparableRow[] = [
      row({ star_rating: 1, price_per_room_cents: 100_000 }),
      row({ star_rating: 1, price_per_room_cents: 100_000 }),
      row({ star_rating: 5, price_per_room_cents: 100_000 }),
    ];
    expect(selectComparables(rows, 3)).toBeNull();
  });
});

describe("selectComparables — exclusions", () => {
  it("exclut les transactions « fonds seul » et « murs seuls »", () => {
    const rows: ComparableRow[] = [
      row({ price_per_room_cents: 200_000, transaction_type: "fonds" }),
      row({ price_per_room_cents: 200_000, transaction_type: "murs" }),
      row({ price_per_room_cents: 200_000, transaction_type: "fonds" }),
    ];
    expect(selectComparables(rows, 3)).toBeNull();
  });

  it("accepte les transactions de type inconnu (null)", () => {
    const rows: ComparableRow[] = [
      row({ price_per_room_cents: 200_000, transaction_type: null }),
      row({ price_per_room_cents: 400_000, transaction_type: null }),
    ];
    expect(selectComparables(rows, 3)?.medianPerRoomCents).toBe(300_000);
  });

  it("exclut les prix nuls, négatifs ou manquants", () => {
    const rows: ComparableRow[] = [
      { star_rating: 3, price_per_room_cents: null, transaction_type: "murs_fonds" },
      row({ price_per_room_cents: 0 }),
      row({ price_per_room_cents: -100 }),
      row({ price_per_room_cents: 200_000 }),
    ];
    expect(selectComparables(rows, 3)).toBeNull();
  });

  it("un mélange fonds seul + murs+fonds ne retient que les murs+fonds", () => {
    const rows: ComparableRow[] = [
      row({ price_per_room_cents: 100_000, transaction_type: "fonds" }),
      row({ price_per_room_cents: 200_000 }),
      row({ price_per_room_cents: 400_000 }),
    ];
    const res = selectComparables(rows, 3);
    expect(res).toEqual({ medianPerRoomCents: 300_000, sampleSize: 2, scope: "segment" });
  });
});
