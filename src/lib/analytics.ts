import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "hv_session_id";
const ATTR_KEY = "hv_attribution";

export interface Attribution {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = uuid();
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const existing = sessionStorage.getItem(ATTR_KEY);
  if (existing) {
    try {
      return JSON.parse(existing) as Attribution;
    } catch {
      /* fall through */
    }
  }
  const url = new URL(window.location.href);
  const attribution: Attribution = {
    utm_source: url.searchParams.get("utm_source"),
    utm_medium: url.searchParams.get("utm_medium"),
    utm_campaign: url.searchParams.get("utm_campaign"),
    referrer: document.referrer || null,
    landing_page: window.location.pathname,
  };
  sessionStorage.setItem(ATTR_KEY, JSON.stringify(attribution));
  return attribution;
}

export async function track(name: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const attr = captureAttribution();
    await supabase.from("analytics_event").insert({
      name,
      session_id: getSessionId(),
      properties: (properties ?? null) as never,
      path: window.location.pathname,
      utm_source: attr.utm_source ?? null,
      utm_medium: attr.utm_medium ?? null,
      utm_campaign: attr.utm_campaign ?? null,
      referrer: attr.referrer ?? null,
    });
  } catch (err) {
    console.warn("analytics track failed", err);
  }
}
