export interface FormError {
  /** Titre court affiché en gras. */
  title: string;
  /** Explication contextuelle. */
  message: string;
  /** Conseil de correction concret. */
  hint?: string;
  /** Étape à ouvrir pour corriger. */
  gotoStep?: number;
  /** Id du champ à focaliser une fois l'étape ouverte. */
  fieldId?: string;
  /** L'action de soumission peut être relancée telle quelle. */
  retryable?: boolean;
}

/** Traduit une erreur de soumission en message contextuel + action de correction. */
export function classifySubmitError(e: unknown): FormError {
  const raw = e instanceof Error ? e.message : String(e ?? "");
  const msg = raw.toLowerCase();

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      title: "Vous semblez hors ligne",
      message: "La connexion internet est indisponible, l'estimation n'a pas pu être envoyée.",
      hint: "Vos réponses sont conservées : reconnectez-vous puis relancez le calcul.",
      retryable: true,
    };
  }

  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("timeout")) {
    return {
      title: "Connexion interrompue",
      message: "Le serveur n'a pas répondu pendant l'envoi de votre estimation.",
      hint: "Vos réponses sont conservées : relancez le calcul dans quelques secondes.",
      retryable: true,
    };
  }

  if (msg.includes("trop de demandes") || msg.includes("rate") || msg.includes("429")) {
    return {
      title: "Trop de demandes envoyées",
      message: "Plusieurs estimations ont déjà été lancées depuis cet appareil.",
      hint: "Patientez une minute avant de relancer, ou contactez-nous directement.",
      retryable: true,
    };
  }

  if (msg.includes("email")) {
    return {
      title: "Adresse email refusée",
      message: raw,
      hint: "Vérifiez l'orthographe de votre adresse (une adresse professionnelle fonctionne mieux).",
      gotoStep: 5,
      fieldId: "em",
    };
  }

  if (msg.includes("chambre")) {
    return {
      title: "Nombre de chambres invalide",
      message: raw,
      hint: "Indiquez un nombre de chambres exploitées entre 1 et 500.",
      gotoStep: 3,
      fieldId: "rooms",
    };
  }

  if (msg.includes("région") || msg.includes("region") || msg.includes("département")) {
    return {
      title: "Localisation invalide",
      message: raw,
      hint: "Resélectionnez votre région et votre département.",
      gotoStep: 1,
      fieldId: "region",
    };
  }

  if (msg.includes("consent")) {
    return {
      title: "Consentement manquant",
      message: raw,
      hint: "Cochez l'accord de recontact pour recevoir votre rapport.",
      gotoStep: 5,
    };
  }

  return {
    title: "Le calcul n'a pas abouti",
    message: raw || "Une erreur inattendue est survenue.",
    hint: "Vos réponses sont conservées : relancez le calcul, ou écrivez-nous si le problème persiste.",
    retryable: true,
  };
}
