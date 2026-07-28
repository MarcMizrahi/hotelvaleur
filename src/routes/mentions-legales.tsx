import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
import { LegalShell } from "@/components/legal-shell";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: `Mentions légales — ${site.name}` },
      { name: "description", content: `Mentions légales du site ${site.name}.` },
      { property: "og:title", content: `Mentions légales — ${site.name}` },
      { property: "og:description", content: `Mentions légales du site ${site.name}.` },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "/mentions-legales" }],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <LegalShell title="Mentions légales" updated="1er juillet 2026">
      <section>
        <h2 className="font-serif text-xl text-navy">Éditeur</h2>
        <ul className="mt-2 space-y-1">
          <li>Dénomination : [À COMPLÉTER]</li>
          <li>Forme juridique : [À COMPLÉTER]</li>
          <li>Adresse du siège social : [À COMPLÉTER]</li>
          <li>SIREN : [À COMPLÉTER]</li>
          <li>Responsable de la publication : [À COMPLÉTER]</li>
          <li>
            Courriel : <a href={`mailto:${site.contactEmail}`} className="underline">{site.contactEmail}</a>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">Hébergeur</h2>
        <p>
          Le site est hébergé sur une infrastructure serverless en Union européenne
          opérée par Cloudflare, Inc. — 101 Townsend Street, San Francisco, CA 94107,
          États-Unis. Les données applicatives sont stockées en Union européenne.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">Contact</h2>
        <p>
          Pour toute demande relative au site, écrivez à{" "}
          <a href={`mailto:${site.contactEmail}`} className="underline">{site.contactEmail}</a>.
        </p>
      </section>

      <section>
        <h2 className="font-serif text-xl text-navy">Propriété intellectuelle</h2>
        <p>
          L'ensemble du contenu de ce site (textes, éléments graphiques, structure) est
          la propriété de l'éditeur, sauf mention contraire. Toute reproduction,
          représentation ou diffusion, même partielle, est interdite sans autorisation
          écrite préalable.
        </p>
      </section>
    </LegalShell>
  );
}
