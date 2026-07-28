export const site = {
  name: "HotelValeur",
  tagline: "Estimez la valeur de votre hôtel",
  url: "https://example.fr",
  contactEmail: "contact@example.fr",
} as const;

export type SiteConfig = typeof site;
