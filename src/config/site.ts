export const site = {
  name: "HotelValeur",
  tagline: "Estimez la valeur de votre hôtel",
  /**
   * URL publique canonique (sitemap, balises canoniques, JSON-LD, liens des emails).
   * Côté serveur, la variable d'environnement SITE_URL a priorité (voir getSiteUrl).
   * À mettre à jour si un nom de domaine personnalisé est branché.
   */
  url: "https://hotelvaleur.lovable.app",
  contactEmail: "contact@example.fr",
} as const;

export type SiteConfig = typeof site;

/**
 * URL publique du site, sans slash final.
 * Utilise SITE_URL (serveur) si défini, sinon `site.url`.
 */
export function getSiteUrl(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env ? process.env.SITE_URL?.trim() : undefined;
  return (fromEnv || site.url).replace(/\/+$/, "");
}
