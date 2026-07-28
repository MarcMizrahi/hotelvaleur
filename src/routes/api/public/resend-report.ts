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
        if (error || !est) return new Response("Not found", { status: 404 });

        const result = await sendEstimationReport({
          estimationId: est.id,
          email: est.email,
          low: Number(est.value_low_cents),
          high: Number(est.value_high_cents),
          methodUsed: est.method_used,
          regionSlug: est.region_slug,
          saleIntent: est.sale_intent,
          draft: {
            regionSlug: est.region_slug,
            departmentCode: est.department_code,
            city: est.city ?? undefined,
            transactionType: est.transaction_type as never,
            roomCount: est.room_count,
            starRating: est.star_rating,
            isIndependent: est.is_independent,
            hasRestaurant: est.has_restaurant,
            hasLicence4: est.has_licence_4,
            worksNeeded: (est.works_needed ?? undefined) as never,
            annualRevenueCents: est.annual_revenue_cents ? Number(est.annual_revenue_cents) : undefined,
            ebitdaCents: est.ebitda_cents ? Number(est.ebitda_cents) : undefined,
            occupancyRate: est.occupancy_rate ? Number(est.occupancy_rate) : undefined,
            firstName: est.first_name ?? undefined,
            lastName: est.last_name ?? undefined,
            email: est.email,
            phone: est.phone ?? undefined,
            consentContact: est.consent_contact,
            consentMarketing: est.consent_marketing,
            saleIntent: est.sale_intent as never,
          },
        });
        return Response.json(result);
      },
    },
  },
});
