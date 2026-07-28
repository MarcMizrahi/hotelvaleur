import { createFileRoute, Link } from "@tanstack/react-router";
import { site } from "@/config/site";
import { LegalShell } from "@/components/legal-shell";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: `Politique de confidentialité — ${site.name}` },
      {
        name: "description",
        content: `Comment ${site.name} collecte, utilise et protège vos données personnelles.`,
      },
      { property: "og:title", content: `Politique de confidentialité — ${site.name}` },
      {
        property: "og:description",
        content: `Données collectées, finalités, durées de conservation, droits RGPD.`,
      },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "/confidentialite" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalShell title="Politique de confidentialité" updated="1er juillet 2026">
      <section>
        <h2 className="font-serif text-xl text-navy">Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données personnelles collectées via ce site
          est l'éditeur mentionné dans les mentions légales. Vous pouvez le contacter à{" "}
          <a href={`mailto:${site.contactEmail}`} className="underline">{site.contactEmail}</a>.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">Données collectées</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Identité et coordonnées : nom, prénom, adresse email, téléphone (facultatif).</li>
          <li>Informations sur l'établissement : localisation, chambres, classement, caractéristiques d'exploitation.</li>
          <li>Données financières déclarées : chiffre d'affaires, EBITDA, taux d'occupation (facultatifs).</li>
          <li>Données de navigation : pages visitées, événements de parcours, source d'acquisition.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">Finalités et bases légales</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <span className="font-medium">Fournir l'estimation et le rapport par email</span> :
            exécution du service demandé (base légale : intérêt légitime à fournir le
            service que vous sollicitez, et exécution d'un service demandé).
          </li>
          <li>
            <span className="font-medium">Vous mettre en relation avec des professionnels
            de la transaction</span> : uniquement avec votre <em>consentement explicite</em>{" "}
            recueilli au moment de l'estimation (base légale : consentement).
          </li>
          <li>
            <span className="font-medium">Vous envoyer des conseils et actualités</span> :
            uniquement avec votre consentement explicite (base légale : consentement).
          </li>
          <li>
            <span className="font-medium">Améliorer le service</span> : mesure interne et
            anonymisée du parcours utilisateur (base légale : intérêt légitime).
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">Durées de conservation</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Estimations et coordonnées : 3 ans à compter de votre dernier contact avec le service, puis suppression.</li>
          <li>Journaux techniques d'accès : 12 mois.</li>
          <li>Historique des consentements et des désabonnements : durée nécessaire pour prouver le respect de vos choix.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">Destinataires</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>L'éditeur et son personnel habilité.</li>
          <li>Notre hébergeur (infrastructure serverless en Union européenne).</li>
          <li>Notre fournisseur d'envoi d'emails transactionnels.</li>
          <li>Des professionnels de la transaction hôtelière, uniquement si vous avez expressément consenti à cette mise en relation.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">Localisation des données</h2>
        <p>
          Les données sont hébergées et traitées dans l'Union européenne. Aucun transfert
          hors UE n'est effectué pour les données d'estimation.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">Vos droits</h2>
        <p>
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification,
          d'effacement, de portabilité, d'opposition et de retrait de votre consentement.
        </p>
        <p>
          Ces droits sont directement exerçables sur la page{" "}
          <Link to="/mes-donnees" className="underline text-navy">mes données</Link>.
          Vous pouvez également écrire à{" "}
          <a href={`mailto:${site.contactEmail}`} className="underline">{site.contactEmail}</a>.
        </p>
        <p>
          Si vous estimez, après nous avoir contactés, que vos droits ne sont pas
          respectés, vous pouvez introduire une réclamation auprès de la CNIL{" "}
          (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline">cnil.fr</a>).
        </p>
      </section>
    </LegalShell>
  );
}
