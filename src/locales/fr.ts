import { site } from "@/config/site";

export const fr = {
  common: {
    brand: site.name,
    cta_estimate: "Estimer mon hôtel",
    cta_estimate_short: "Estimer",
    no_engagement: "Sans engagement. Vos informations restent confidentielles.",
    indicative_notice:
      "Notre estimation est indicative et ne remplace pas une expertise. Elle vous donne un ordre de grandeur fiable pour préparer votre projet.",
  },
  nav: {
    estimation: "Estimation",
    prices: "Prix par région",
    guides: "Guides",
    menu_open: "Ouvrir le menu",
    menu_close: "Fermer le menu",
    skip_to_content: "Aller au contenu principal",
  },
  footer: {
    legal_notice: "Mentions légales",
    privacy: "Confidentialité",
    terms: "Conditions d'utilisation",
    contact: "Contact",
    tagline:
      "Nous fournissons une estimation indicative pour vous aider à préparer votre projet. Nous ne sommes pas intermédiaires et ne prenons aucune commission sur une vente.",
    copyright: (year: number) => `© ${year} ${site.name}. Tous droits réservés.`,
  },
  home: {
    hero: {
      title: "Combien vaut votre hôtel ?",
      subtitle:
        "Obtenez en 3 minutes une fourchette de valorisation confidentielle et gratuite pour votre établissement, avec le détail de la méthode.",
    },
    how: {
      title: "Comment ça marche",
      s1_title: "Vous décrivez votre établissement",
      s1_body:
        "Quelques questions simples sur votre hôtel : localisation, chambres, classement, chiffres si vous les avez.",
      s2_title: "Nous croisons les références du marché",
      s2_body:
        "Nous appliquons les méthodes utilisées par les professionnels (multiple d'EBITDA, prix par chambre) modulées par votre région.",
      s3_title: "Vous recevez une fourchette et sa méthode",
      s3_body:
        "Un rapport clair par email, avec la fourchette basse et haute, la méthode retenue et les facteurs qui font varier le prix.",
    },
    factors: {
      title: "Ce que nous prenons en compte",
      items: [
        "Le nombre de chambres et la surface d'exploitation",
        "Le classement (0 à 5 étoiles) et la présence d'un restaurant ou d'une licence IV",
        "La localisation, à la région et au département",
        "Le chiffre d'affaires annuel et l'EBITDA quand vous les fournissez",
        "Le type de transaction : les murs seuls, le fonds de commerce, ou les deux",
      ],
    },
    market: {
      title: "Le marché hôtelier français",
      year: "Chiffres 2024",
      items: [
        {
          number: "≈ 16 600",
          label: "hôtels en France",
        },
        {
          number: "2,5 à 2,7 Mds €",
          label: "de transactions hôtelières par an",
        },
        {
          number: "1 sur 5",
          label: "établissements à reprendre dans les cinq ans",
        },
      ],
    },
    privacy: {
      title: "Votre discrétion, notre principe",
      p1: "Nous ne publions jamais le nom d'un établissement. Aucune information ne figure sur un moteur de recherche ou un site tiers.",
      p2: "Les informations que vous nous transmettez ne sont partagées qu'avec votre accord explicite, au cas par cas.",
      p3: "Vous pouvez demander la suppression de vos données à tout moment, en un simple email.",
    },
    method: {
      title: "Une estimation indicative, pas une expertise",
      body: "Notre estimation est indicative et ne remplace pas une expertise. Elle vous donne un ordre de grandeur fiable pour préparer votre projet et discuter avec un professionnel en connaissance de cause.",
    },
    final_cta: {
      title: "Prêt à connaître la valeur de votre hôtel ?",
      body: "3 minutes, gratuit, confidentiel. Vous recevez le rapport par email.",
    },
  },
  placeholders: {
    estimation: {
      title: "Parcours d'estimation",
      body: "Le formulaire multi-étapes sera disponible prochainement.",
    },
    result: {
      title: "Votre résultat",
      body: "La page de résultat s'affichera après avoir complété le formulaire.",
    },
    prices_index: {
      title: "Prix de vente d'un hôtel par région",
      body: "Les 13 pages régionales seront publiées prochainement.",
    },
    region: {
      title: (r: string) => `Prix de vente d'un hôtel en ${r}`,
      body: "La page régionale sera publiée prochainement.",
    },
    department: {
      title: (d: string) => `Prix de vente d'un hôtel dans le département ${d}`,
      body: "La page départementale sera publiée prochainement.",
    },
    guides_index: {
      title: "Guides",
      body: "Les guides seront publiés prochainement.",
    },
    guide: {
      title: "Guide",
      body: "L'article sera publié prochainement.",
    },
    legal: {
      title: "Mentions légales",
      body: "Le contenu sera publié prochainement.",
    },
    privacy: {
      title: "Politique de confidentialité",
      body: "Le contenu sera publié prochainement.",
    },
    terms: {
      title: "Conditions d'utilisation",
      body: "Le contenu sera publié prochainement.",
    },
    admin: {
      title: "Espace d'administration",
      body: "Accès restreint. Connexion requise.",
    },
    not_found: {
      title: "Page introuvable",
      body: "La page que vous cherchez n'existe pas ou a été déplacée.",
      home: "Retour à l'accueil",
    },
  },
} as const;

export type FR = typeof fr;
