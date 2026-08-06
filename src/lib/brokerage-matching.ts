/**
 * Sélection déterministe de l'agent à qui attribuer une demande de mise en relation.
 * Aucune IA : filtres explicites puis tri stable.
 */

export type OperationType = "murs_fonds" | "fonds" | "murs" | "bail";

export interface AgentRow {
  id: string;
  full_name: string;
  company: string | null;
  email: string;
  regions: string[];
  star_ratings: number[];
  transaction_types: string[];
  min_rooms: number | null;
  max_rooms: number | null;
  monthly_capacity: number;
  is_active: boolean;
}

export interface MatchCriteria {
  regionSlug: string;
  starRating: number;
  roomCount: number;
  operationType: OperationType;
}

/** Charge courante par agent : nombre de leads reçus sur les 30 derniers jours. */
export type AgentLoad = Record<string, number>;
/** Date (ms) du dernier lead reçu, pour la rotation équitable. */
export type AgentLastAssigned = Record<string, number>;

export type MatchReason = "region" | "adjacent" | "national" | "none";

export interface MatchResult {
  agent: AgentRow | null;
  reason: MatchReason;
  /** Points d'inadéquation acceptés (étoiles, taille, capacité dépassée). */
  penalties?: string[];
}

/**
 * Régions limitrophes (France métropolitaine), utilisées pour le second cercle
 * de proximité géographique lorsqu'aucun agent ne couvre la région exacte.
 */
export const ADJACENT_REGIONS: Record<string, string[]> = {
  "auvergne-rhone-alpes": [
    "bourgogne-franche-comte",
    "centre-val-de-loire",
    "nouvelle-aquitaine",
    "occitanie",
    "provence-alpes-cote-d-azur",
  ],
  "bourgogne-franche-comte": [
    "auvergne-rhone-alpes",
    "centre-val-de-loire",
    "grand-est",
    "ile-de-france",
  ],
  bretagne: ["normandie", "pays-de-la-loire"],
  "centre-val-de-loire": [
    "auvergne-rhone-alpes",
    "bourgogne-franche-comte",
    "ile-de-france",
    "normandie",
    "nouvelle-aquitaine",
    "pays-de-la-loire",
  ],
  corse: ["provence-alpes-cote-d-azur"],
  "grand-est": ["bourgogne-franche-comte", "hauts-de-france", "ile-de-france"],
  "hauts-de-france": ["grand-est", "ile-de-france", "normandie"],
  "ile-de-france": [
    "bourgogne-franche-comte",
    "centre-val-de-loire",
    "grand-est",
    "hauts-de-france",
    "normandie",
  ],
  normandie: [
    "bretagne",
    "centre-val-de-loire",
    "hauts-de-france",
    "ile-de-france",
    "pays-de-la-loire",
  ],
  "nouvelle-aquitaine": [
    "auvergne-rhone-alpes",
    "centre-val-de-loire",
    "occitanie",
    "pays-de-la-loire",
  ],
  occitanie: [
    "auvergne-rhone-alpes",
    "nouvelle-aquitaine",
    "provence-alpes-cote-d-azur",
  ],
  "pays-de-la-loire": [
    "bretagne",
    "centre-val-de-loire",
    "normandie",
    "nouvelle-aquitaine",
  ],
  "provence-alpes-cote-d-azur": ["auvergne-rhone-alpes", "corse", "occitanie"],
};

export function adjacentRegions(slug: string): string[] {
  return ADJACENT_REGIONS[slug] ?? [];
}

/**
 * Critères non bloquants : ils ne disqualifient pas un agent, ils le déclassent.
 * Seule la couverture géographique est éliminatoire (cf. selectAgent).
 */
function softPenalties(a: AgentRow, c: MatchCriteria, load: AgentLoad): string[] {
  const p: string[] = [];
  if (a.star_ratings.length > 0 && !a.star_ratings.includes(c.starRating)) {
    p.push("segment étoiles");
  }
  if (a.transaction_types.length > 0 && !a.transaction_types.includes(c.operationType)) {
    p.push("type d'opération");
  }
  if (
    (a.min_rooms != null && c.roomCount < a.min_rooms) ||
    (a.max_rooms != null && c.roomCount > a.max_rooms)
  ) {
    p.push("taille de l'établissement");
  }
  if ((load[a.id] ?? 0) >= a.monthly_capacity) {
    p.push("capacité mensuelle atteinte");
  }
  return p;
}

/**
 * Tri d'un cercle géographique : d'abord le moins d'écarts de segment,
 * puis la capacité restante décroissante, puis l'ancienneté du dernier lead.
 */
function pickBest(
  candidates: AgentRow[],
  criteria: MatchCriteria,
  load: AgentLoad,
  lastAssigned: AgentLastAssigned,
): { agent: AgentRow; penalties: string[] } | null {
  if (candidates.length === 0) return null;
  const scored = candidates.map((a) => ({ a, p: softPenalties(a, criteria, load) }));
  scored.sort((x, y) => {
    if (x.p.length !== y.p.length) return x.p.length - y.p.length;
    const rx = x.a.monthly_capacity - (load[x.a.id] ?? 0);
    const ry = y.a.monthly_capacity - (load[y.a.id] ?? 0);
    if (rx !== ry) return ry - rx;
    const lx = lastAssigned[x.a.id] ?? 0;
    const ly = lastAssigned[y.a.id] ?? 0;
    if (lx !== ly) return lx - ly;
    return x.a.id.localeCompare(y.a.id);
  });
  const best = scored[0];
  return best ? { agent: best.a, penalties: best.p } : null;
}

/**
 * Priorité = proximité géographique.
 *   1. Agents couvrant explicitement la région du bien
 *   2. Agents couvrant une région limitrophe
 *   3. Agents à couverture nationale (aucune région déclarée)
 * Un agent qui déclare des régions sans inclure la région (ni une limitrophe)
 * n'est jamais attribué : la couverture géographique est éliminatoire.
 */
export function selectAgent(
  agents: AgentRow[],
  criteria: MatchCriteria,
  load: AgentLoad = {},
  lastAssigned: AgentLastAssigned = {},
): MatchResult {
  const active = agents.filter((a) => a.is_active);
  const neighbours = adjacentRegions(criteria.regionSlug);

  const tiers: Array<{ reason: MatchReason; list: AgentRow[] }> = [
    {
      reason: "region",
      list: active.filter((a) => a.regions.includes(criteria.regionSlug)),
    },
    {
      reason: "adjacent",
      list: active.filter(
        (a) =>
          !a.regions.includes(criteria.regionSlug) &&
          a.regions.some((r) => neighbours.includes(r)),
      ),
    },
    {
      reason: "national",
      list: active.filter((a) => a.regions.length === 0),
    },
  ];

  for (const tier of tiers) {
    const pick = pickBest(tier.list, criteria, load, lastAssigned);
    if (pick) return { agent: pick.agent, reason: tier.reason, penalties: pick.penalties };
  }

  return { agent: null, reason: "none", penalties: [] };
}


export const SALE_HORIZONS = [
  { value: "moins_6_mois", label: "Vendre sous 6 mois" },
  { value: "6_18_mois", label: "Vendre dans 6 à 18 mois" },
  { value: "exploration", label: "J'explore, sans calendrier arrêté" },
  { value: "fonds_seul", label: "Céder uniquement le fonds de commerce" },
] as const;

export const OPERATION_TYPES = [
  { value: "murs_fonds", label: "Murs et fonds" },
  { value: "fonds", label: "Fonds de commerce seul" },
  { value: "murs", label: "Murs seuls" },
  { value: "bail", label: "Cession de bail" },
] as const;

export const LEAD_STATUSES = [
  { value: "nouveau", label: "Nouveau" },
  { value: "attribue", label: "Attribué" },
  { value: "contacte", label: "Contacté" },
  { value: "mandat", label: "Mandat signé" },
  { value: "perdu", label: "Perdu" },
] as const;

export function statusLabel(v: string): string {
  return LEAD_STATUSES.find((s) => s.value === v)?.label ?? v;
}
export function horizonLabel(v: string): string {
  return SALE_HORIZONS.find((s) => s.value === v)?.label ?? v;
}
export function operationLabel(v: string): string {
  return OPERATION_TYPES.find((s) => s.value === v)?.label ?? v;
}
