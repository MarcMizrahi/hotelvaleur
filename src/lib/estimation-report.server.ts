/**
 * Génération automatique du rapport de valorisation PDF d'une estimation
 * validée, archivage dans le stockage privé et envoi à l'agent attribué.
 * Server-only.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getRegionBySlug } from "@/lib/regions";
import { pdfEuros } from "@/lib/report-pdf";
import { sendEmail } from "@/lib/email.server";

const NAVY: [number, number, number] = [26, 39, 68];
const GOLD: [number, number, number] = [201, 169, 97];
const BUCKET = "estimation-reports";

const WORKS_LABELS: Record<string, string> = {
  aucun: "Aucun",
  legers: "Légers",
  importants: "Importants",
};

const OPERATION_LABELS: Record<string, string> = {
  murs: "Murs seuls",
  fonds: "Fonds de commerce",
  murs_fonds: "Murs et fonds",
};

const METHOD_LABELS: Record<string, string> = {
  ebitda_multiple: "Multiple d'EBITDA",
  per_room: "Prix par chambre",
  blended: "Approche combinée (EBITDA + prix par chambre)",
};

function siteUrl(): string {
  return process.env.SITE_URL ?? "https://hotelvaleur.lovable.app";
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pct(v: number): string {
  const p = (v - 1) * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)} %`;
}

/** Justifications lisibles à partir du détail de calcul stocké. */
export function buildJustifications(row: any): string[] {
  const d = row?.calculation_detail ?? {};
  const out: string[] = [];

  out.push(
    `Méthode retenue : ${METHOD_LABELS[row.method_used] ?? row.method_used ?? "—"}, sur la base du segment ${
      getRegionBySlug(row.region_slug)?.name ?? row.region_slug
    } / ${row.star_rating} étoile(s).`,
  );

  if (d.coefficient) {
    out.push(
      `Références du segment : multiples d'EBITDA de ${d.coefficient.ebitda_multiple_low} à ${d.coefficient.ebitda_multiple_high}, prix par chambre de ${pdfEuros(
        d.coefficient.price_per_room_low_cents,
      )} à ${pdfEuros(d.coefficient.price_per_room_high_cents)}.`,
    );
  }

  if (d.perRoom) {
    out.push(
      `Approche prix par chambre (${row.room_count} chambres) : ${pdfEuros(d.perRoom.low)} à ${pdfEuros(
        d.perRoom.high,
      )}.`,
    );
  }

  if (d.ebitda) {
    out.push(
      `Approche EBITDA (${pdfEuros(d.ebitda.used)}${
        d.ebitda.estimated ? ", EBITDA estimé à partir du chiffre d'affaires" : ", EBITDA déclaré"
      }) : ${pdfEuros(d.ebitda.low)} à ${pdfEuros(d.ebitda.high)}.`,
    );
  }

  if (d.combined) {
    out.push(
      `Fourchette avant ajustements : ${pdfEuros(d.combined.low)} à ${pdfEuros(d.combined.high)}.`,
    );
  }

  for (const a of d.adjustments ?? []) {
    out.push(`Ajustement — ${a.label} : ${pct(Number(a.factor))}.`);
  }

  if (d.marketAnchor) {
    out.push(
      `Recentrage marché : médiane observée de ${pdfEuros(
        d.marketAnchor.medianPerRoomCents,
      )} par chambre sur ${d.marketAnchor.sampleSize} transaction(s) (${
        d.marketAnchor.scope === "segment" ? "segment exact" : "région élargie"
      }), pondération ${Math.round(Number(d.marketAnchor.weight) * 100)} %.`,
    );
  }

  out.push(
    "Prudence appliquée sur la borne haute (−10 %) : les prix affichés en ligne surestiment structurellement les prix actés.",
  );

  const deduction = Number(d.worksDeductionCents ?? 0);
  if (deduction > 0) {
    out.push(
      `Déduction des travaux chiffrés : − ${pdfEuros(deduction)} appliquée aux deux bornes de la fourchette.`,
    );
  }

  if (d.divergent) {
    out.push(
      "Les deux approches divergent fortement : la fourchette est élargie, un avis d'expert sur place est recommandé.",
    );
  }
  if (d.outlier) {
    out.push(
      "Le chiffre d'affaires par chambre déclaré sort des bornes usuelles : données à confirmer avec le propriétaire.",
    );
  }

  return out;
}

/** Construit le PDF du rapport de valorisation. Renvoie les octets du fichier. */
export function buildEstimationReportPdf(row: any): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text("HotelValeur", 14, 12);
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text("Rapport de valorisation", 14, 19);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(new Date(row.created_at).toLocaleDateString("fr-FR"), width - 14, 19, {
    align: "right",
  });
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(row.hotel_name || "Établissement non nommé", 14, 40);
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `${row.city ? `${row.city} · ` : ""}${
      getRegionBySlug(row.region_slug)?.name ?? row.region_slug
    } (${row.department_code})`,
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
  doc.text(
    `${pdfEuros(row.value_low_cents)}  –  ${pdfEuros(row.value_high_cents)}`,
    14,
    70,
  );

  autoTable(doc, {
    startY: 78,
    head: [["Caractéristiques de l'actif", ""]],
    body: [
      ["Chambres", String(row.room_count ?? "—")],
      ["Catégorie", row.star_rating ? `${row.star_rating} étoile(s)` : "Non classé"],
      [
        "Nature de l'opération",
        OPERATION_LABELS[row.transaction_type] ?? row.transaction_type ?? "—",
      ],
      ["Exploitation", row.is_independent ? "Indépendant" : "Sous enseigne"],
      ["Restaurant", row.has_restaurant ? "Oui" : "Non"],
      ["Licence IV", row.has_licence_4 ? "Oui" : "Non"],
      ["Chiffre d'affaires annuel", pdfEuros(row.annual_revenue_cents)],
      ["EBITDA", pdfEuros(row.ebitda_cents)],
      [
        "Taux d'occupation",
        row.occupancy_rate !== null && row.occupancy_rate !== undefined
          ? `${Number(row.occupancy_rate)} %`
          : "—",
      ],
      ["Travaux signalés", WORKS_LABELS[row.works_needed] ?? row.works_needed ?? "Aucun"],
      [
        "Montant des travaux",
        row.works_cost_cents ? pdfEuros(row.works_cost_cents) : "—",
      ],
      [
        "Prix souhaité par le propriétaire",
        row.price_expectation_cents ? pdfEuros(row.price_expectation_cents) : "—",
      ],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    columnStyles: { 0: { cellWidth: 70 }, 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Justification de la valorisation"]],
    body: buildJustifications(row).map((j) => [j]),
    styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: NAVY, textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Contact propriétaire", ""]],
    body: [
      [
        "Nom",
        [row.first_name, row.last_name].filter(Boolean).join(" ") || "—",
      ],
      ["E-mail", row.email ?? "—"],
      ["Téléphone", row.phone ?? "—"],
      ["Horizon de cession", row.sale_intent ?? "—"],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: 255 },
    columnStyles: { 0: { cellWidth: 70 }, 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  const height = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(
      `Document confidentiel HotelValeur — généré le ${new Date().toLocaleDateString("fr-FR")}`,
      14,
      height - 8,
    );
    doc.text(`${i} / ${pages}`, 196, height - 8, { align: "right" });
  }

  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface ReportDeliveryResult {
  ok: boolean;
  path?: string;
  signedUrl?: string;
  sentTo?: string;
  reason?: string;
}

/**
 * Génère le PDF, l'archive, puis l'envoie à l'agent attribué.
 * Ne throw jamais : renvoie toujours un résultat exploitable.
 */
export async function generateAndSendEstimationReport(
  estimationId: string,
  opts: { force?: boolean } = {},
): Promise<ReportDeliveryResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: row, error } = await supabaseAdmin
    .from("estimation")
    .select("*")
    .eq("id", estimationId)
    .maybeSingle();
  if (error || !row) return { ok: false, reason: "Estimation introuvable" };

  if (!opts.force) {
    const { data: existing } = await supabaseAdmin
      .from("estimation_report")
      .select("id, storage_path, status")
      .eq("estimation_id", estimationId)
      .eq("status", "sent")
      .limit(1);
    if (existing && existing.length > 0) {
      return { ok: true, path: existing[0].storage_path, reason: "Rapport déjà envoyé" };
    }
  }

  let agent: {
    id: string;
    full_name: string;
    email: string;
    company: string | null;
  } | null = null;
  if (row.agent_id) {
    const { data: a } = await supabaseAdmin
      .from("broker_agent")
      .select("id, full_name, email, company")
      .eq("id", row.agent_id)
      .maybeSingle();
    agent = (a as typeof agent) ?? null;
  }

  let bytes: Uint8Array;
  try {
    bytes = buildEstimationReportPdf(row);
  } catch (err) {
    console.error("[report] PDF generation failed", err);
    return { ok: false, reason: "Génération du PDF impossible" };
  }

  const name = slugify(row.hotel_name || row.city || row.region_slug || "estimation");
  const path = `${estimationId}/rapport-${name}-${Date.now()}.pdf`;
  const upload = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (upload.error) {
    console.error("[report] upload failed", upload.error);
    return { ok: false, reason: upload.error.message };
  }

  const { data: signed } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, 30 * 24 * 3600);
  const signedUrl = signed?.signedUrl;

  if (!agent) {
    await supabaseAdmin.from("estimation_report").insert({
      estimation_id: estimationId,
      storage_path: path,
      status: "generated",
      error_message: "Aucun agent attribué",
    });
    return {
      ok: true,
      path,
      ...(signedUrl ? { signedUrl } : {}),
      reason: "Rapport généré — aucun agent attribué",
    };
  }

  const html = `<div style="font-family:Arial,sans-serif;color:#0f1c2e;line-height:1.6">
  <h1 style="font-size:20px">Rapport de valorisation — ${esc(row.hotel_name ?? row.city ?? row.department_code)}</h1>
  <p>Bonjour ${esc(agent.full_name)},</p>
  <p>L'estimation ci-dessous vient d'être validée et vous est attribuée. Le rapport PDF complet, avec fourchette et justifications, est disponible via le lien sécurisé ci-dessous (valable 30 jours).</p>
  <ul>
    <li>Établissement : ${esc(row.hotel_name ?? "non précisé")}${row.city ? ` — ${esc(row.city)}` : ""} (${esc(row.department_code)})</li>
    <li>${row.room_count} chambres, ${row.star_rating} étoile(s)</li>
    <li>Fourchette : ${pdfEuros(row.value_low_cents)} – ${pdfEuros(row.value_high_cents)}</li>
    <li>Méthode : ${esc(METHOD_LABELS[row.method_used] ?? row.method_used ?? "—")}</li>
  </ul>
  <h2 style="font-size:16px">Justifications principales</h2>
  <ul>${buildJustifications(row)
    .slice(0, 6)
    .map((j) => `<li>${esc(j)}</li>`)
    .join("")}</ul>
  ${signedUrl ? `<p><a href="${signedUrl}">Télécharger le rapport PDF</a></p>` : ""}
  <p><a href="${siteUrl()}/espace-agent/estimations">Ouvrir dans votre espace agent</a></p>
</div>`;

  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const res = await sendEmail({
    to: agent.email,
    subject: `Rapport de valorisation — ${row.hotel_name ?? row.city ?? row.department_code}`,
    html,
    text,
  });

  await supabaseAdmin.from("estimation_report").insert({
    estimation_id: estimationId,
    agent_id: agent.id,
    storage_path: path,
    sent_to: agent.email,
    status: res.ok ? "sent" : res.skipped ? "skipped" : "failed",
    error_message: res.error ?? null,
  });

  await supabaseAdmin.from("email_log").insert({
    estimation_id: estimationId,
    to_email: agent.email,
    template: "estimation_report_agent",
    status: res.ok ? "sent" : res.skipped ? "skipped" : "failed",
    provider_id: res.providerId ?? null,
    error_message: res.error ?? null,
  });

  return {
    ok: true,
    path,
    ...(signedUrl ? { signedUrl } : {}),
    sentTo: agent.email,
    ...(res.ok ? {} : { reason: res.error ?? "Envoi e-mail indisponible" }),
  };
}
