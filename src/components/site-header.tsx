import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useT } from "@/hooks/use-t";
import { site } from "@/config/site";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const t = useT();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/estimation", label: t.nav.estimation },
    { to: "/prix-hotel", label: t.nav.prices },
    { to: "/guides", label: t.nav.guides },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link
          to="/"
          className="min-w-0 truncate font-serif text-xl font-bold tracking-tight text-navy"
          aria-label={site.name}
        >
          {site.name}
          <span className="text-gold">.</span>
        </Link>


        <nav className="hidden md:flex items-center gap-8" aria-label="Navigation principale">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-[15px] text-foreground/80 hover:text-navy transition-colors"
              activeProps={{ className: "text-navy font-medium" }}
            >
              {l.label}
            </Link>
          ))}
          <Button asChild size="sm" className="bg-navy text-navy-foreground hover:bg-navy/90">
            <Link to="/estimation">{t.common.cta_estimate}</Link>
          </Button>
        </nav>

        <button
          type="button"
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-md text-navy hover:bg-surface"
          aria-label={open ? t.nav.menu_close : t.nav.menu_open}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <nav
            className="container-page flex flex-col py-3"
            aria-label="Navigation principale"
          >
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="py-3 text-base text-foreground/90 border-b border-border last:border-0"
              >
                {l.label}
              </Link>
            ))}
            <Button
              asChild
              className="mt-3 bg-navy text-navy-foreground hover:bg-navy/90 h-12"
              onClick={() => setOpen(false)}
            >
              <Link to="/estimation">{t.common.cta_estimate}</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
