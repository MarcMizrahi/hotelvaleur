import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
import { LegalShell } from "@/components/legal-shell";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: `Conditions d'utilisation — ${site.name}` },
      { name: "description", content: `Conditions d'utilisation du service d'estimation ${site.name}.` },
      { property: "og:title", content: `Conditions d'utilisation — ${site.name}` },
      { property: "og:description", content: `Conditions d'utilisation du service d'estimation.` },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "/cgu" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalShell title="Conditions d'utilisation" updated="1er juillet 2026">
      <section>
        <h2 className="font-serif text-xl text-navy">1. Objet et rôle du service</h2>
        <p>
          {site.name} fournit un outil d'estimation indicative de la valeur d'un hôtel
          et un service d'information (guides, contenus éditoriaux, données de
          référence).
        </p>
        <p className="font-medium">
          Nous n'agissons pas comme intermédiaire. Nous ne réalisons aucune transaction.
          Nous ne percevons aucune commission sur une vente. Nous ne manipulons aucun
          fonds. Aucune promesse de mise en vente ou de mise en relation n'est faite
          au-delà de ce qui est décrit dans la politique de confidentialité et soumis à
          votre consentement explicite.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">2. Caractère indicatif de l'estimation</h2>
        <p>
          La fourchette d'estimation transmise est <em>indicative et non contractuelle</em>.
          Elle est calculée à partir des informations que vous fournissez et de références
          de marché. Elle ne constitue en aucun cas une expertise, une évaluation
          réglementée, ni un engagement sur une valeur de cession.
        </p>
        <p>
          Aucune garantie n'est donnée quant à la possibilité de vendre votre
          établissement à un prix compris dans cette fourchette. La valeur de cession
          effective dépend de nombreux facteurs qu'un professionnel de la transaction
          hôtelière est seul en mesure d'apprécier après visite et analyse détaillée.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">3. Obligations de l'utilisateur</h2>
        <p>
          Vous vous engagez à fournir des informations exactes et à jour. La qualité de
          l'estimation dépend directement de la véracité des données saisies. Vous vous
          interdisez tout usage automatisé abusif du service.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">4. Propriété intellectuelle</h2>
        <p>
          L'ensemble des contenus, marques, éléments graphiques et bases de données de ce
          site est la propriété de l'éditeur. Toute reproduction ou réutilisation
          nécessite une autorisation écrite préalable.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">5. Limitation de responsabilité</h2>
        <p>
          L'éditeur ne peut être tenu responsable des décisions prises sur la base de
          l'estimation fournie, ni d'un écart entre cette estimation et un prix de
          cession effectivement obtenu ou proposé. L'éditeur met en œuvre les moyens
          raisonnables pour assurer la disponibilité du service, sans en garantir la
          continuité absolue.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">6. Droit applicable</h2>
        <p>
          Les présentes conditions sont régies par le droit français. Tout différend qui
          ne serait pas résolu à l'amiable relève des juridictions françaises
          compétentes.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">7. Modification des conditions</h2>
        <p>
          L'éditeur se réserve le droit de modifier les présentes conditions à tout
          moment. La version en vigueur est celle publiée sur cette page.
        </p>
      </section>
    </LegalShell>
  );
}
