import { createFileRoute } from "@tanstack/react-router";

/**
 * Veille hebdomadaire des transactions hôtelières.
 * Appelée par le planificateur (pg_cron) avec l'en-tête `x-cron-secret`.
 */
export const Route = createFileRoute("/api/public/hooks/scrape-transactions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorizedCronRequestAsync, unauthorizedResponse } =
          await import("@/lib/cron-auth.server");
        if (!(await isAuthorizedCronRequestAsync(request.headers))) {
          return unauthorizedResponse();
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
