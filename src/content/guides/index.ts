import type { Guide } from "./types";
import { guide as g1 } from "./combien-vaut-mon-hotel";
import { guide as g2 } from "./vendre-son-hotel-etapes";
import { guide as g3 } from "./ebitda-revpar-hotellerie";

export const guides: Guide[] = [g1, g2, g3];

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export function otherGuides(slug: string): Guide[] {
  return guides.filter((g) => g.slug !== slug).slice(0, 2);
}
