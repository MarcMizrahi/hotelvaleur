import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/config/site";
import { fr } from "@/locales/fr";

function NotFoundComponent() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md text-center">
          <div className="font-serif text-7xl text-navy">404</div>
          <h1 className="mt-4 font-serif text-2xl text-navy">
            {fr.placeholders.not_found.title}
          </h1>
          <p className="mt-3 text-muted-foreground">{fr.placeholders.not_found.body}</p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md bg-navy px-5 py-3 text-sm font-medium text-navy-foreground hover:bg-navy/90 transition-colors"
            >
              Retour à l'accueil
            </Link>
            <Link
              to="/estimation"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-5 py-3 text-sm font-medium hover:bg-surface"
            >
              Estimer mon hôtel
            </Link>
            <Link
              to="/prix-hotel"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-5 py-3 text-sm font-medium hover:bg-surface"
            >
              Prix par région
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-2xl text-navy">
            Cette page ne s'est pas chargée
          </h1>
          <p className="mt-2 text-muted-foreground">
            Un incident est survenu. Vous pouvez réessayer ou revenir à l'accueil.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="inline-flex items-center justify-center rounded-md bg-navy px-5 py-3 text-sm font-medium text-navy-foreground hover:bg-navy/90"
            >
              Réessayer
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-5 py-3 text-sm font-medium text-foreground hover:bg-surface"
            >
              Retour à l'accueil
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${site.name} — ${site.tagline}` },
      {
        name: "description",
        content:
          "Estimez gratuitement et en toute confidentialité la valeur de vente de votre hôtel en France.",
      },
      { name: "author", content: site.name },
      { property: "og:title", content: `${site.name} — ${site.tagline}` },
      {
        property: "og:description",
        content:
          "Estimez gratuitement et en toute confidentialité la valeur de vente de votre hôtel en France.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Urbanist:wght@500;600;700;800&family=Epilogue:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-navy focus:text-navy-foreground focus:px-4 focus:py-2 focus:rounded"
      >
        {fr.nav.skip_to_content}
      </a>
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <Toaster />
    </QueryClientProvider>

  );
}
