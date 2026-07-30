/**
 * Import de données financières depuis un fichier Excel / CSV.
 *
 * Deux cas gérés :
 *  1. Fichier mono-période : « libellé | valeur » ou en-têtes en ligne 1 / valeurs en ligne 2.
 *  2. Fichier multi-exercices : une colonne (ou une ligne) par année, ex.
 *
 *       |            | 2021    | 2022    | 2023    |
 *       | CA         | 800000  | 950000  | 1020000 |
 *       | EBITDA     | 210000  | 265000  | 300000  |
 *       | Occupation | 58      | 63      | 66      |
 *
 *     ou la même chose transposée (années en première colonne).
 *
 * En multi-exercices, on retient une moyenne pondérée par récence
 * (poids 3 / 2 / 1 sur les trois derniers exercices disponibles) plutôt que
 * la dernière année seule : cela lisse un exercice atypique tout en donnant
 * la priorité à la performance récente. La tendance (CAGR du CA) est renvoyée
 * à titre indicatif.
 */

export interface YearlyFinancials {
  year: number;
  annualRevenueCents?: number;
  ebitdaCents?: number;
  occupancyRate?: number;
}

export interface ImportedFinancials {
  /** Valeurs retenues (moyenne pondérée par récence si plusieurs exercices). */
  annualRevenueCents?: number;
  ebitdaCents?: number;
  occupancyRate?: number;
  /** Série complète détectée, triée par année croissante. */
  years?: YearlyFinancials[];
  /** Croissance annuelle moyenne du CA sur la période (en %, ex. 7.4). */
  revenueCagr?: number;
}

type Metric = "revenue" | "ebitda" | "occupancy";

const KEYWORDS: Record<Metric, readonly string[]> = {
  revenue: [
    "chiffre d'affaires",
    "chiffre d affaires",
    "chiffres d'affaires",
    "ca ht",
    "ca ttc",
    "ca annuel",
    "revenue",
    "turnover",
    "ca",
  ],
  ebitda: ["ebitda", "ebe", "excedent brut", "excédent brut", "resultat brut", "résultat brut"],
  occupancy: ["taux d'occupation", "taux d occupation", "occupation", "occupancy", "to moyen", "to"],
};

function norm(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const cleaned = v
    .replace(/[€%\s\u00a0]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Reconnaît « 2023 », « FY2023 », « Exercice 2023 », « 2023/24 », « 2023-2024 ». */
function toYear(v: unknown): number | null {
  const s = norm(v);
  if (!s) return null;
  const m = s.match(/(19|20)\d{2}/);
  if (!m) return null;
  const y = Number(m[0]);
  if (y < 1990 || y > new Date().getFullYear() + 2) return null;
  // Évite de confondre un montant (ex. 2 000 000) avec une année.
  const n = toNumber(v);
  if (n !== null && String(Math.round(n)) !== String(y)) return null;
  return y;
}

function metricOf(label: string): Metric | null {
  const l = norm(label);
  if (!l) return null;
  for (const m of ["ebitda", "occupancy", "revenue"] as Metric[]) {
    if (KEYWORDS[m].some((k) => l === k || l.includes(k))) return m;
  }
  return null;
}

function normalizeOccupancy(value: number): number | undefined {
  const pct = value > 0 && value <= 1 ? value * 100 : value;
  if (pct < 0 || pct > 100) return undefined;
  return Math.round(pct * 10) / 10;
}

function setMetric(target: YearlyFinancials, metric: Metric, value: number) {
  if (metric === "ebitda") {
    if (target.ebitdaCents === undefined) target.ebitdaCents = Math.round(value * 100);
  } else if (metric === "revenue") {
    if (target.annualRevenueCents === undefined) target.annualRevenueCents = Math.round(value * 100);
  } else {
    if (target.occupancyRate === undefined) {
      const pct = normalizeOccupancy(value);
      if (pct !== undefined) target.occupancyRate = pct;
    }
  }
}

/** Moyenne pondérée par récence sur les 3 derniers exercices renseignés. */
function weighted(series: YearlyFinancials[], pick: (y: YearlyFinancials) => number | undefined) {
  const points = series
    .filter((y) => typeof pick(y) === "number")
    .slice(-3);
  if (points.length === 0) return undefined;
  const weights = points.length === 1 ? [1] : points.length === 2 ? [1, 2] : [1, 2, 3];
  let sum = 0;
  let wsum = 0;
  points.forEach((p, i) => {
    sum += (pick(p) as number) * weights[i];
    wsum += weights[i];
  });
  return sum / wsum;
}

function computeCagr(series: YearlyFinancials[]): number | undefined {
  const pts = series.filter((y) => (y.annualRevenueCents ?? 0) > 0);
  if (pts.length < 2) return undefined;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const span = last.year - first.year;
  if (span <= 0) return undefined;
  const ratio = (last.annualRevenueCents as number) / (first.annualRevenueCents as number);
  const cagr = (Math.pow(ratio, 1 / span) - 1) * 100;
  return Number.isFinite(cagr) ? Math.round(cagr * 10) / 10 : undefined;
}

/** Extraction multi-exercices : années en colonnes (labels en tête de ligne). */
function parseYearsInColumns(rows: unknown[][]): Map<number, YearlyFinancials> | null {
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const yearCols = new Map<number, number>(); // colIndex -> year
    row.forEach((cell, i) => {
      const y = toYear(cell);
      if (y !== null) yearCols.set(i, y);
    });
    if (yearCols.size < 2) continue;

    const out = new Map<number, YearlyFinancials>();
    for (const [, y] of yearCols) out.set(y, { year: y });

    let found = false;
    for (const r of rows) {
      if (!Array.isArray(r) || r === row) continue;
      const labelCell = r.find((c) => toNumber(c) === null && norm(c));
      const metric = metricOf(String(labelCell ?? ""));
      if (!metric) continue;
      for (const [col, year] of yearCols) {
        const n = toNumber(r[col]);
        if (n === null) continue;
        setMetric(out.get(year)!, metric, n);
        found = true;
      }
    }
    if (found) return out;
  }
  return null;
}

/** Extraction multi-exercices : années en première colonne, métriques en en-têtes. */
function parseYearsInRows(rows: unknown[][]): Map<number, YearlyFinancials> | null {
  if (rows.length < 3) return null;
  const header = rows[0];
  if (!Array.isArray(header)) return null;
  const metricCols = new Map<number, Metric>();
  header.forEach((h, i) => {
    const m = metricOf(String(h ?? ""));
    if (m) metricCols.set(i, m);
  });
  if (metricCols.size === 0) return null;

  const out = new Map<number, YearlyFinancials>();
  for (const r of rows.slice(1)) {
    if (!Array.isArray(r)) continue;
    let year: number | null = null;
    for (const cell of r) {
      year = toYear(cell);
      if (year !== null) break;
    }
    if (year === null) continue;
    const entry = out.get(year) ?? { year };
    out.set(year, entry);
    for (const [col, metric] of metricCols) {
      const n = toNumber(r[col]);
      if (n !== null) setMetric(entry, metric, n);
    }
  }
  return out.size >= 2 ? out : null;
}

/** Extraction mono-période (comportement historique). */
function parseSinglePeriod(rows: unknown[][]): ImportedFinancials {
  const out: ImportedFinancials = {};
  const assign = (label: string, value: number) => {
    const metric = metricOf(label);
    if (!metric) return;
    if (metric === "ebitda" && out.ebitdaCents === undefined) {
      out.ebitdaCents = Math.round(value * 100);
    } else if (metric === "occupancy" && out.occupancyRate === undefined) {
      const pct = normalizeOccupancy(value);
      if (pct !== undefined) out.occupancyRate = pct;
    } else if (metric === "revenue" && out.annualRevenueCents === undefined) {
      out.annualRevenueCents = Math.round(value * 100);
    }
  };

  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    let label: string | null = null;
    for (const cell of row) {
      const asNum = toNumber(cell);
      if (label === null) {
        if (asNum === null && norm(cell)) label = norm(cell);
      } else if (asNum !== null) {
        assign(label, asNum);
        break;
      }
    }
  }

  if (rows.length >= 2) {
    const headers = (rows[0] as unknown[]) ?? [];
    const values = (rows[1] as unknown[]) ?? [];
    headers.forEach((h, i) => {
      const n = toNumber(values[i]);
      if (n !== null) assign(norm(h), n);
    });
  }

  return out;
}

/** Parse un fichier .xlsx / .xls / .csv et en extrait CA, EBITDA et taux d'occupation. */
export async function parseFinancialsFile(file: File): Promise<ImportedFinancials> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return {};
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  const byYear = parseYearsInColumns(rows) ?? parseYearsInRows(rows);

  if (byYear) {
    const series = [...byYear.values()]
      .filter(
        (y) =>
          y.annualRevenueCents !== undefined ||
          y.ebitdaCents !== undefined ||
          y.occupancyRate !== undefined,
      )
      .sort((a, b) => a.year - b.year);

    if (series.length >= 2) {
      const revenue = weighted(series, (y) => y.annualRevenueCents);
      const ebitda = weighted(series, (y) => y.ebitdaCents);
      const occ = weighted(series, (y) => y.occupancyRate);
      return {
        annualRevenueCents: revenue !== undefined ? Math.round(revenue) : undefined,
        ebitdaCents: ebitda !== undefined ? Math.round(ebitda) : undefined,
        occupancyRate: occ !== undefined ? Math.round(occ * 10) / 10 : undefined,
        years: series,
        revenueCagr: computeCagr(series),
      };
    }
    if (series.length === 1) {
      const [only] = series;
      return { ...only, years: series, year: undefined } as ImportedFinancials;
    }
  }

  return parseSinglePeriod(rows);
}
