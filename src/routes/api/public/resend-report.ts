import { createFileRoute } from "@tanstack/react-router";
import { sendEmail } from "@/lib/email.server";

const ONE_SHOT_TOKEN = "hv-resend-9pT2mQx7Kv3nR8yL4bH1zW6cJ0dF5gS";

export const Route = createFileRoute("/api/public/resend-report")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("token") !== ONE_SHOT_TOKEN) {
          return new Response("Forbidden", { status: 403 });
        }
        const id = url.searchParams.get("id");
        if (!id) return new Response("Missing id", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: est, error } = await supabaseAdmin
          .from("estimation")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error || !est) return Response.json({ ok: false, stage: "lookup", error: error?.message }, { status: 404 });

        const result = await sendEmail({
          to: est.email,
          subject: `Votre estimation HotelValeur — ${est.city ?? est.department_code}`,
          html: `<div style="font-family:Inter,Arial,sans-serif;padding:24px;color:#1a1a1a">
            <h1 style="color:#0b1f3a">Votre estimation HotelValeur</h1>
            <p>Bonjour,</p>
            <p>Voici l'estimation de votre hôtel situé à ${est.city ?? ""} (${est.department_code}) :</p>
            <p style="font-size:20px;font-weight:600;color:#0b1f3a">
              ${(Number(est.value_low_cents)/100).toLocaleString("fr-FR")} € — ${(Number(est.value_high_cents)/100).toLocaleString("fr-FR")} €
            </p>
            <p>Méthode : ${est.method_used}. ${est.room_count} chambres, ${est.star_rating}★.</p>
            <p style="color:#666;font-size:12px;margin-top:32px">Estimation à titre indicatif — HotelValeur.</p>
          </div>`,
          text: `Estimation HotelValeur : ${(Number(est.value_low_cents)/100).toLocaleString("fr-FR")} € — ${(Number(est.value_high_cents)/100).toLocaleString("fr-FR")} €`,
        });

        const { error: logErr } = await supabaseAdmin.from("email_log").insert({
          estimation_id: est.id,
          to_email: est.email,
          template: "report",
          status: result.ok ? "sent" : result.skipped ? "skipped" : "failed",
          provider_id: result.providerId ?? null,
          error_message: result.error ?? null,
        });
        if (result.ok) {
          await supabaseAdmin.from("estimation").update({ report_sent_at: new Date().toISOString() }).eq("id", est.id);
        }

        return Response.json({ result, logInsertError: logErr?.message });
      },
    },
  },
});
