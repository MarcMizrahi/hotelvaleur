import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { signToken, verifyToken } from "@/lib/hmac.server";

// --- Envoi du lien d'accès à ses données ---
export const requestDataAccess = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().email().max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();
    const exp = Math.floor(Date.now() / 1000) + 24 * 3600;
    const token = signToken({ purpose: "data-access", subject: email, exp });
    const siteUrl = process.env.SITE_URL ?? "https://example.fr";
    const link = `${siteUrl}/mes-donnees/acces?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

    const { sendEmail } = await import("@/lib/email.server");
    const { buildAccessLinkHtml } = await import("@/lib/email-templates.server");
    await sendEmail({
      to: email,
      subject: "Accéder à mes données personnelles",
      html: buildAccessLinkHtml(link),
      text: `Accéder à mes données : ${link}\nCe lien est valable 24 heures.`,
    });
    // Toujours renvoyer un succès générique (ne pas révéler l'existence d'un compte).
    return { ok: true };
  });

// --- Export ---
export const exportMyData = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ email: z.string().email().max(200), token: z.string().min(10).max(1000) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();
    const payload = verifyToken(data.token, "data-access");
    if (!payload || payload.subject !== email) {
      throw new Error("Lien invalide ou expiré.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("estimation")
      .select("*")
      .eq("email", email);
    if (error) throw new Error("Lecture impossible.");
    return { estimations: rows ?? [] };
  });

// --- Suppression ---
export const deleteMyData = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ email: z.string().email().max(200), token: z.string().min(10).max(1000) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();
    const payload = verifyToken(data.token, "data-access");
    if (!payload || payload.subject !== email) {
      throw new Error("Lien invalide ou expiré.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delErr } = await supabaseAdmin
      .from("estimation")
      .delete()
      .eq("email", email);
    if (delErr) throw new Error("Suppression impossible.");
    await supabaseAdmin
      .from("unsubscribe")
      .upsert({ email, reason: "rgpd_deletion" }, { onConflict: "email" });
    return { ok: true };
  });

// --- Désabonnement ---
export const unsubscribeEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().email().max(200),
        token: z.string().min(10).max(1000),
        reason: z.string().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase().trim();
    const payload = verifyToken(data.token, "unsubscribe");
    if (!payload || payload.subject !== email) {
      throw new Error("Lien invalide ou expiré.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("unsubscribe")
      .upsert({ email, reason: data.reason ?? null }, { onConflict: "email" });

    const { sendEmail } = await import("@/lib/email.server");
    const { buildUnsubscribeConfirmationHtml } = await import(
      "@/lib/email-templates.server"
    );
    await sendEmail({
      to: email,
      subject: "Confirmation de désabonnement",
      html: buildUnsubscribeConfirmationHtml(email),
      text: `Votre adresse ${email} a bien été retirée de nos envois.`,
    });
    return { ok: true };
  });
