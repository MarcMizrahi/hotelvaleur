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

export interface MatchResult {
  agent: AgentRow | null;
  /** "region" | "national" | "none" */
  reason: "region" | "national" | "none";
}

function matchesSegment(a: AgentRow, c: MatchCriteria): boolean {
  if (a.star_ratings.length > 0 && !a.star_ratings.includes(c.starRating)) return false;
  if (a.transaction_types.length > 0 && !a.transaction_types.includes(c.operationType))
    return false;
  if (a.min_rooms != null && c.roomCount < a.min_rooms) return false;
  if (a.max_rooms != null && c.roomCount > a.max_rooms) return false;
  return true;
}

function hasCapacity(a: AgentRow, load: AgentLoad): boolean {
  return (load[a.id] ?? 0) < a.monthly_capacity;
}

/** Tri : capacité restante décroissante, puis ancienneté du dernier lead, puis id. */
function pickBest(
  candidates: AgentRow[],
  load: AgentLoad,
  lastAssigned: AgentLastAssigned,
): AgentRow | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((x, y) => {
    const rx = x.monthly_capacity - (load[x.id] ?? 0);
    const ry = y.monthly_capacity - (load[y.id] ?? 0);
    if (rx !== ry) return ry - rx;
    const lx = lastAssigned[x.id] ?? 0;
    const ly = lastAssigned[y.id] ?? 0;
    if (lx !== ly) return lx - ly;
    return x.id.localeCompare(y.id);
  });
  return sorted[0] ?? null;
}

export function selectAgent(
  agents: AgentRow[],
  criteria: MatchCriteria,
  load: AgentLoad = {},
  lastAssigned: AgentLastAssigned = {},
): MatchResult {
  const active = agents.filter((a) => a.is_active);

  const regional = active.filter(
    (a) =>
      a.regions.includes(criteria.regionSlug) &&
      matchesSegment(a, criteria) &&
      hasCapacity(a, load),
  );
  const regionalPick = pickBest(regional, load, lastAssigned);
  if (regionalPick) return { agent: regionalPick, reason: "region" };

  // Repli national : agents sans restriction de région (couverture nationale).
  const national = active.filter(
    (a) => a.regions.length === 0 && matchesSegment(a, criteria) && hasCapacity(a, load),
  );
  const nationalPick = pickBest(national, load, lastAssigned);
  if (nationalPick) return { agent: nationalPick, reason: "national" };

  return { agent: null, reason: "none" };
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
