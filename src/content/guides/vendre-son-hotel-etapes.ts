import type { Guide } from "./types";

export const guide: Guide = {
  slug: "vendre-son-hotel-etapes",
  title: "Vendre son hôtel : les étapes et le calendrier",
  description:
    "Préparation, choix du périmètre de cession, mandat, confidentialité, calendrier réaliste : ce qu'il faut anticiper pour vendre un hôtel dans de bonnes conditions.",
  readingMinutes: 10,
  updatedAt: "2026-07-01",
  tags: ["cession", "calendrier", "mandat"],
  body: [
    {
      type: "p",
      text: "Vendre un hôtel n'est pas une transaction ordinaire. C'est une opération patrimoniale, familiale, humaine — et une opération technique qui se prépare bien en amont. La règle empirique la plus utile à retenir est celle du calendrier : une cession hôtelière demande généralement 12 à 18 mois entre la décision et l'acte, et parfois davantage lorsque l'immobilier est complexe ou que la conjoncture se retourne. Cet horizon change la manière d'aborder la préparation.",
    },
    { type: "h2", id: "preparation", text: "Un an avant : la mise en ordre" },
    {
      type: "p",
      text: "La qualité de la vente dépend directement de la qualité des documents que vous mettrez sur la table le jour où un acquéreur sérieux se présentera. Trois chantiers méritent d'être ouverts tôt.",
    },
    {
      type: "p",
      text: "Le premier concerne la comptabilité. Les trois derniers exercices doivent être clairs, retraités si nécessaire (rémunération du dirigeant, loyer implicite si vous détenez les murs, éléments exceptionnels), et présentés de façon à faire ressortir un EBITDA lisible. Un acquéreur juge d'abord une exploitation sur sa rentabilité récurrente ; une comptabilité qui la brouille abaisse mécaniquement la fourchette de prix qu'il est prêt à proposer.",
    },
    {
      type: "p",
      text: "Le deuxième concerne les documents juridiques : bail commercial (échéances, indexations, cessions, dépôt de garantie), autorisations d'exploiter, licences (dont la licence IV s'il y a lieu), classement en cours de validité, contrats fournisseurs et personnels. Toute anomalie découverte en cours de négociation devient un motif de décote — mieux vaut la traiter en amont.",
    },
    {
      type: "p",
      text: "Le troisième concerne la conformité : sécurité incendie et accessibilité (règles ERP), diagnostics techniques, mise en conformité énergétique. Des travaux importants restant à faire ne sont pas rédhibitoires — ils se chiffrent — mais ils doivent être connus et documentés.",
    },
    { type: "h2", id: "perimetre", text: "Choisir le périmètre : murs, fonds, ou les deux" },
    {
      type: "p",
      text: "La décision suivante est stratégique. Vendre uniquement le fonds de commerce vous permet de conserver l'immobilier et d'en percevoir un loyer — c'est un choix patrimonial fréquent lorsque le vendeur a plusieurs enfants ou souhaite préparer sa retraite. Vendre uniquement les murs implique de trouver un exploitant qui reprend l'activité en location, ce qui restreint le marché mais peut convenir à un investisseur institutionnel. Vendre les murs et le fonds ensemble simplifie la transaction et attire un public plus large d'acquéreurs (repreneurs indépendants, chaînes, family offices).",
    },
    {
      type: "p",
      text: "Chaque option a des conséquences fiscales, sociales et juridiques différentes. Il est utile d'en discuter avec votre conseil habituel avant de rédiger le mandat, car le périmètre choisi structure tout le reste : le prix, la nature des acquéreurs, la durée d'accompagnement post-vente.",
    },
    { type: "h2", id: "mandat", text: "Le mandataire et le mandat" },
    {
      type: "p",
      text: "La cession peut se faire de gré à gré, mais dans la majorité des cas elle passe par un mandataire spécialisé, titulaire de la carte professionnelle « transactions sur immeubles et fonds de commerce ». Le mandat écrit précise les biens à céder, le prix demandé, la durée, l'exclusivité éventuelle et la rémunération.",
    },
    {
      type: "p",
      text: "Prenez le temps de choisir. Un mandataire hôtelier expérimenté connaît les acquéreurs actifs sur votre gamme, sait présenter un dossier, protège votre confidentialité et négocie sur les vrais points. Un mandataire généraliste peut afficher votre bien mais rarement structurer une opération complexe. Comparez au moins deux ou trois interlocuteurs, demandez leurs références récentes sur des dossiers comparables, et n'accordez pas d'exclusivité longue avant d'avoir un lien de confiance établi.",
    },
    { type: "h2", id: "confidentialite", text: "Préserver la confidentialité" },
    {
      type: "p",
      text: "Une vente d'hôtel qui s'ébruite peut fragiliser l'exploitation : inquiétude du personnel, questions des fournisseurs, réserve de la clientèle affaires qui négocie des tarifs annuels. Trois mesures simples réduisent le risque : ne jamais nommer l'établissement dans les premières présentations (anonymisation par région, ville seulement, ratio ; photos évitées ou floutées) ; faire signer un engagement de confidentialité aux acquéreurs avant tout dévoilement ; réserver la visite physique à un stade avancé, si possible hors des heures de service, ou justifiée par un prétexte crédible.",
    },
    {
      type: "p",
      text: "L'annonce au personnel se réfléchit également. Un vendeur qui la prépare — moment, message, garanties de reprise, période d'accompagnement — évite un climat anxieux qui pourrait rejaillir sur la valeur d'exploitation en fin de parcours.",
    },
    { type: "h2", id: "etapes", text: "Les grandes étapes jusqu'à la signature" },
    {
      type: "ul",
      items: [
        "Constitution du dossier de présentation : mémorandum d'information, présentation financière retraitée, documents juridiques scannés, plans, photographies.",
        "Diffusion ciblée par le mandataire auprès d'acquéreurs identifiés, puis, si nécessaire, plus large.",
        "Marques d'intérêt écrites, éventuellement précédées d'un engagement de confidentialité.",
        "Visites qualifiées, échanges avec le vendeur, questions techniques.",
        "Lettre d'intention (LOI) fixant le prix, les conditions suspensives, le calendrier.",
        "Audit d'acquisition (comptable, juridique, technique) — souvent quatre à huit semaines.",
        "Rédaction et négociation des actes : promesse ou compromis, avec conditions suspensives (financement, autorisations).",
        "Levée des conditions et signature définitive, transfert d'exploitation, accompagnement.",
      ],
    },
    { type: "h2", id: "calendrier", text: "Un calendrier réaliste : 12 à 18 mois" },
    {
      type: "callout",
      title: "Ce qu'il faut anticiper",
      text: "Douze à dix-huit mois entre la décision et l'acte : trois à six mois de préparation, trois à six mois de commercialisation active jusqu'à une LOI signée, deux à quatre mois d'audit, puis un à trois mois de finalisation. Ces durées s'allongent en cas de complexité (indivision, murs partagés) ou de retournement de marché.",
    },
    {
      type: "p",
      text: "Ce calendrier a une conséquence directe sur votre exploitation : la dernière année précédant la vente compte double. Un chiffre d'affaires en repli, un incident de personnel, une note défavorable sur les plateformes deviennent des sujets d'audit. À l'inverse, une année propre, une trésorerie ordonnée et des indicateurs stables sécurisent la fourchette de prix.",
    },
    { type: "h2", id: "erreurs", text: "Les erreurs les plus fréquentes" },
    {
      type: "ul",
      items: [
        "Surestimer le prix affiché de départ : chaque mois passé sans marque d'intérêt sérieuse abîme la position de négociation. Mieux vaut partir sur une fourchette réaliste, correctement argumentée.",
        "Attendre la dernière année pour préparer le dossier : les retraitements comptables et la mise en conformité prennent du temps.",
        "Négliger la présentation : un mémorandum incomplet ou confus disqualifie l'établissement dès la première lecture.",
        "Sous-estimer l'importance de la confidentialité : une fuite mal gérée peut faire baisser le prix ou décourager un acquéreur.",
        "Confier le mandat sans encadrer la durée d'exclusivité et les modalités de sortie.",
      ],
    },
    {
      type: "p",
      text: "La vente d'un hôtel est un projet long qui récompense la préparation méthodique. Notre outil d'estimation vous permet d'établir tôt une fourchette réaliste, sur laquelle vous pouvez construire votre calendrier et engager les échanges avec les bons interlocuteurs.",
    },
  ],
};
