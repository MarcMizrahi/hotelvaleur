import { formatEurosRange, formatEuros } from "@/lib/money";
import { site as siteConfig } from "@/config/site";
import type { EstimationDraft } from "@/lib/estimation-storage";
import { regions } from "@/lib/regions";

export interface ReportInput {
  low: number;
  high: number;
  methodUsed: string;
  draft: EstimationDraft;
  unsubscribeUrl: string;
  siteUrl: string;
  regionSlug: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildReportSubject(low: number, high: number): string {
  return `Votre estimation : entre ${formatEuros(low)} et ${formatEuros(high)}`;
}

export function buildReportHtml(input: ReportInput): string {
  const { low, high, methodUsed, draft, unsubscribeUrl, siteUrl, regionSlug } = input;
  const region = regions.find((r) => r.slug === regionSlug);
  const dep = region?.departments.find((d) => d.code === draft.departmentCode);
  const txLabel =
    draft.transactionType === "murs_fonds"
      ? "murs et fonds"
      : draft.transactionType === "fonds"
        ? "fonds de commerce"
        : "murs seuls";
  const methodText =
    methodUsed === "blended"
      ? "Nous avons combiné le multiple d'EBITDA et le prix par chambre observés dans votre région, en donnant davantage de poids à l'exploitation."
      : "Faute de données financières, nous avons utilisé les prix par chambre observés dans votre région, en élargissant la fourchette pour refléter l'incertitude.";

  const rangeStr = formatEurosRange(low, high);

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${esc(buildReportSubject(low, high))}</title></head>
<body style="margin:0;padding:0;background:#f4f4f2;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e5e5;">
<tr><td style="padding:24px 32px;border-bottom:1px solid #eeeeee;">
  <p style="margin:0;font-size:14px;color:#666666;">${esc(siteConfig.name)}</p>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0;font-size:14px;color:#666666;">Votre estimation confidentielle</p>
  <p style="margin:8px 0 0;font-size:28px;line-height:1.2;font-weight:700;">Entre ${esc(rangeStr)}</p>
  <p style="margin:16px 0 0;font-size:15px;color:#333333;">
    Pour un hôtel de ${draft.roomCount ?? "?"} chambre(s), ${draft.starRating ? draft.starRating + " étoiles" : "non classé"}${dep ? ", dans le " + esc(dep.name) : ""}, ${esc(txLabel)}.
  </p>
</td></tr>

<tr><td style="padding:0 32px 24px;">
  <h2 style="font-size:18px;margin:24px 0 8px;">Récapitulatif</h2>
  <table role="presentation" width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
    <tr><td style="border-bottom:1px solid #eee;">Chambres</td><td style="border-bottom:1px solid #eee;text-align:right;">${draft.roomCount ?? "—"}</td></tr>
    <tr><td style="border-bottom:1px solid #eee;">Classement</td><td style="border-bottom:1px solid #eee;text-align:right;">${draft.starRating ? draft.starRating + " étoiles" : "Non classé"}</td></tr>
    <tr><td style="border-bottom:1px solid #eee;">Département</td><td style="border-bottom:1px solid #eee;text-align:right;">${dep ? esc(dep.name) : "—"}</td></tr>
    <tr><td style="border-bottom:1px solid #eee;">Transaction</td><td style="border-bottom:1px solid #eee;text-align:right;">${esc(txLabel)}</td></tr>
    ${draft.annualRevenueCents ? `<tr><td style="border-bottom:1px solid #eee;">Chiffre d'affaires</td><td style="border-bottom:1px solid #eee;text-align:right;">${esc(formatEuros(draft.annualRevenueCents))}</td></tr>` : ""}
    ${draft.ebitdaCents ? `<tr><td style="border-bottom:1px solid #eee;">EBITDA</td><td style="border-bottom:1px solid #eee;text-align:right;">${esc(formatEuros(draft.ebitdaCents))}</td></tr>` : ""}
  </table>

  <h2 style="font-size:18px;margin:24px 0 8px;">La méthode</h2>
  <p style="font-size:14px;line-height:1.5;color:#333333;margin:0;">${esc(methodText)}</p>

  <h2 style="font-size:18px;margin:24px 0 8px;">Trois facteurs qui feraient varier ce résultat</h2>
  <ol style="font-size:14px;line-height:1.6;color:#333333;padding-left:20px;margin:0;">
    <li>La qualité réelle de votre exploitation (EBITDA, taux d'occupation, RevPAR).</li>
    <li>L'état du bien et des équipements ; les travaux à prévoir minorent la valeur.</li>
    <li>Le contexte local : attractivité touristique, saisonnalité, concurrence.</li>
  </ol>

  <h2 style="font-size:18px;margin:24px 0 8px;">Pour aller plus loin</h2>
  <p style="font-size:14px;margin:0;">
    <a href="${esc(siteUrl)}/guides/vendre-son-hotel-etapes" style="color:#0f3057;">Vendre son hôtel : les étapes</a><br>
    ${region ? `<a href="${esc(siteUrl)}/prix-hotel/${esc(region.slug)}" style="color:#0f3057;">Prix d'un hôtel en ${esc(region.name)}</a>` : ""}
  </p>

  <p style="font-size:12px;color:#666666;margin:24px 0 0;line-height:1.5;">
    Cette estimation est <strong>indicative</strong>. Elle repose sur des références de marché
    et ne remplace pas l'expertise d'un professionnel, qui prendra en compte l'état de votre
    bien, votre bail, votre clientèle et votre comptabilité réelle.
  </p>
</td></tr>

<tr><td style="padding:16px 32px;border-top:1px solid #eeeeee;font-size:11px;color:#888888;">
  ${esc(siteConfig.name)} — <a href="${esc(unsubscribeUrl)}" style="color:#888888;">Se désabonner</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function buildReportText(input: ReportInput): string {
  const { low, high, methodUsed, draft, unsubscribeUrl, siteUrl, regionSlug } = input;
  const region = regions.find((r) => r.slug === regionSlug);
  const dep = region?.departments.find((d) => d.code === draft.departmentCode);
  const txLabel =
    draft.transactionType === "murs_fonds"
      ? "murs et fonds"
      : draft.transactionType === "fonds"
        ? "fonds de commerce"
        : "murs seuls";
  return [
    `${siteConfig.name} — Votre estimation confidentielle`,
    ``,
    `Entre ${formatEurosRange(low, high)}`,
    `Pour un hôtel de ${draft.roomCount} chambres, ${draft.starRating ? draft.starRating + " étoiles" : "non classé"}${dep ? ", dans le " + dep.name : ""}, ${txLabel}.`,
    ``,
    `Méthode : ${methodUsed === "blended" ? "combinaison EBITDA + prix par chambre" : "prix par chambre (fourchette élargie)"}.`,
    ``,
    `Trois facteurs déterminants :`,
    `1. La qualité réelle de votre exploitation.`,
    `2. L'état du bien et les travaux à prévoir.`,
    `3. Le contexte local et la saisonnalité.`,
    ``,
    `Guide : ${siteUrl}/guides/vendre-son-hotel-etapes`,
    region ? `Prix dans votre région : ${siteUrl}/prix-hotel/${region.slug}` : "",
    ``,
    `Cette estimation est indicative et ne remplace pas l'expertise d'un professionnel.`,
    ``,
    `Se désabonner : ${unsubscribeUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildUnsubscribeConfirmationHtml(email: string): string {
  return `<!doctype html><html lang="fr"><body style="font-family:Helvetica,Arial,sans-serif;padding:32px;">
<p>Bonjour,</p>
<p>Votre adresse <strong>${esc(email)}</strong> a bien été retirée de nos envois.</p>
<p>Vous ne recevrez plus d'emails de notre part.</p>
<p style="color:#666;font-size:12px;">${esc(siteConfig.name)}</p>
</body></html>`;
}

export function buildAdminNotificationHtml(input: {
  id: string;
  low: number;
  high: number;
  draft: EstimationDraft;
  saleIntent: string;
}): string {
  const { id, low, high, draft, saleIntent } = input;
  return `<!doctype html><html><body style="font-family:Helvetica,Arial,sans-serif;">
<h2>Nouveau lead qualifié</h2>
<ul>
  <li>ID : ${esc(id)}</li>
  <li>Fourchette : ${esc(formatEurosRange(low, high))}</li>
  <li>Intent : <strong>${esc(saleIntent)}</strong></li>
  <li>Email : ${esc(draft.email ?? "")}</li>
  <li>Téléphone : ${esc(draft.phone ?? "—")}</li>
  <li>Nom : ${esc((draft.firstName ?? "") + " " + (draft.lastName ?? ""))}</li>
  <li>Région : ${esc(draft.regionSlug ?? "")} / dép ${esc(draft.departmentCode ?? "")}</li>
  <li>Chambres : ${draft.roomCount} — ${draft.starRating ?? 0}★</li>
  <li>Transaction : ${esc(draft.transactionType ?? "")}</li>
</ul></body></html>`;
}

export function buildAccessLinkHtml(link: string): string {
  return `<!doctype html><html lang="fr"><body style="font-family:Helvetica,Arial,sans-serif;padding:32px;">
<p>Bonjour,</p>
<p>Vous avez demandé à accéder à vos données personnelles conservées par ${esc(siteConfig.name)}.</p>
<p><a href="${esc(link)}" style="color:#0f3057;">Accéder à mes données</a></p>
<p>Ce lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
</body></html>`;
}
