import { fr } from "@/locales/fr";

/**
 * Minimal translation hook. Returns the FR dictionary. All UI strings
 * must go through this — no hard-coded French text in components.
 */
export function useT() {
  return fr;
}
