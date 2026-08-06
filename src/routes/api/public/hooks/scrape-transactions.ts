import { createFileRoute } from "@tanstack/react-router";

/**
 * Veille hebdomadaire des transactions hôtelières.
 * Appelée par le planificateur (pg_cron) avec l'en-tête `apikey`.
 */
export const Route = createFileRoute("/api/public/hooks/scrape-transactions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];

        if (!expected || !provided || provided !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { runMarketScrape } = await import("@/lib/market-scrape.server");
          const summary = await runMarketScrape();
          return Response.json({ success: true, ...summary });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[scrape-transactions] failed", message);
          return new Response(JSON.stringify({ success: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
