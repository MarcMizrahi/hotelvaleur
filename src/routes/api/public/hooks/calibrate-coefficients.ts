import { createFileRoute } from "@tanstack/react-router";

/**
 * Calibrage continu des coefficients de valorisation.
 * Appelé par le planificateur (pg_cron) avec l'en-tête `apikey`.
 */
export const Route = createFileRoute("/api/public/hooks/calibrate-coefficients")({
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
          const { runCalibration } = await import("@/lib/calibration.server");
          const result = await runCalibration({ apply: true, mode: "auto", actor: "cron" });
          return Response.json({
            success: true,
            segmentsConsidered: result.segmentsConsidered,
            segmentsAdjusted: result.segmentsAdjusted,
            transactionsUsed: result.transactionsUsed,
            runId: result.runId,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[calibrate-coefficients] failed", message);
          return new Response(JSON.stringify({ success: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
