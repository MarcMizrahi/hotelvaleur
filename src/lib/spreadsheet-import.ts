/**
 * Import de données financières depuis un fichier Excel / CSV.
 * Recherche libre dans la feuille : on repère un libellé (CA, EBITDA, occupation)
 * puis on prend la première valeur numérique de la même ligne (ou de la colonne
 * juste en dessous si le fichier est en format tableau à en-têtes).
 */

export interface ImportedFinancials {
  annualRevenueCents?: number;
  ebitdaCents?: number;
  occupancyRate?: number;
}

const KEYWORDS = {
  revenue: ["chiffre d'affaires", "chiffre d affaires", "chiffres d'affaires", "ca ht", "ca ttc", "ca annuel", "revenue", "turnover", "ca"],
  ebitda: ["ebitda", "ebe", "excedent brut", "excédent brut", "resultat brut", "résultat brut"],
  occupancy: ["taux d'occupation", "taux d occupation", "occupation", "occupancy", "to moyen", "to"],
} as const;

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

function matches(label: string, keys: readonly string[]): boolean {
  return keys.some((k) => label === k || label.includes(k));
}

/** Parse un fichier .xlsx / .xls / .csv et en extrait CA, EBITDA et taux d'occupation. */
export async function parseFinancialsFile(file: File): Promise<ImportedFinancials> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return {};
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  const out: ImportedFinancials = {};

  const assign = (label: string, value: number) => {
    if (matches(label, KEYWORDS.ebitda) && out.ebitdaCents === undefined) {
      out.ebitdaCents = Math.round(value * 100);
    } else if (matches(label, KEYWORDS.occupancy) && out.occupancyRate === undefined) {
      // Un taux exprimé en 0–1 est converti en pourcentage.
      const pct = value > 0 && value <= 1 ? value * 100 : value;
      if (pct >= 0 && pct <= 100) out.occupancyRate = Math.round(pct * 10) / 10;
    } else if (matches(label, KEYWORDS.revenue) && out.annualRevenueCents === undefined) {
      out.annualRevenueCents = Math.round(value * 100);
    }
  };

  // 1. Format "libellé | valeur" ligne par ligne
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

  // 2. Format tableau : en-têtes en ligne 1, valeurs en ligne 2
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
