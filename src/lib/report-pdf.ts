import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getRegionBySlug } from "@/lib/regions";

const NAVY: [number, number, number] = [26, 39, 68];
const GOLD: [number, number, number] = [201, 169, 97];

/** Montant en centimes -> "1 250 000 €" (espaces simples, compatibles PDF). */
export function pdfEuros(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(Number(cents))) return "—";
  const euros = Math.round(Number(cents) / 100);
  return `${euros.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} \u20ac`;
}

export function worksDeductionCents(row: any): number {
  const d = row?.calculation_detail?.worksDeductionCents;
  return typeof d === "number" && d > 0 ? d : 0;
}

const WORKS_LABELS: Record<string, string> = {
  aucun: "Aucun",
  legers: "Légers",
  importants: "Importants",
};

function header(doc: jsPDF, title: string, subtitle: string) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text("HotelValeur", 14, 12);
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text(title, 14, 19);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(subtitle, width - 14, 19, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

function footer(doc: jsPDF) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(
      `Document interne HotelValeur — généré le ${new Date().toLocaleDateString("fr-FR")}`,
      14,
      height - 8,
    );
    doc.text(`${i} / ${pages}`, width - 14, height - 8, { align: "right" });
  }
}

const PERIOD_LABELS: Record<string, string> = {
  "7": "7 derniers jours",
  "30": "30 derniers jours",
  "90": "90 derniers jours",
  all: "Historique complet",
};

/** PDF de synthèse : tout le tableau des estimations de la période. */
export function downloadReportsPdf(rows: any[], days: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  header(
    doc,
    `Rapport d'estimations — ${PERIOD_LABELS[days] ?? days}`,
    `${rows.length} estimation(s)`,
  );

  autoTable(doc, {
    startY: 32,
    head: [
      [
        "Date",
        "Établissement",
        "Ch.",
        "Cat.",
        "Opération",
        "Fourchette",
        "Prix souhaité",
        "Travaux",
        "Montant travaux",
        "Déduction travaux",
        "Méthode",
        "Contact",
      ],
    ],
    body: rows.map((r) => [
      new Date(r.created_at).toLocaleDateString("fr-FR"),
      `${r.hotel_name ? `${r.hotel_name} — ` : ""}${
        getRegionBySlug(r.region_slug)?.name ?? r.region_slug
      } (${r.department_code})`,
      String(r.room_count ?? ""),
      String(r.star_rating ?? ""),
      r.transaction_type ?? "",
      `${pdfEuros(r.value_low_cents)} – ${pdfEuros(r.value_high_cents)}`,
      r.price_expectation_cents ? pdfEuros(r.price_expectation_cents) : "—",
      WORKS_LABELS[r.works_needed] ?? r.works_needed ?? "—",
      r.works_cost_cents ? pdfEuros(r.works_cost_cents) : "—",
      worksDeductionCents(r) ? `- ${pdfEuros(worksDeductionCents(r))}` : "—",
      r.method_used ?? "",
      r.email ?? "",
    ]),
    styles: { fontSize: 7, cellPadding: 1.6, overflow: "linebreak" },
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 7 },
    alternateRowStyles: { fillColor: [246, 246, 248] },
    columnStyles: {
      0: { cellWidth: 17 },
      1: { cellWidth: 52 },
      2: { cellWidth: 10, halign: "right" },
      3: { cellWidth: 10, halign: "right" },
      4: { cellWidth: 20 },
      5: { cellWidth: 44, halign: "right" },
      6: { cellWidth: 22, halign: "right" },
      7: { cellWidth: 18 },
      8: { cellWidth: 22, halign: "right" },
      9: { cellWidth: 24, halign: "right" },
      10: { cellWidth: 16 },
    },
    margin: { left: 10, right: 10 },
  });

  footer(doc);
  doc.save(`rapport-estimations-${days}j.pdf`);
}

/** PDF détaillé pour une estimation donnée. */
export function downloadEstimationPdf(r: any) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(
    doc,
    "Rapport d'estimation",
    new Date(r.created_at).toLocaleDateString("fr-FR"),
  );

  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(r.hotel_name || "Établissement non nommé", 14, 40);
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `${r.city ? `${r.city} · ` : ""}${
      getRegionBySlug(r.region_slug)?.name ?? r.region_slug
    } (${r.department_code})`,
    14,
    46,
  );

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(14, 52, 196, 52);

  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Fourchette de valorisation", 14, 61);
  doc.setFontSize(16);
  doc.text(`${pdfEuros(r.value_low_cents)}  –  ${pdfEuros(r.value_high_cents)}`, 14, 70);

  const deduction = worksDeductionCents(r);

  autoTable(doc, {
    startY: 78,
    head: [["Caractéristiques", ""]],
    body: [
      ["Chambres", String(r.room_count ?? "—")],
      ["Catégorie", r.star_rating ? `${r.star_rating} étoile(s)` : "Non classé"],
      ["Nature de l'opération", r.transaction_type ?? "—"],
      ["Exploitation", r.is_independent ? "Indépendant" : "Sous enseigne"],
      ["Restaurant", r.has_restaurant ? "Oui" : "Non"],
      ["Licence IV", r.has_licence_4 ? "Oui" : "Non"],
      ["Chiffre d'affaires annuel", pdfEuros(r.annual_revenue_cents)],
      ["EBITDA", pdfEuros(r.ebitda_cents)],
      [
        "Taux d'occupation",
        r.occupancy_rate !== null && r.occupancy_rate !== undefined
          ? `${Number(r.occupancy_rate)} %`
          : "—",
      ],
      ["Méthode retenue", r.method_used ?? "—"],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    columnStyles: { 0: { cellWidth: 70 }, 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Travaux", ""]],
    body: [
      ["Travaux signalés", WORKS_LABELS[r.works_needed] ?? r.works_needed ?? "Aucun"],
      ["Montant estimé des travaux", r.works_cost_cents ? pdfEuros(r.works_cost_cents) : "—"],
      ["Déduction appliquée à la fourchette", deduction ? `- ${pdfEuros(deduction)}` : "—"],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    columnStyles: { 0: { cellWidth: 70 }, 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Intention & contact", ""]],
    body: [
      ["Horizon de cession", r.sale_intent ?? "—"],
      [
        "Prix souhaité par le propriétaire",
        r.price_expectation_cents ? pdfEuros(r.price_expectation_cents) : "—",
      ],
      ["Statut du lead", r.status ?? "—"],
      ["E-mail", r.email ?? "—"],
      ["Téléphone", r.phone ?? "—"],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    columnStyles: { 0: { cellWidth: 70 }, 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  footer(doc);
  const slug = (r.hotel_name || r.region_slug || "estimation")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  doc.save(`estimation-${slug}-${String(r.id).slice(0, 8)}.pdf`);
}
