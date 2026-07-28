import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
import { LegalShell } from "@/components/legal-shell";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: `Politique de cookies — ${site.name}` },
      { name: "description", content: `Usage des cookies et traceurs sur ${site.name}.` },
      { property: "og:title", content: `Politique de cookies — ${site.name}` },
      { property: "og:description", content: `Usage des cookies sur ${site.name}.` },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "/cookies" }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalShell title="Politique de cookies" updated="1er juillet 2026">
      <section>
        <p>
          Ce site n'utilise <span className="font-medium">aucun traceur tiers</span> à
          des fins publicitaires ou de mesure d'audience externalisée. Aucun cookie de
          marketing, de reciblage ou de partage social n'est déposé sur votre appareil.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">Cookies strictement nécessaires</h2>
        <p>
          Nous utilisons uniquement des cookies techniques indispensables au
          fonctionnement du site : maintien de session, préférences d'affichage,
          protection contre les envois automatisés (CSRF). Ces cookies ne nécessitent
          pas votre consentement préalable au titre de la réglementation applicable.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">Mesure d'audience interne et anonyme</h2>
        <p>
          Nous enregistrons certains événements de navigation (pages consultées, étapes
          du parcours d'estimation) directement dans notre base de données, sous une
          forme <em>agrégée et anonymisée</em>, afin d'améliorer le service. Ce dispositif
          n'utilise pas de traceur tiers, ne transmet aucune donnée hors de notre
          infrastructure et ne permet pas de vous identifier.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">Évolution</h2>
        <p>
          Si un traceur tiers venait à être ajouté à l'avenir (par exemple pour la
          mesure d'audience externalisée), un bandeau de consentement serait mis en
          place : aucun dépôt ne serait effectué avant votre acceptation, et le refus
          serait aussi simple que l'acceptation.
        </p>
        <p>
          Pour toute question, écrivez-nous à{" "}
          <a href={`mailto:${site.contactEmail}`} className="underline">{site.contactEmail}</a>.
        </p>
      </section>
    </LegalShell>
  );
}
