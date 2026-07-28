/**
 * The 13 metropolitan French regions and their departments.
 * Slugs are URL-safe (kebab-case, no accents).
 * `context` and `departmentContexts` fournissent le texte spécifique
 * utilisé par les pages SEO — pas d'invention chiffrée.
 */

export type Department = {
  code: string;
  name: string;
  slug: string;
};

export type RegionProfile = "urbain" | "littoral" | "montagne" | "rural" | "mixte";

export type Region = {
  slug: string;
  name: string;
  profile: RegionProfile;
  /** 2-3 phrases situant le marché régional (factuel, pas de chiffres inventés). */
  context: string;
  /** 4-5 facteurs propres à la région. */
  factors: string[];
  departments: Department[];
};

const d = (code: string, name: string, slug: string): Department => ({ code, name, slug });

export const regions: Region[] = [
  {
    slug: "auvergne-rhone-alpes",
    name: "Auvergne-Rhône-Alpes",
    profile: "montagne",
    context:
      "Deuxième région hôtelière française par le nombre d'établissements, Auvergne-Rhône-Alpes combine des marchés très différents : les stations alpines, la métropole lyonnaise, les villes thermales du Massif central et les vignobles rhodaniens. Les valorisations reflètent cette diversité, avec des écarts marqués entre saisonnalité de montagne et flux d'affaires urbain.",
    factors: [
      "Proximité et positionnement par rapport aux domaines skiables",
      "Durée réelle de la saison touristique (une ou deux saisons)",
      "Exposition à la clientèle d'affaires lyonnaise ou grenobloise",
      "État du bâti et conformité énergétique en altitude",
      "Présence de thermes, casinos ou équipements sportifs à proximité",
    ],
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
    context:
      "Région de passage sur l'axe Paris-Méditerranée et de tourisme œnologique, la Bourgogne-Franche-Comté présente un marché hôtelier fragmenté : petits établissements ruraux, hôtels d'étape le long des axes, quelques adresses réputées dans les capitales viticoles. Les valorisations dépendent fortement de la fréquentation individuelle et de la clientèle étrangère œnotouristique.",
    factors: [
      "Positionnement œnotouristique (Côte-d'Or, Chablis, Jura)",
      "Exposition à la clientèle de passage sur A6, A31 ou A36",
      "Saisonnalité marquée hors des cœurs viticoles",
      "Ancienneté du bâti et coût des rénovations",
      "Proximité d'un site patrimonial classé UNESCO",
    ],
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
    context:
      "Le marché hôtelier breton est structuré par le littoral et par une clientèle majoritairement française. La saisonnalité y est forte : la valeur d'exploitation dépend directement du nombre de mois pleins et de la capacité à sécuriser une clientèle affaires ou de séminaires hors saison.",
    factors: [
      "Nombre de mois d'exploitation à pleine capacité",
      "Distance au trait de côte et vue mer",
      "Complément affaires / événementiel hors saison",
      "Conformité aux normes de la loi Littoral pour toute extension",
      "Fidélité d'une clientèle britannique ou parisienne récurrente",
    ],
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
    context:
      "Portée par les châteaux de la Loire et la clientèle internationale qu'ils attirent, la région combine une hôtellerie patrimoniale de charme et une hôtellerie économique le long de l'axe ligérien. Les valorisations reflètent l'écart entre les adresses situées à proximité immédiate des sites majeurs et le reste du territoire.",
    factors: [
      "Distance à un château très visité (Chambord, Chenonceau, Amboise)",
      "Part de clientèle internationale et anglophone",
      "Qualité et volume de l'offre de restauration attenante",
      "Ancienneté et classement du bâti (monument historique)",
      "Desserte TGV depuis Paris",
    ],
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
    context:
      "L'hôtellerie corse est extrêmement saisonnière : l'essentiel du chiffre d'affaires se fait sur quatre à cinq mois. Les valorisations sont fortement modulées par la qualité de l'emplacement (front de mer, position sur les axes touristiques du littoral) et par la capacité à maintenir un prix moyen élevé en haute saison.",
    factors: [
      "Front de mer et vue directe",
      "Durée réelle de la saison (fermeture hivernale la plupart du temps)",
      "Prix moyen chambre atteint en juillet et août",
      "Contraintes réglementaires liées à la loi Littoral et au PADDUC",
      "Complexité et coût logistique des travaux",
    ],
    departments: [
      d("2A", "Corse-du-Sud", "corse-du-sud"),
      d("2B", "Haute-Corse", "haute-corse"),
    ],
  },
  {
    slug: "grand-est",
    name: "Grand Est",
    profile: "mixte",
    context:
      "Le Grand Est combine des marchés urbains (Strasbourg, Metz, Nancy, Reims), une hôtellerie de tourisme concentrée en Alsace et sur la route des vins de Champagne, et une hôtellerie d'affaires soutenue par la frontière allemande, suisse et luxembourgeoise.",
    factors: [
      "Exposition à la clientèle transfrontalière",
      "Positionnement sur la route des vins ou le marché de Noël",
      "Saisonnalité liée aux institutions européennes à Strasbourg",
      "Densité de l'offre d'affaires dans les agglomérations",
      "Ancienneté du bâti alsacien et coût des mises aux normes",
    ],
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
    context:
      "Marché majoritairement d'affaires et de passage, structuré par l'axe Paris-Lille-Bruxelles-Londres. La Côte d'Opale ajoute une composante littorale saisonnière. Les valorisations dépendent de la desserte (TGV, autoroute, tunnel) et de la profondeur du bassin économique local.",
    factors: [
      "Desserte TGV et proximité d'un nœud autoroutier",
      "Profondeur du marché affaires (Lille, Arras, Amiens)",
      "Saisonnalité littorale sur la Côte d'Opale",
      "Vieillissement du parc et travaux de mise aux normes",
      "Fréquentation liée aux grands événements récurrents",
    ],
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
    context:
      "Premier marché hôtelier français, Île-de-France concentre la valeur : les prix par chambre y sont les plus élevés du territoire, particulièrement dans Paris intramuros où le prime hôtelier atteint des niveaux comparables aux grandes capitales européennes. Les taux de rendement observés y sont structurellement plus bas.",
    factors: [
      "Position dans Paris intramuros ou en petite / grande couronne",
      "Arrondissement, distance à un pôle d'affaires ou touristique majeur",
      "Classement et positionnement (économique, milieu de gamme, luxe)",
      "Bail commercial, propriété des murs, statut de la copropriété",
      "Desserte transports (métro, RER, gares)",
    ],
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
    context:
      "Marché structuré par la clientèle parisienne de week-end, le tourisme mémoriel (plages du Débarquement) et la clientèle britannique. La saisonnalité est réelle mais moins abrupte que sur la façade atlantique, grâce à un flux de courts séjours toute l'année.",
    factors: [
      "Distance à Paris et accessibilité (A13, ligne Paris–Caen–Cherbourg)",
      "Positionnement sur la Côte Fleurie ou face au tourisme mémoriel",
      "Part de clientèle britannique et néerlandaise",
      "Capacité à capter les courts séjours hors saison",
      "Ancienneté du bâti et conformité énergétique",
    ],
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
    context:
      "Vaste région combinant la façade atlantique (Bassin d'Arcachon, Landes, Pays basque), un arrière-pays viticole et gastronomique (Bordelais, Dordogne) et les Pyrénées. Les valorisations reflètent des marchés très segmentés, avec un littoral porteur et un intérieur plus dépendant de la clientèle individuelle et de la restauration.",
    factors: [
      "Situation littorale ou intérieure",
      "Positionnement œnotouristique bordelais",
      "Exposition à la clientèle espagnole côté Pays basque",
      "Poids de la restauration dans le chiffre d'affaires",
      "Saisonnalité et capacité à ouvrir toute l'année",
    ],
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
    context:
      "L'hôtellerie occitane s'organise autour de trois pôles : le littoral méditerranéen (de la Camargue à la frontière espagnole), les métropoles toulousaine et montpelliéraine, et un arrière-pays touristique important (Cévennes, Pyrénées, sites patrimoniaux). Les valorisations sont fortement modulées par la saisonnalité littorale.",
    factors: [
      "Proximité du littoral méditerranéen ou d'un site majeur (Carcassonne, Lourdes)",
      "Exposition à la clientèle d'affaires toulousaine (aéronautique)",
      "Saisonnalité et durée d'ouverture",
      "Concurrence des résidences de tourisme et de la location saisonnière",
      "État du bâti dans les cœurs de ville historiques",
    ],
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
    context:
      "Marché hôtelier équilibré entre le littoral vendéen et le pôle nantais. La clientèle est majoritairement française, avec une saisonnalité littorale marquée mais atténuée par une hôtellerie d'affaires solide autour de Nantes et d'Angers.",
    factors: [
      "Situation sur le littoral vendéen ou dans une agglomération",
      "Complément affaires / événementiel autour de Nantes",
      "Distance aux plages et à un port de plaisance",
      "Capacité à ouvrir toute l'année",
      "Concurrence forte des campings et résidences de tourisme sur le littoral",
    ],
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
    context:
      "Deuxième marché hôtelier français après l'Île-de-France, la région combine un littoral azuréen à valorisation élevée, une Provence intérieure très touristique et un massif alpin du Sud. Les prix par chambre sur la Côte d'Azur sont parmi les plus hauts du territoire hors Paris.",
    factors: [
      "Front de mer sur la Côte d'Azur et vue directe",
      "Proximité d'un aéroport international (Nice, Marseille)",
      "Positionnement événementiel (Cannes, Monaco)",
      "Saisonnalité et capacité à maintenir un prix moyen élevé",
      "Contraintes patrimoniales et de la loi Littoral",
    ],
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

export function getRegionByDepartmentCode(code: string): Region | undefined {
  return regions.find((r) => r.departments.some((d) => d.code === code));
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
