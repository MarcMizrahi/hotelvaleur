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
  /** Type d'hébergement OSM (hotel, guest_house…). */
  kind?: string;
  /** Score de confiance 0-100 : correspondance du nom + richesse des données. */
  confidence: number;
}

/** Normalisation simple pour comparer des noms (accents, ponctuation, mots vides). */
function normalizeName(v: string): string {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(hotel|hostellerie|auberge|le|la|les|de|du|des|d|l)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Similarité de tokens (Dice) entre la requête et le nom trouvé, 0-1. */
function nameSimilarity(query: string, candidate: string): number {
  const a = new Set(normalizeName(query).split(" ").filter(Boolean));
  const b = new Set(normalizeName(candidate).split(" ").filter(Boolean));
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return (2 * inter) / (a.size + b.size);
}

function scoreSuggestion(args: {
  query: string;
  name: string;
  kind: string;
  hasCity: boolean;
  hasDepartment: boolean;
  hasStars: boolean;
  hasRooms: boolean;
}): number {
  const sim = nameSimilarity(args.query, args.name);
  let score = 45 * sim;
  // Correspondance exacte (hors mots vides) fortement valorisée
  if (normalizeName(args.query) === normalizeName(args.name)) score += 20;
  if (args.kind === "hotel") score += 12;
  else if (args.kind === "guest_house" || args.kind === "motel") score += 6;
  if (args.hasCity) score += 8;
  if (args.hasDepartment) score += 7;
  if (args.hasStars) score += 5;
  if (args.hasRooms) score += 3;
  return Math.max(1, Math.min(100, Math.round(score)));
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
    url.searchParams.set("limit", "15");
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

      const suggestionStars =
        Number.isFinite(starsRaw) && starsRaw >= 0 && starsRaw <= 5 ? starsRaw : undefined;
      const suggestionRooms =
        Number.isFinite(roomsRaw) && roomsRaw >= 1 && roomsRaw <= 500 ? roomsRaw : undefined;

      out.push({
        name,
        label: [city, postcode].filter(Boolean).join(" · ") || String(item.display_name ?? ""),
        city,
        postcode,
        departmentCode,
        regionSlug: region?.slug,
        starRating: suggestionStars,
        roomCount: suggestionRooms,
        kind: type,
        confidence: scoreSuggestion({
          query: data.query,
          name,
          kind: type,
          hasCity: Boolean(city),
          hasDepartment: Boolean(region),
          hasStars: suggestionStars !== undefined,
          hasRooms: suggestionRooms !== undefined,
        }),
      });
    }
    out.sort((a, b) => b.confidence - a.confidence);
    return out.slice(0, 8);
  });
