/**
 * Email sending — Lovable Emails (managed).
 *
 * This is a stub until the sender domain is configured and the Lovable
 * email templates are scaffolded. Callers keep working; sends are skipped
 * with a clear log line instead of hitting any third-party provider.
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
  console.warn(
    "[email] Lovable Emails not configured yet — email not sent to",
    payload.to,
  );
  return {
    ok: false,
    skipped: true,
    error: "Lovable Emails not configured (sender domain pending setup)",
  };
}
