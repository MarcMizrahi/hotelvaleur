import type { Guide } from "./types";

export const guide: Guide = {
  slug: "combien-vaut-mon-hotel",
  title: "Combien vaut mon hôtel ? Les méthodes de valorisation",
  description:
    "Multiple d'EBITDA, prix par chambre, méthode par le rendement : comment sont valorisés les hôtels en France, et pourquoi les résultats varient d'une méthode à l'autre.",
  readingMinutes: 9,
  updatedAt: "2026-07-01",
  tags: ["valorisation", "méthodes", "EBITDA"],
  body: [
    {
      type: "p",
      text: "Toute discussion sérieuse sur la valeur d'un hôtel commence par une distinction que les vendeurs négligent parfois : qu'est-ce qu'on vend, exactement ? Trois configurations coexistent sur le marché français, et elles ne se valorisent pas de la même manière.",
    },
    { type: "h2", id: "murs-fonds", text: "Murs, fonds de commerce, ou les deux" },
    {
      type: "p",
      text: "Les murs, ce sont les locaux — le bâti, le terrain, éventuellement les parkings. Un investisseur peut les acheter sans reprendre l'exploitation ; il perçoit alors un loyer versé par l'exploitant. Le fonds de commerce, c'est l'activité : clientèle, contrats, licences, matériel, personnel. Il se vend seul lorsque le propriétaire n'est pas propriétaire des murs, ou lorsqu'il souhaite conserver l'immobilier. La transaction dite « murs et fonds » cède l'ensemble à un même acquéreur, qui devient à la fois investisseur et exploitant.",
    },
    {
      type: "p",
      text: "Cette distinction est capitale : à situation égale, la valeur d'un fonds seul est nettement inférieure à celle des murs et du fonds réunis, tandis que la valeur des murs seuls dépend surtout du loyer que génère l'exploitation. Les fourchettes affichées sur ce site sont ajustées automatiquement en fonction du type de transaction déclaré.",
    },
    { type: "h2", id: "ebitda", text: "La méthode du multiple d'EBITDA" },
    {
      type: "p",
      text: "C'est la méthode de référence dès qu'un hôtel produit un compte de résultat lisible. L'EBITDA — excédent brut d'exploitation retraité — représente la capacité de l'établissement à générer du cash indépendamment de sa structure financière et fiscale. On le multiplie par un coefficient qui reflète la qualité perçue de l'activité et de son marché.",
    },
    {
      type: "p",
      text: "Les ordres de grandeur observés sur le marché français vont d'environ 4 à 5,5 fois l'EBITDA pour un 1 étoile, à 8 à 11 fois pour un 5 étoiles bien situé. Ces fourchettes sont indicatives et la localisation module fortement le multiple : un 3 étoiles parisien peut atteindre les niveaux d'un 4 étoiles de province, et un établissement isolé sans potentiel de développement se paie moins cher qu'un actif équivalent dans une agglomération dynamique.",
    },
    {
      type: "callout",
      title: "Point d'attention",
      text: "L'EBITDA affiché dans une plaquette de vente est souvent retraité par le vendeur (rémunération du dirigeant, loyer implicite lorsque les murs sont détenus, éléments exceptionnels). Un acquéreur sérieux refera ces retraitements à sa manière — mieux vaut les documenter clairement dès le départ.",
    },
    { type: "h2", id: "prix-chambre", text: "La méthode du prix par chambre" },
    {
      type: "p",
      text: "Plus rustique mais toujours utilisée, elle consiste à multiplier le nombre de chambres par un prix unitaire de référence, calibré par le classement et la région. Elle a un mérite : elle fonctionne même sans compte de résultat, ce qui est utile pour les hôtels dont l'exploitation a été perturbée (fermeture, changement de dirigeant, période post-Covid). Elle a une limite : elle ignore la performance réelle. Deux hôtels de 30 chambres identiques sur le papier peuvent générer des EBITDA très différents et ne pas valoir la même somme.",
    },
    {
      type: "p",
      text: "Notre moteur croise systématiquement les deux méthodes lorsque le chiffre d'affaires ou l'EBITDA sont renseignés : la fourchette finale est une moyenne pondérée, avec un poids plus important donné à la méthode du multiple d'EBITDA (plus fine), et une méthode d'élargissement lorsque les deux approches divergent trop fortement — un signal important à discuter en expertise.",
    },
    { type: "h2", id: "rendement", text: "La méthode par le rendement" },
    {
      type: "p",
      text: "Utilisée surtout par les investisseurs qui achètent les murs, elle consiste à diviser le loyer net attendu par un taux de rendement de marché. Les taux observés en France se situent globalement entre 5 % et 8 %, avec des niveaux plus bas — de l'ordre de 4,75 % à 5,25 % — sur le prime parisien où les investisseurs institutionnels acceptent des rendements comprimés en contrepartie de la sécurité de l'actif.",
    },
    {
      type: "p",
      text: "Cette méthode éclaire une facette différente : elle répond à la question « combien un investisseur est-il prêt à immobiliser pour toucher ce loyer ? » plutôt qu'à « combien vaut cette exploitation ? ». Sur un hôtel murs et fonds, elle sert souvent de contrôle : la valeur totale doit être cohérente avec la valeur qu'un investisseur immobilier attribuerait aux murs si l'exploitation en payait le loyer.",
    },
    { type: "h2", id: "reconcilier", text: "Pourquoi les résultats divergent, et comment les réconcilier" },
    {
      type: "p",
      text: "Les trois méthodes donnent presque toujours des valeurs différentes, et c'est normal : chacune éclaire un angle. Un écart important entre la méthode par l'EBITDA et la méthode par le prix par chambre signale généralement l'un des trois cas suivants : une exploitation sous-performante par rapport au potentiel des locaux (valeur des murs élevée, valeur des fonds basse) ; une exploitation surperformante liée à un dirigeant ou à un contexte non transférable (à décoter au moment de la vente) ; ou une méthode mal calibrée à la spécificité de l'établissement.",
    },
    {
      type: "p",
      text: "En pratique, la fourchette finale résulte d'un dialogue entre ces méthodes et d'un jugement d'expert. Ce jugement porte sur des éléments que seule une visite peut apprécier.",
    },
    { type: "h2", id: "expertise-humaine", text: "Ce qui reste de la main de l'homme" },
    {
      type: "ul",
      items: [
        "L'état réel du bâti et le montant des travaux à prévoir (couverture, façades, chambres, mises aux normes ERP et énergétiques).",
        "La qualité du bail commercial, son échéance, ses clauses (dépôt de garantie, indexation, destination, cession).",
        "La qualité et la stabilité de la clientèle : part de récurrent, dépendance à quelques comptes ou plateformes.",
        "La dépendance au dirigeant : un exploitant qui porte seul les relations commerciales et opère au quotidien crée une valeur qui ne se transfère pas mécaniquement.",
        "Le potentiel de repositionnement : marges de progression du prix moyen, gains attendus par une rénovation, développement d'un segment (séminaires, groupes, longue durée).",
      ],
    },
    { type: "h2", id: "estimation-vs-expertise", text: "Estimation indicative, pas expertise" },
    {
      type: "p",
      text: "Notre outil vous donne une fourchette calibrée sur les références du marché, personnalisée à votre région et à votre profil. Elle est fiable pour préparer un projet et discuter en connaissance de cause. Elle ne remplace pas l'expertise d'un professionnel qui aura visité les lieux, lu vos comptes détaillés, examiné le bail et rencontré vos équipes. La fourchette que nous vous transmettons est un point de départ solide ; la valeur de cession définitive s'établit toujours dans un dialogue avec un professionnel de la transaction hôtelière.",
    },
  ],
};
