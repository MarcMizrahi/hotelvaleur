import { createFileRoute } from "@tanstack/react-router";
import { regions } from "@/lib/regions";
import { site } from "@/config/site";

const BASE_URL = site.url.replace(/\/$/, "");

type Entry = { path: string; priority?: string; changefreq?: string };

function buildEntries(): Entry[] {
  const staticPages: Entry[] = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/estimation", priority: "0.9", changefreq: "monthly" },
    { path: "/prix-hotel", priority: "0.9", changefreq: "monthly" },
    { path: "/guides", priority: "0.8", changefreq: "monthly" },
    { path: "/guides/combien-vaut-mon-hotel", priority: "0.7", changefreq: "monthly" },
    { path: "/guides/vendre-son-hotel-etapes", priority: "0.7", changefreq: "monthly" },
    { path: "/guides/ebitda-revpar-hotellerie", priority: "0.7", changefreq: "monthly" },
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
        const entries = buildEntries();
        const urls = entries
          .map((e) =>
            [
              "  <url>",
              `    <loc>${BASE_URL}${e.path}</loc>`,
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
