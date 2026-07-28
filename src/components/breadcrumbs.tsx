import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { site } from "@/config/site";

export type Crumb = { label: string; to?: string; params?: Record<string, string> };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            {c.to ? (
              <Link
                to={c.to as string}
                params={c.params as never}
                className="hover:text-navy underline-offset-2 hover:underline"
              >
                {c.label}
              </Link>
            ) : (
              <span className="text-foreground/80" aria-current="page">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function breadcrumbsJsonLd(items: Crumb[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: c.to
        ? `${site.url}${resolvePath(c.to, c.params)}`
        : undefined,
    })),
  });
}

function resolvePath(to: string, params?: Record<string, string>) {
  if (!params) return to;
  let p = to;
  for (const [k, v] of Object.entries(params)) p = p.replace(`$${k}`, v);
  return p;
}
