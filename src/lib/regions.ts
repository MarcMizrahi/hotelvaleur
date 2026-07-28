/**
 * The 13 metropolitan French regions and their departments.
 * Slugs are URL-safe (kebab-case, no accents).
 */

export type Department = {
  code: string; // INSEE code (e.g. "75", "2A")
  name: string;
  slug: string;
};

export type Region = {
  slug: string;
  name: string;
  /** Broad geographical profile — drives copy on regional pages. */
  profile: "urbain" | "littoral" | "montagne" | "rural" | "mixte";
  departments: Department[];
};

const d = (code: string, name: string, slug: string): Department => ({ code, name, slug });

export const regions: Region[] = [
  {
    slug: "auvergne-rhone-alpes",
    name: "Auvergne-Rhône-Alpes",
    profile: "montagne",
    departments: [
      d("01", "Ain", "ain"),
      d("03", "Allier", "allier"),
      d("07", "Ardèche", "ardeche"),
      d("15", "Cantal", "cantal"),
      d("26", "Drôme", "drome"),
      d("38", "Isère", "isere"),
      d("42", "Loire", "loire"),
      d("43", "Haute-Loire", "haute-loire"),
      d("63", "Puy-de-Dôme", "puy-de-dome"),
      d("69", "Rhône", "rhone"),
      d("73", "Savoie", "savoie"),
      d("74", "Haute-Savoie", "haute-savoie"),
    ],
  },
  {
    slug: "bourgogne-franche-comte",
    name: "Bourgogne-Franche-Comté",
    profile: "rural",
    departments: [
      d("21", "Côte-d'Or", "cote-d-or"),
      d("25", "Doubs", "doubs"),
      d("39", "Jura", "jura"),
      d("58", "Nièvre", "nievre"),
      d("70", "Haute-Saône", "haute-saone"),
      d("71", "Saône-et-Loire", "saone-et-loire"),
      d("89", "Yonne", "yonne"),
      d("90", "Territoire de Belfort", "territoire-de-belfort"),
    ],
  },
  {
    slug: "bretagne",
    name: "Bretagne",
    profile: "littoral",
    departments: [
      d("22", "Côtes-d'Armor", "cotes-d-armor"),
      d("29", "Finistère", "finistere"),
      d("35", "Ille-et-Vilaine", "ille-et-vilaine"),
      d("56", "Morbihan", "morbihan"),
    ],
  },
  {
    slug: "centre-val-de-loire",
    name: "Centre-Val de Loire",
    profile: "rural",
    departments: [
      d("18", "Cher", "cher"),
      d("28", "Eure-et-Loir", "eure-et-loir"),
      d("36", "Indre", "indre"),
      d("37", "Indre-et-Loire", "indre-et-loire"),
      d("41", "Loir-et-Cher", "loir-et-cher"),
      d("45", "Loiret", "loiret"),
    ],
  },
  {
    slug: "corse",
    name: "Corse",
    profile: "littoral",
    departments: [
      d("2A", "Corse-du-Sud", "corse-du-sud"),
      d("2B", "Haute-Corse", "haute-corse"),
    ],
  },
  {
    slug: "grand-est",
    name: "Grand Est",
    profile: "mixte",
    departments: [
      d("08", "Ardennes", "ardennes"),
      d("10", "Aube", "aube"),
      d("51", "Marne", "marne"),
      d("52", "Haute-Marne", "haute-marne"),
      d("54", "Meurthe-et-Moselle", "meurthe-et-moselle"),
      d("55", "Meuse", "meuse"),
      d("57", "Moselle", "moselle"),
      d("67", "Bas-Rhin", "bas-rhin"),
      d("68", "Haut-Rhin", "haut-rhin"),
      d("88", "Vosges", "vosges"),
    ],
  },
  {
    slug: "hauts-de-france",
    name: "Hauts-de-France",
    profile: "mixte",
    departments: [
      d("02", "Aisne", "aisne"),
      d("59", "Nord", "nord"),
      d("60", "Oise", "oise"),
      d("62", "Pas-de-Calais", "pas-de-calais"),
      d("80", "Somme", "somme"),
    ],
  },
  {
    slug: "ile-de-france",
    name: "Île-de-France",
    profile: "urbain",
    departments: [
      d("75", "Paris", "paris"),
      d("77", "Seine-et-Marne", "seine-et-marne"),
      d("78", "Yvelines", "yvelines"),
      d("91", "Essonne", "essonne"),
      d("92", "Hauts-de-Seine", "hauts-de-seine"),
      d("93", "Seine-Saint-Denis", "seine-saint-denis"),
      d("94", "Val-de-Marne", "val-de-marne"),
      d("95", "Val-d'Oise", "val-d-oise"),
    ],
  },
  {
    slug: "normandie",
    name: "Normandie",
    profile: "littoral",
    departments: [
      d("14", "Calvados", "calvados"),
      d("27", "Eure", "eure"),
      d("50", "Manche", "manche"),
      d("61", "Orne", "orne"),
      d("76", "Seine-Maritime", "seine-maritime"),
    ],
  },
  {
    slug: "nouvelle-aquitaine",
    name: "Nouvelle-Aquitaine",
    profile: "mixte",
    departments: [
      d("16", "Charente", "charente"),
      d("17", "Charente-Maritime", "charente-maritime"),
      d("19", "Corrèze", "correze"),
      d("23", "Creuse", "creuse"),
      d("24", "Dordogne", "dordogne"),
      d("33", "Gironde", "gironde"),
      d("40", "Landes", "landes"),
      d("47", "Lot-et-Garonne", "lot-et-garonne"),
      d("64", "Pyrénées-Atlantiques", "pyrenees-atlantiques"),
      d("79", "Deux-Sèvres", "deux-sevres"),
      d("86", "Vienne", "vienne"),
      d("87", "Haute-Vienne", "haute-vienne"),
    ],
  },
  {
    slug: "occitanie",
    name: "Occitanie",
    profile: "mixte",
    departments: [
      d("09", "Ariège", "ariege"),
      d("11", "Aude", "aude"),
      d("12", "Aveyron", "aveyron"),
      d("30", "Gard", "gard"),
      d("31", "Haute-Garonne", "haute-garonne"),
      d("32", "Gers", "gers"),
      d("34", "Hérault", "herault"),
      d("46", "Lot", "lot"),
      d("48", "Lozère", "lozere"),
      d("65", "Hautes-Pyrénées", "hautes-pyrenees"),
      d("66", "Pyrénées-Orientales", "pyrenees-orientales"),
      d("81", "Tarn", "tarn"),
      d("82", "Tarn-et-Garonne", "tarn-et-garonne"),
    ],
  },
  {
    slug: "pays-de-la-loire",
    name: "Pays de la Loire",
    profile: "littoral",
    departments: [
      d("44", "Loire-Atlantique", "loire-atlantique"),
      d("49", "Maine-et-Loire", "maine-et-loire"),
      d("53", "Mayenne", "mayenne"),
      d("72", "Sarthe", "sarthe"),
      d("85", "Vendée", "vendee"),
    ],
  },
  {
    slug: "provence-alpes-cote-d-azur",
    name: "Provence-Alpes-Côte d'Azur",
    profile: "littoral",
    departments: [
      d("04", "Alpes-de-Haute-Provence", "alpes-de-haute-provence"),
      d("05", "Hautes-Alpes", "hautes-alpes"),
      d("06", "Alpes-Maritimes", "alpes-maritimes"),
      d("13", "Bouches-du-Rhône", "bouches-du-rhone"),
      d("83", "Var", "var"),
      d("84", "Vaucluse", "vaucluse"),
    ],
  },
];

export function getRegionBySlug(slug: string): Region | undefined {
  return regions.find((r) => r.slug === slug);
}

export function getDepartmentBySlug(
  regionSlug: string,
  departmentSlug: string,
): { region: Region; department: Department } | undefined {
  const region = getRegionBySlug(regionSlug);
  if (!region) return undefined;
  const department = region.departments.find((d) => d.slug === departmentSlug);
  if (!department) return undefined;
  return { region, department };
}

export function allDepartments(): Array<{ region: Region; department: Department }> {
  return regions.flatMap((region) =>
    region.departments.map((department) => ({ region, department })),
  );
}
