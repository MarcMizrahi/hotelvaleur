/**
 * Email sending via Resend. Server-only.
 * Graceful no-op with clear logging when RESEND_API_KEY is not set.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
  skipped?: boolean;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromDefault = process.env.EMAIL_FROM ?? "HotelValeur <onboarding@resend.dev>";
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY missing — email not sent to", payload.to);
    return { ok: false, skipped: true, error: "RESEND_API_KEY not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: payload.from ?? fromDefault,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: data.message ?? `HTTP ${res.status}` };
    return { ok: true, providerId: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
