/**
 * Server-side helper: send the estimation report, log to email_log,
 * mark estimation.report_sent_at, and notify admin on qualified leads.
 * Never throws — always returns a result so the user flow is preserved.
 */

import { signToken } from "@/lib/hmac.server";
import { sendEmail } from "@/lib/email.server";
import {
  buildReportHtml,
  buildReportText,
  buildReportSubject,
  buildAdminNotificationHtml,
} from "@/lib/email-templates.server";
import type { EstimationDraft } from "@/lib/estimation-storage";

export interface SendReportInput {
  estimationId: string;
  email: string;
  low: number;
  high: number;
  methodUsed: string;
  regionSlug: string;
  saleIntent: string;
  draft: EstimationDraft;
}

export async function sendEstimationReport(input: SendReportInput): Promise<{ ok: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const emailLower = input.email.toLowerCase().trim();

  // 1. Unsubscribe check
  const { data: unsub } = await supabaseAdmin
    .from("unsubscribe")
    .select("email")
    .eq("email", emailLower)
    .maybeSingle();
  if (unsub) {
    await supabaseAdmin.from("email_log").insert({
      estimation_id: input.estimationId,
      to_email: emailLower,
      template: "report",
      status: "skipped",
      error_message: "unsubscribed",
    });
    return { ok: false };
  }

  // 2. Signed unsubscribe URL
  const siteUrl = process.env.SITE_URL ?? "https://example.fr";
  const exp = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
  const token = signToken({ purpose: "unsubscribe", subject: emailLower, exp });
  const unsubscribeUrl = `${siteUrl}/desabonnement?email=${encodeURIComponent(emailLower)}&token=${encodeURIComponent(token)}`;

  let brokerageUrl: string | null = null;
  try {
    brokerageUrl = `${siteUrl}/mise-en-relation/${encodeURIComponent(
      signToken({
        purpose: "brokerage",
        subject: input.estimationId,
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
      }),
    )}`;
  } catch (err) {
    console.error("brokerage token signing failed", err);
  }

  // 3. Compose + send
  const subject = buildReportSubject(input.low, input.high);
  const html = buildReportHtml({
    low: input.low,
    high: input.high,
    methodUsed: input.methodUsed,
    draft: input.draft,
    unsubscribeUrl,
    siteUrl,
    regionSlug: input.regionSlug,
    brokerageUrl,
  });
  const text = buildReportText({
    low: input.low,
    high: input.high,
    methodUsed: input.methodUsed,
    draft: input.draft,
    unsubscribeUrl,
    siteUrl,
    regionSlug: input.regionSlug,
    brokerageUrl,
  });

  const result = await sendEmail({ to: emailLower, subject, html, text });

  await supabaseAdmin.from("email_log").insert({
    estimation_id: input.estimationId,
    to_email: emailLower,
    template: "report",
    status: result.ok ? "sent" : result.skipped ? "skipped" : "failed",
    provider_id: result.providerId ?? null,
    error_message: result.error ?? null,
  });

  if (result.ok) {
    await supabaseAdmin
      .from("estimation")
      .update({ report_sent_at: new Date().toISOString() })
      .eq("id", input.estimationId);
  }

  // 4. Admin notification for qualified leads
  if (input.saleIntent === "moins_1_an" || input.saleIntent === "1_a_2_ans") {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `[Lead qualifié] ${input.saleIntent} — ${emailLower}`,
        html: buildAdminNotificationHtml({
          id: input.estimationId,
          low: input.low,
          high: input.high,
          draft: input.draft,
          saleIntent: input.saleIntent,
        }),
        text: `Nouveau lead qualifié : ${emailLower} (${input.saleIntent})`,
      });
    }
  }

  return { ok: result.ok };
}
