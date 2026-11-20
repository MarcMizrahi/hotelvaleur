import { createFileRoute } from "@tanstack/react-router";
import { regions } from "@/lib/regions";
import { getSiteUrl } from "@/config/site";
import { guides } from "@/content/guides";

type Entry = { path: string; priority?: string; changefreq?: string };

function buildEntries(): Entry[] {
  const staticPages: Entry[] = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/estimation", priority: "0.9", changefreq: "monthly" },
    { path: "/prix-hotel", priority: "0.9", changefreq: "monthly" },
    { path: "/experts", priority: "0.8", changefreq: "monthly" },
    { path: "/guides", priority: "0.8", changefreq: "monthly" },
    // Guides : dérivés du contenu pour qu'un nouveau guide apparaisse automatiquement.
    ...guides.map((g) => ({
      path: `/guides/${g.slug}`,
      priority: "0.7",
      changefreq: "monthly",
    })),
    { path: "/mentions-legales", priority: "0.3" },
    { path: "/confidentialite", priority: "0.3" },
    { path: "/cgu", priority: "0.3" },
    { path: "/cookies", priority: "0.3" },
  ];
  const regionPages: Entry[] = regions.map((r) => ({
    path: `/prix-hotel/${r.slug}`,
    priority: "0.8",
    changefreq: "monthly",
  }));
  const deptPages: Entry[] = regions.flatMap((r) =>
    r.departments.map((d) => ({
      path: `/prix-hotel/${r.slug}/${d.slug}`,
      priority: "0.6",
      changefreq: "monthly",
    })),
  );
  return [...staticPages, ...regionPages, ...deptPages];
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = getSiteUrl();
        const entries = buildEntries();
        const urls = entries
          .map((e) =>
            [
              "  <url>",
              `    <loc>${baseUrl}${e.path}</loc>`,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              "  </url>",
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
