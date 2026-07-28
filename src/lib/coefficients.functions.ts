import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Coefficient } from "@/lib/valuation";

/**
 * Récupère les 6 coefficients (1 à 5 étoiles + 0) d'une région.
 * Lecture publique — les données de coefficients sont un référentiel de marché,
 * elles sont utilisées pour rendre les pages SEO côté serveur.
 */
export const getRegionCoefficients = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ regionSlug: z.string().min(1).max(80) }).parse(data),
  )
  .handler(async ({ data }): Promise<Coefficient[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("valuation_coefficient")
      .select(
        "region_slug, star_rating, ebitda_multiple_low, ebitda_multiple_high, price_per_room_low_cents, price_per_room_high_cents",
      )
      .eq("region_slug", data.regionSlug)
      .order("star_rating", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      region_slug: r.region_slug,
      star_rating: r.star_rating,
      ebitda_multiple_low: Number(r.ebitda_multiple_low),
      ebitda_multiple_high: Number(r.ebitda_multiple_high),
      price_per_room_low_cents: Number(r.price_per_room_low_cents),
      price_per_room_high_cents: Number(r.price_per_room_high_cents),
    }));
  });
