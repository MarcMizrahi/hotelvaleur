import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Recherche d'établissement par nom (annuaire ouvert OpenStreetMap / Nominatim).
 * Sert uniquement à pré-remplir la localisation et quelques caractéristiques
 * publiques (classement, nombre de chambres quand il est renseigné).
 * Aucune donnée n'est enregistrée : l'utilisateur reste libre de tout corriger.
 */

export interface HotelSuggestion {
  name: string;
  /** Adresse lisible pour l'affichage dans la liste de suggestions. */
  label: string;
  city?: string;
  postcode?: string;
  departmentCode?: string;
  regionSlug?: string;
  starRating?: number;
  roomCount?: number;
}

function departmentFromPostcode(postcode: string | undefined, city?: string): string | undefined {
  if (!postcode) return undefined;
  const p = postcode.replace(/\s/g, "");
  if (!/^\d{5}$/.test(p)) return undefined;
  const two = p.slice(0, 2);
  if (two === "97" || two === "98") return undefined; // hors France métropolitaine
  if (two === "20") {
    // Corse : 200xx/201xx = Corse-du-Sud (2A), 202xx/206xx = Haute-Corse (2B)
    const third = p[2];
    if (third === "0" || third === "1") return "2A";
    return "2B";
  }
  return two;
}

export const searchHotels = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ query: z.string().min(3).max(120) }).parse(data))
  .handler(async ({ data }): Promise<HotelSuggestion[]> => {
    const { regions } = await import("@/lib/regions");

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", data.query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "fr");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("extratags", "1");
    url.searchParams.set("limit", "8");
    url.searchParams.set("accept-language", "fr");

    let raw: unknown[] = [];
    try {
      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "HotelValeur/1.0 (estimation hoteliere)" },
      });
      if (!res.ok) return [];
      raw = (await res.json()) as unknown[];
    } catch {
      return [];
    }

    const out: HotelSuggestion[] = [];
    for (const item of raw as Array<Record<string, any>>) {
      const cat = String(item.category ?? "");
      const type = String(item.type ?? "");
      const extratags = (item.extratags ?? {}) as Record<string, string>;
      const isLodging =
        cat === "tourism" &&
        ["hotel", "guest_house", "hostel", "motel", "apartment", "chalet"].includes(type);
      if (!isLodging) continue;

      const address = (item.address ?? {}) as Record<string, string>;
      const name = String(item.name ?? "").trim() || String(item.display_name ?? "").split(",")[0];
      if (!name) continue;

      const city = address.city || address.town || address.village || address.municipality;
      const postcode = address.postcode;
      const departmentCode = departmentFromPostcode(postcode, city);
      const region = departmentCode
        ? regions.find((r) => r.departments.some((d) => d.code === departmentCode))
        : undefined;

      const starsRaw = extratags.stars ? Number(String(extratags.stars).replace(/[^\d]/g, "")) : NaN;
      const roomsRaw = extratags.rooms ? Number(String(extratags.rooms).replace(/[^\d]/g, "")) : NaN;

      out.push({
        name,
        label: [city, postcode].filter(Boolean).join(" · ") || String(item.display_name ?? ""),
        city,
        postcode,
        departmentCode,
        regionSlug: region?.slug,
        starRating: Number.isFinite(starsRaw) && starsRaw >= 0 && starsRaw <= 5 ? starsRaw : undefined,
        roomCount: Number.isFinite(roomsRaw) && roomsRaw >= 1 && roomsRaw <= 500 ? roomsRaw : undefined,
      });
      if (out.length >= 6) break;
    }
    return out;
  });
