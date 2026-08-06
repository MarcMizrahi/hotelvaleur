/**
 * Logique serveur de la mise en relation broker : attribution d'un agent,
 * journalisation et emails. Server-only.
 */

import { sendEmail } from "@/lib/email.server";
import {
  selectAgent,
  horizonLabel,
  operationLabel,
  type AgentRow,
  type MatchCriteria,
} from "@/lib/brokerage-matching";
import { formatEurosRange } from "@/lib/money";

function siteUrl(): string {
  return process.env.SITE_URL ?? "https://true-view-showcase.lovable.app";
}

export interface EstimationSummary {
  id: string;
  hotel_name: string | null;
  city: string | null;
  region_slug: string;
  department_code: string;
  room_count: number;
  star_rating: number;
  transaction_type: string;
  value_low_cents: number;
  value_high_cents: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

export interface LeadRecord {
  id: string;
  sale_horizon: string;
  operation_type: string;
  has_mandate: boolean;
  confidential: boolean;
  availability: string | null;
  phone: string | null;
  message: string | null;
}

/** Attribue automatiquement un agent au lead (best-effort, ne throw jamais). */
export async function autoAssignAgent(
  leadId: string,
  criteria: MatchCriteria,
): Promise<{ agent: AgentRow | null; reason: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: agents } = await supabaseAdmin
    .from("broker_agent")
    .select(
      "id, full_name, company, email, regions, star_ratings, transaction_types, min_rooms, max_rooms, monthly_capacity, is_active",
    )
    .eq("is_active", true);

  const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from("brokerage_lead")
    .select("agent_id, assigned_at")
    .not("agent_id", "is", null)
    .gte("assigned_at", since);

  const load: Record<string, number> = {};
  const lastAssigned: Record<string, number> = {};
  for (const r of recent ?? []) {
    const id = r.agent_id as string;
    load[id] = (load[id] ?? 0) + 1;
    const ts = r.assigned_at ? new Date(r.assigned_at).getTime() : 0;
    if (ts > (lastAssigned[id] ?? 0)) lastAssigned[id] = ts;
  }

  const match = selectAgent((agents ?? []) as AgentRow[], criteria, load, lastAssigned);

  if (match.agent) {
    await supabaseAdmin
      .from("brokerage_lead")
      .update({
        agent_id: match.agent.id,
        status: "attribue",
        assigned_at: new Date().toISOString(),
      })
      .eq("id", leadId);
    await supabaseAdmin.from("brokerage_lead_event").insert({
      lead_id: leadId,
      event_type: "assigned",
      to_value: match.agent.id,
      agent_id: match.agent.id,
      detail: `Attribution automatique (${match.reason})`,
      actor: "system",
    });
  } else {
    await supabaseAdmin.from("brokerage_lead_event").insert({
      lead_id: leadId,
      event_type: "unassigned",
      detail: "Aucun agent disponible — attribution manuelle requise",
      actor: "system",
    });
  }
  return { agent: match.agent, reason: match.reason };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ownerHtml(
  est: EstimationSummary,
  lead: LeadRecord,
  agent: AgentRow | null,
): string {
  const who = agent
    ? `<p>Votre interlocuteur : <strong>${esc(agent.full_name)}</strong>${
        agent.company ? ` — ${esc(agent.company)}` : ""
      }. Il vous contactera sous 48&nbsp;heures ouvrées.</p>`
    : `<p>Nous sélectionnons l'expert le plus pertinent pour votre établissement et revenons vers vous sous 48&nbsp;heures ouvrées.</p>`;
  return `<div style="font-family:Arial,sans-serif;color:#0f1c2e;line-height:1.6">
  <h1 style="font-size:20px">Votre demande de mise en relation est enregistrée</h1>
  <p>Bonjour${est.first_name ? ` ${esc(est.first_name)}` : ""},</p>
  ${who}
  <h2 style="font-size:16px">Récapitulatif</h2>
  <ul>
    <li>Établissement : ${esc(est.hotel_name ?? "non précisé")}${est.city ? ` — ${esc(est.city)}` : ""}</li>
    <li>${est.room_count} chambres, ${est.star_rating} étoiles</li>
    <li>Fourchette estimée : ${formatEurosRange(est.value_low_cents, est.value_high_cents)}</li>
    <li>Horizon : ${esc(horizonLabel(lead.sale_horizon))}</li>
    <li>Opération : ${esc(operationLabel(lead.operation_type))}</li>
    ${lead.confidential ? "<li>Vente confidentielle demandée</li>" : ""}
  </ul>
  <p style="font-size:12px;color:#666">Vos coordonnées ne sont partagées qu'avec l'agent sélectionné.</p>
</div>`;
}

function agentHtml(est: EstimationSummary, lead: LeadRecord): string {
  return `<div style="font-family:Arial,sans-serif;color:#0f1c2e;line-height:1.6">
  <h1 style="font-size:20px">Nouveau lead vendeur qualifié</h1>
  <ul>
    <li>Établissement : ${esc(est.hotel_name ?? "non précisé")}${est.city ? ` — ${esc(est.city)}` : ""} (${esc(est.department_code)})</li>
    <li>${est.room_count} chambres, ${est.star_rating} étoiles, ${esc(est.transaction_type)}</li>
    <li>Valorisation indicative : ${formatEurosRange(est.value_low_cents, est.value_high_cents)}</li>
    <li>Horizon : ${esc(horizonLabel(lead.sale_horizon))}</li>
    <li>Opération souhaitée : ${esc(operationLabel(lead.operation_type))}</li>
    <li>Mandat en cours : ${lead.has_mandate ? "oui" : "non"}</li>
    <li>Confidentialité : ${lead.confidential ? "demandée" : "non"}</li>
    <li>Disponibilités : ${esc(lead.availability ?? "non précisées")}</li>
  </ul>
  <h2 style="font-size:16px">Contact</h2>
  <p>${esc([est.first_name, est.last_name].filter(Boolean).join(" ") || "—")}<br/>
  ${esc(est.email)}<br/>${esc(lead.phone ?? est.phone ?? "—")}</p>
  ${lead.message ? `<p><em>${esc(lead.message)}</em></p>` : ""}
  <p><a href="${siteUrl()}/admin/mise-en-relation">Ouvrir dans l'administration</a></p>
</div>`;
}

function toText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Emails propriétaire + agent (best-effort, journalisés dans email_log). */
export async function sendBrokerageEmails(
  est: EstimationSummary,
  lead: LeadRecord,
  agent: AgentRow | null,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const ownerBody = ownerHtml(est, lead, agent);
  const ownerRes = await sendEmail({
    to: est.email,
    subject: "Votre mise en relation avec un expert hôtelier",
    html: ownerBody,
    text: toText(ownerBody),
  });
  await supabaseAdmin.from("email_log").insert({
    estimation_id: est.id,
    to_email: est.email,
    template: "brokerage_owner",
    status: ownerRes.ok ? "sent" : ownerRes.skipped ? "skipped" : "failed",
    provider_id: ownerRes.providerId ?? null,
    error_message: ownerRes.error ?? null,
  });

  if (agent) {
    const agentBody = agentHtml(est, lead);
    const agentRes = await sendEmail({
      to: agent.email,
      subject: `Lead vendeur — ${est.hotel_name ?? est.city ?? est.department_code}`,
      html: agentBody,
      text: toText(agentBody),
      replyTo: est.email,
    });
    await supabaseAdmin.from("email_log").insert({
      estimation_id: est.id,
      to_email: agent.email,
      template: "brokerage_agent",
      status: agentRes.ok ? "sent" : agentRes.skipped ? "skipped" : "failed",
      provider_id: agentRes.providerId ?? null,
      error_message: agentRes.error ?? null,
    });
  }
}
