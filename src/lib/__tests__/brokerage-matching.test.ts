import { describe, it, expect } from "vitest";
import { selectAgent, adjacentRegions, type AgentRow } from "@/lib/brokerage-matching";

function agent(over: Partial<AgentRow> & { id: string }): AgentRow {
  return {
    full_name: over.id,
    company: null,
    email: `${over.id}@test.fr`,
    regions: [],
    star_ratings: [],
    transaction_types: [],
    min_rooms: null,
    max_rooms: null,
    monthly_capacity: 5,
    is_active: true,
    ...over,
  };
}

const criteria = {
  regionSlug: "bretagne",
  starRating: 3,
  roomCount: 40,
  operationType: "murs_fonds" as const,
};

describe("brokerage matching — proximité géographique", () => {
  it("préfère l'agent de la région même s'il est moins bien noté sur le segment", () => {
    const res = selectAgent(
      [
        agent({ id: "local", regions: ["bretagne"], star_ratings: [4, 5] }),
        agent({ id: "national", star_ratings: [3] }),
      ],
      criteria,
    );
    expect(res.agent?.id).toBe("local");
    expect(res.reason).toBe("region");
    expect(res.penalties).toContain("segment étoiles");
  });

  it("bascule sur une région limitrophe avant le national", () => {
    const res = selectAgent(
      [
        agent({ id: "voisin", regions: ["pays-de-la-loire"] }),
        agent({ id: "national" }),
      ],
      criteria,
    );
    expect(res.agent?.id).toBe("voisin");
    expect(res.reason).toBe("adjacent");
  });

  it("n'attribue jamais un agent hors zone (région non couverte, non limitrophe)", () => {
    const res = selectAgent([agent({ id: "paca", regions: ["provence-alpes-cote-d-azur"] })], criteria);
    expect(res.agent).toBeNull();
    expect(res.reason).toBe("none");
  });

  it("se replie sur un agent national quand aucune couverture locale", () => {
    const res = selectAgent(
      [agent({ id: "paca", regions: ["provence-alpes-cote-d-azur"] }), agent({ id: "nat" })],
      criteria,
    );
    expect(res.agent?.id).toBe("nat");
    expect(res.reason).toBe("national");
  });

  it("ignore les agents inactifs", () => {
    const res = selectAgent(
      [agent({ id: "off", regions: ["bretagne"], is_active: false }), agent({ id: "nat" })],
      criteria,
    );
    expect(res.agent?.id).toBe("nat");
  });
});

describe("brokerage matching — critères non bloquants", () => {
  it("classe d'abord l'agent sans écart de segment dans le même cercle", () => {
    const res = selectAgent(
      [
        agent({ id: "hors-taille", regions: ["bretagne"], max_rooms: 20 }),
        agent({ id: "adapte", regions: ["bretagne"] }),
      ],
      criteria,
    );
    expect(res.agent?.id).toBe("adapte");
    expect(res.penalties).toEqual([]);
  });

  it("attribue quand même si tous les agents locaux sont hors segment", () => {
    const res = selectAgent(
      [agent({ id: "local", regions: ["bretagne"], transaction_types: ["murs"] })],
      criteria,
    );
    expect(res.agent?.id).toBe("local");
    expect(res.penalties).toContain("type d'opération");
  });

  it("déclasse mais n'exclut pas un agent à capacité atteinte", () => {
    const res = selectAgent(
      [agent({ id: "plein", regions: ["bretagne"], monthly_capacity: 2 })],
      criteria,
      { plein: 2 },
    );
    expect(res.agent?.id).toBe("plein");
    expect(res.penalties).toContain("capacité mensuelle atteinte");
  });

  it("répartit selon la capacité restante puis l'ancienneté", () => {
    const agents = [
      agent({ id: "a", regions: ["bretagne"], monthly_capacity: 5 }),
      agent({ id: "b", regions: ["bretagne"], monthly_capacity: 5 }),
    ];
    expect(selectAgent(agents, criteria, { a: 3, b: 1 }).agent?.id).toBe("b");
    expect(selectAgent(agents, criteria, { a: 1, b: 1 }, { a: 200, b: 100 }).agent?.id).toBe("b");
  });
});

describe("adjacence régionale", () => {
  it("est symétrique sur les 13 régions", () => {
    const slugs = Object.keys(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      {} as Record<string, string>,
    );
    void slugs;
    const all = [
      "auvergne-rhone-alpes",
      "bourgogne-franche-comte",
      "bretagne",
      "centre-val-de-loire",
      "corse",
      "grand-est",
      "hauts-de-france",
      "ile-de-france",
      "normandie",
      "nouvelle-aquitaine",
      "occitanie",
      "pays-de-la-loire",
      "provence-alpes-cote-d-azur",
    ];
    for (const r of all) {
      const neighbours = adjacentRegions(r);
      expect(neighbours.length).toBeGreaterThan(0);
      for (const n of neighbours) {
        expect(all).toContain(n);
        expect(adjacentRegions(n)).toContain(r);
      }
    }
  });
});
