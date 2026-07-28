import { createFileRoute } from "@tanstack/react-router";
import { sendEmail } from "@/lib/email.server";

export const Route = createFileRoute("/api/public/test-email")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const to = url.searchParams.get("to");
        const token = url.searchParams.get("token");
        if (token !== process.env.HOTELVALEUR_HMAC_SECRET) {
          return new Response("Forbidden", { status: 403 });
        }
        if (!to) return new Response("Missing 'to'", { status: 400 });
        const result = await sendEmail({
          to,
          subject: "Test HotelValeur — envoi email opérationnel",
          html: `<div style="font-family:Inter,Arial,sans-serif;padding:24px;color:#1a1a1a">
            <h1 style="color:#0b1f3a">HotelValeur — Test d'envoi</h1>
            <p>Ceci est un email de test envoyé depuis la plateforme HotelValeur via Resend.</p>
            <p>Si vous recevez ce message, la configuration email est opérationnelle ✅</p>
            <p style="color:#666;font-size:12px;margin-top:32px">Envoyé automatiquement — aucune action requise.</p>
          </div>`,
          text: "HotelValeur — Test d'envoi. Configuration email opérationnelle.",
        });
        return Response.json(result);
      },
    },
  },
});
