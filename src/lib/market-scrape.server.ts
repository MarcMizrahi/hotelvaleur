/**
 * Veille hebdomadaire des transactions hôtelières françaises.
 *
 * Pipeline :
 *   1. Recherche Firecrawl (via le gateway Lovable) sur la presse hôtelière
 *      spécialisée et les communiqués de conseils / brokers.
 *   2. Extraction structurée des transactions par le gateway IA Lovable.
 *   3. Insertion en base avec statut `pending` — un admin valide avant que
 *      la donnée n'alimente les benchmarks.
 */

import { regions, getRegionByDepartmentCode } from "@/lib/regions";

const FIRECRAWL_GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";

/** Presse hôtelière FR + conseils / brokers. */
export const SOURCES: Array<{ name: string; domain: string }> = [
  { name: "Hospitality ON", domain: "hospitality-on.com" },
  { name: "L'Hôtellerie Restauration", domain: "lhotellerie-restauration.fr" },
  { name: "Business Immo", domain: "businessimmo.com" },
  { name: "Journal des Palaces", domain: "journaldespalaces.com" },
  { name: "Christie & Co", domain: "christie.com" },
  { name: "In Extenso THL", domain: "inextenso-tourismehotellerierestauration.com" },
  { name: "MKG Consulting", domain: "mkg-consulting.com" },
  { name: "CBRE Hotels", domain: "cbre.fr" },
];

const QUERY_TERMS = [
  "cession hôtel",
  "acquisition hôtel France",
  "vente hôtel transaction chambres",
];

interface SearchHit {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
  sourceName: string;
}

export interface ExtractedTransaction {
  hotel_name: string | null;
  city: string | null;
  department_code: string | null;
  star_rating: number | null;
  room_count: number | null;
  transaction_type: "murs" | "fonds" | "murs_fonds" | null;
  price_eur: number | null;
  buyer: string | null;
  seller: string | null;
  published_date: string | null;
  excerpt: string | null;
  confidence: number;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

async function firecrawlSearch(query: string): Promise<SearchHit[]> {
  const res = await fetch(`${FIRECRAWL_GATEWAY}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireEnv("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": requireEnv("FIRECRAWL_API_KEY"),
    },
    body: JSON.stringify({
      query,
      limit: 6,
      lang: "fr",
      country: "fr",
      tbs: "qdr:m",
      scrapeOptions: { formats: ["markdown"] },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[scrape] Firecrawl search failed [${res.status}]: ${body}`);
    throw new Error(`Firecrawl search failed [${res.status}]: ${body}`);
  }

  const json = (await res.json()) as {
    data?: Array<{ url?: string; title?: string; description?: string; markdown?: string }>;
  };
  return (json.data ?? [])
    .filter((r): r is { url: string } & typeof r => Boolean(r.url))
    .map((r) => ({
      url: r.url,
      title: r.title,
      description: r.description,
      markdown: r.markdown,
      sourceName:
        SOURCES.find((s) => r.url.includes(s.domain))?.name ??
        new URL(r.url).hostname.replace(/^www\./, ""),
    }));
}

const EXTRACTION_PROMPT = `Tu analyses un article de presse hôtelière française.
Extrais UNIQUEMENT les transactions hôtelières réellement conclues (cession, acquisition, vente).
Ignore les rumeurs, projets, ouvertures, rénovations et articles d'opinion.

Réponds en JSON strict : {"transactions": [...]}. Tableau vide si aucune transaction certaine.

Chaque transaction :
- hotel_name (string|null)
- city (string|null) : commune française
- department_code (string|null) : code département FR à 2 chiffres ("75", "06", "2A"...)
- star_rating (number|null) : 0 à 5
- room_count (number|null)
- transaction_type ("murs" | "fonds" | "murs_fonds" | null)
- price_eur (number|null) : prix total en euros, jamais en millions
- buyer (string|null)
- seller (string|null)
- published_date (string|null) : "YYYY-MM-DD"
- excerpt (string|null) : la phrase source, max 300 caractères
- confidence (number) : 0 à 1, ta certitude que la transaction est réelle et correctement extraite

N'invente aucune valeur : mets null si l'information est absente.`;

async function extractTransactions(hit: SearchHit): Promise<ExtractedTransaction[]> {
  const content = (hit.markdown ?? hit.description ?? "").slice(0, 20000);
  if (content.length < 200) return [];

  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireEnv("LOVABLE_API_KEY")}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: `Titre : ${hit.title ?? ""}\nURL : ${hit.url}\n\n${content}` },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[scrape] AI extraction failed [${res.status}]: ${body}`);
    return [];
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { transactions?: ExtractedTransaction[] };
    return Array.isArray(parsed.transactions) ? parsed.transactions : [];
  } catch {
    console.error("[scrape] AI returned non-JSON payload");
    return [];
  }
}

function resolveRegionSlug(departmentCode: string | null, city: string | null): string | null {
  if (departmentCode) {
    const region = getRegionByDepartmentCode(departmentCode.padStart(2, "0"));
    if (region) return region.slug;
  }
  if (city) {
    const needle = city.toLowerCase();
    for (const region of regions) {
      if (region.departments.some((d) => d.name.toLowerCase() === needle)) return region.slug;
    }
  }
  return null;
}

export interface ScrapeSummary {
  runId: string | null;
  articlesFound: number;
  transactionsInserted: number;
}

export async function runMarketScrape(): Promise<ScrapeSummary> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: run } = await supabaseAdmin
    .from("scrape_run")
    .insert({ sources_count: SOURCES.length, status: "running" })
    .select("id")
    .single();
  const runId = run?.id ?? null;

  let articlesFound = 0;
  let inserted = 0;
  let duplicates = 0;

  try {
    // 1. Une recherche par terme, restreinte aux domaines suivis.
    const domainFilter = SOURCES.map((s) => `site:${s.domain}`).join(" OR ");
    const hits: SearchHit[] = [];
    for (const term of QUERY_TERMS) {
      try {
        hits.push(...(await firecrawlSearch(`${term} (${domainFilter})`)));
      } catch (err) {
        console.error(`[scrape] search "${term}" failed`, err);
      }
    }

    // Déduplication par URL, et on écarte ce qui est déjà en base.
    const byUrl = new Map(hits.map((h) => [h.url, h]));
    const urls = [...byUrl.keys()];
    articlesFound = urls.length;

    const { data: existing } = await supabaseAdmin
      .from("market_transaction")
      .select("source_url")
      .in("source_url", urls.length ? urls : ["__none__"]);
    const known = new Set((existing ?? []).map((r) => r.source_url));

    // 2 + 3. Extraction puis insertion.
    for (const hit of byUrl.values()) {
      if (known.has(hit.url)) continue;
      const transactions = await extractTransactions(hit);
      for (const t of transactions) {
        if ((t.confidence ?? 0) < 0.4) continue;
        const priceCents = t.price_eur != null ? Math.round(t.price_eur * 100) : null;
        const perRoom =
          priceCents != null && t.room_count && t.room_count > 0
            ? Math.round(priceCents / t.room_count)
            : null;

        const { error } = await supabaseAdmin.from("market_transaction").insert({
          source_name: hit.sourceName,
          source_url: hit.url,
          title: hit.title ?? null,
          published_at: t.published_date ?? null,
          hotel_name: t.hotel_name,
          city: t.city,
          department_code: t.department_code,
          region_slug: resolveRegionSlug(t.department_code, t.city),
          star_rating: t.star_rating,
          room_count: t.room_count,
          transaction_type: t.transaction_type,
          price_cents: priceCents,
          price_per_room_cents: perRoom,
          buyer: t.buyer,
          seller: t.seller,
          excerpt: t.excerpt?.slice(0, 300) ?? null,
          confidence: Math.min(1, Math.max(0, t.confidence ?? 0)),
          status: "pending",
        });
        if (!error) {
          inserted += 1;
        } else if (error.code === "23505") {
          // Doublon : même URL, ou même hôtel/date/chambres/prix déjà en base.
          duplicates += 1;
        } else {
          console.error("[scrape] insert failed", error);
        }
        // Une seule transaction par URL (contrainte d'unicité sur source_url).
        break;
      }
    }

    if (runId) {
      await supabaseAdmin
        .from("scrape_run")
        .update({
          finished_at: new Date().toISOString(),
          articles_found: articlesFound,
          transactions_inserted: inserted,
          status: "success",
        })
        .eq("id", runId);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[scrape] run failed", message);
    if (runId) {
      await supabaseAdmin
        .from("scrape_run")
        .update({
          finished_at: new Date().toISOString(),
          articles_found: articlesFound,
          transactions_inserted: inserted,
          status: "error",
          error_message: message.slice(0, 500),
        })
        .eq("id", runId);
    }
    throw err;
  }

  return { runId, articlesFound, transactionsInserted: inserted };
}
