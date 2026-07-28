import type { Guide } from "./types";

export const guide: Guide = {
  slug: "ebitda-revpar-hotellerie",
  title: "Comprendre l'EBITDA et le RevPAR en hôtellerie",
  description:
    "Deux indicateurs incontournables pour valoriser et piloter un hôtel : ce qu'ils mesurent, comment on les calcule, et pourquoi un acquéreur les regarde avant le chiffre d'affaires.",
  readingMinutes: 8,
  updatedAt: "2026-07-01",
  tags: ["EBITDA", "RevPAR", "indicateurs"],
  body: [
    {
      type: "p",
      text: "Quand un professionnel de la transaction ouvre le dossier d'un hôtel, il ne s'arrête pas au chiffre d'affaires. Deux indicateurs vont concentrer son attention : l'EBITDA, qui mesure la rentabilité d'exploitation, et le RevPAR, qui mesure la performance commerciale. Bien les comprendre — et surtout savoir les calculer correctement sur son propre établissement — change la manière d'aborder une valorisation.",
    },
    { type: "h2", id: "ebitda-definition", text: "L'EBITDA, ou l'excédent brut d'exploitation retraité" },
    {
      type: "p",
      text: "L'EBITDA (earnings before interest, taxes, depreciation and amortization) mesure ce que l'établissement génère par son exploitation courante, avant charges financières, impôts sur les bénéfices, amortissements et provisions. En comptabilité française, il correspond approximativement à l'excédent brut d'exploitation (EBE), auquel on applique des retraitements usuels pour rendre le résultat comparable d'un établissement à l'autre.",
    },
    {
      type: "p",
      text: "Concrètement, on part du résultat d'exploitation, on rajoute les dotations aux amortissements et aux provisions, et l'on obtient un premier chiffre. On lui applique ensuite les retraitements — c'est là que se joue l'essentiel.",
    },
    { type: "h2", id: "retraitements", text: "Les retraitements qui comptent" },
    {
      type: "p",
      text: "Trois retraitements reviennent presque systématiquement dans une analyse de valorisation.",
    },
    {
      type: "p",
      text: "La rémunération du dirigeant, d'abord. Un exploitant qui se paie peu — voire pas — abaisse artificiellement ses charges et gonfle son résultat. Un acquéreur devra rémunérer un dirigeant à sa juste valeur ; il faut donc réintégrer une rémunération de marché dans les charges. À l'inverse, un dirigeant qui s'attribue une rémunération très supérieure aux standards du secteur pourra retraiter à la baisse.",
    },
    {
      type: "p",
      text: "Le loyer, ensuite. Si vous êtes propriétaire des murs, votre compte de résultat ne fait pas apparaître de loyer — vous captez la rentabilité immobilière en plus de la rentabilité d'exploitation. Un acquéreur qui n'achèterait que le fonds devra payer un loyer ; il faut donc simuler ce loyer et le retrancher de l'EBITDA pour obtenir un chiffre comparable à celui d'un fonds en location. Cette opération, très fréquente, s'appelle le retraitement du loyer implicite.",
    },
    {
      type: "p",
      text: "Les éléments exceptionnels, enfin. Une année marquée par une indemnité d'assurance, un litige résolu, une subvention ponctuelle ou une opération immobilière annexe doit être expurgée de ces éléments pour restituer une rentabilité récurrente.",
    },
    {
      type: "callout",
      title: "Ordre de grandeur",
      text: "Sur les hôtels bien exploités du marché français, l'EBITDA représente couramment 25 % à 35 % du chiffre d'affaires. En dessous, il faut chercher pourquoi (sous-performance commerciale, structure de coûts atypique, retraitements manquants). Au-dessus, méfiance : les retraitements ont peut-être été trop optimistes.",
    },
    { type: "h2", id: "revpar-definition", text: "Le RevPAR : la performance en une seule ligne" },
    {
      type: "p",
      text: "Le RevPAR (revenue per available room) est le revenu moyen généré par chambre disponible sur une période donnée. Sa formule est simple : RevPAR = taux d'occupation × prix moyen. On peut aussi le calculer directement en divisant le chiffre d'affaires hébergement par le nombre de chambres disponibles.",
    },
    {
      type: "p",
      text: "Cet indicateur combine les deux leviers commerciaux d'un hôtel : la capacité à remplir (taux d'occupation) et la capacité à vendre cher (prix moyen). Deux établissements peuvent avoir un taux d'occupation identique mais un RevPAR très différent parce que l'un pratique un prix moyen supérieur ; à l'inverse, deux hôtels au même prix moyen se différencient par leur taux d'occupation.",
    },
    { type: "h2", id: "revpar-reperes", text: "Repères de RevPAR sur le marché français" },
    {
      type: "p",
      text: "Les niveaux de RevPAR varient énormément selon la localisation, le classement et la saisonnalité. À titre d'ordres de grandeur nationaux publiés régulièrement par les organismes de suivi de l'hôtellerie française : le RevPAR moyen français se situe autour de 85 €, celui du Grand Paris autour de 115 €, et celui de Paris intramuros dépasse fréquemment 180 €. Ces chiffres ne sont pas des cibles individuelles : votre RevPAR se compare surtout à celui d'un panel restreint d'établissements réellement concurrents (même gamme, même bassin, même saisonnalité).",
    },
    {
      type: "p",
      text: "Un RevPAR en progression trois années de suite est un signal fort pour un acquéreur : la valeur commerciale de l'établissement s'améliore. Un RevPAR en repli, à l'inverse, appelle une explication (concurrence nouvelle, positionnement daté, travaux à faire) ; sans explication convaincante, il devient un motif de décote.",
    },
    { type: "h2", id: "pourquoi", text: "Pourquoi un acquéreur regarde ces indicateurs avant tout" },
    {
      type: "p",
      text: "Le chiffre d'affaires brut ne dit rien de la rentabilité — un hôtel avec beaucoup de revenus peut être mal géré, sous-marginalisé, ou dépendant d'un canal de distribution coûteux. L'EBITDA restitue ce qui reste à l'exploitant une fois payées les charges courantes ; c'est cette somme que l'acquéreur récupérera, mois après mois, une fois la transaction faite. Le RevPAR isole la performance commerciale sans se laisser tromper par la taille de l'établissement ; il permet de comparer honnêtement.",
    },
    {
      type: "p",
      text: "En pratique, l'analyse d'un dossier commence presque toujours par regarder le RevPAR sur trois ans (est-ce que ça monte, descend, stagne ?), puis à calculer un EBITDA retraité (que reste-t-il vraiment ?), puis à appliquer un multiple d'EBITDA de référence pour obtenir une première fourchette. Cette fourchette est ensuite corrigée par le prix par chambre observé sur la zone, par la valeur de l'immobilier lorsqu'il est inclus, et par les particularités du bâti et de l'exploitation.",
    },
    { type: "h2", id: "pratique", text: "Ce que vous pouvez faire dès aujourd'hui" },
    {
      type: "ul",
      items: [
        "Calculez votre RevPAR mensuel sur les trois derniers exercices, séparément pour la basse et la haute saison si vous êtes très saisonnier.",
        "Établissez un EBITDA retraité en documentant chaque retraitement (rémunération du dirigeant, loyer implicite, exceptionnels).",
        "Comparez votre part d'EBITDA dans le chiffre d'affaires aux ordres de grandeur du secteur, et cherchez à comprendre les écarts.",
        "Suivez ces deux indicateurs mois par mois — c'est un outil de pilotage utile, indépendamment de tout projet de cession.",
      ],
    },
    {
      type: "p",
      text: "Notre outil d'estimation utilise l'EBITDA lorsque vous le renseignez ; si vous ne le connaissez pas encore précisément, il peut l'estimer à partir du chiffre d'affaires en appliquant une part typique du secteur. La fourchette produite est plus précise lorsque vous fournissez un EBITDA calculé et retraité par vos soins.",
    },
  ],
};
