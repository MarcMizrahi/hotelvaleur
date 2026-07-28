import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { site } from "@/config/site";
import { getGuideBySlug, otherGuides } from "@/content/guides";
import { Breadcrumbs, breadcrumbsJsonLd } from "@/components/breadcrumbs";
import { GuideBody, GuideToc } from "@/components/guide-body";

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = getGuideBySlug(params.slug);
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Guide introuvable" }, { name: "robots", content: "noindex" }] };
    }
    const g = loaderData.guide;
    return {
      meta: [
        { title: `${g.title} — ${site.name}` },
        { name: "description", content: g.description },
        { property: "og:title", content: g.title },
        { property: "og:description", content: g.description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
        { name: "article:published_time", content: g.updatedAt },
        { name: "article:modified_time", content: g.updatedAt },
        { name: "robots", content: "index,follow" },
      ],
      links: [{ rel: "canonical", href: `/guides/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.title,
            description: g.description,
            datePublished: g.updatedAt,
            dateModified: g.updatedAt,
            author: { "@type": "Organization", name: site.name },
            publisher: { "@type": "Organization", name: site.name },
            mainEntityOfPage: `${site.url}/guides/${g.slug}`,
          }),
        },
        {
          type: "application/ld+json",
          children: breadcrumbsJsonLd([
            { label: "Accueil", to: "/" },
            { label: "Guides", to: "/guides" },
            { label: g.title },
          ]),
        },
      ],
    };
  },
  component: GuidePage,
});

function GuidePage() {
  const { guide } = Route.useLoaderData();
  const others = otherGuides(guide.slug);
  const updated = new Date(guide.updatedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="container-page py-10 md:py-16">
      <Breadcrumbs
        items={[
          { label: "Accueil", to: "/" },
          { label: "Guides", to: "/guides" },
          { label: guide.title },
        ]}
      />

      <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          <header className="max-w-[68ch]">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {guide.readingMinutes} min de lecture · Mis à jour le {updated}
            </div>
            <h1 className="mt-2 font-serif text-3xl md:text-4xl text-navy leading-tight">
              {guide.title}
            </h1>
            <p className="mt-4 text-lg text-foreground/80 leading-relaxed">{guide.description}</p>
          </header>

          <GuideBody blocks={guide.body} />

          <div className="mt-14 rounded-lg border border-border bg-surface p-6">
            <h2 className="font-serif text-xl text-navy">Estimation personnalisée</h2>
            <p className="mt-2 text-foreground/80">
              Appliquez les principes de ce guide à votre établissement en obtenant une
              fourchette calibrée par notre moteur.
            </p>
            <Link
              to="/estimation"
              className="mt-4 inline-flex h-12 items-center justify-center rounded-md bg-navy px-6 text-sm font-medium text-navy-foreground hover:bg-navy/90"
            >
              Estimer mon hôtel
            </Link>
          </div>

          {others.length > 0 && (
            <div className="mt-10">
              <h2 className="font-serif text-xl text-navy">Autres guides</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link
                      to="/guides/$slug"
                      params={{ slug: o.slug }}
                      className="block rounded-md border border-border bg-card p-4 hover:border-navy"
                    >
                      <span className="font-medium text-navy">{o.title}</span>
                      <span className="block text-sm text-muted-foreground mt-1">{o.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="hidden lg:block sticky top-24 self-start">
          <GuideToc blocks={guide.body} />
        </aside>
      </div>
    </article>
  );
}
