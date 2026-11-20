import { Link } from "@tanstack/react-router";
import { useT } from "@/hooks/use-t";
import { site } from "@/config/site";
import logoUrl from "@/assets/hotelvaleur-logo-h-v2.png";

export function SiteFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page py-12 grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt=""
              width={679}
              height={649}
              loading="lazy"
              className="h-8 w-auto"
            />
            <span className="font-serif text-lg text-navy">{site.name}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm">
            {t.footer.tagline}
          </p>
        </div>

        <nav className="text-sm" aria-label="Liens légaux">
          <div className="font-medium text-navy mb-3">Informations</div>
          <ul className="space-y-2">
            <li>
              <Link to="/mentions-legales" className="text-foreground/80 hover:text-navy">
                {t.footer.legal_notice}
              </Link>
            </li>
            <li>
              <Link to="/confidentialite" className="text-foreground/80 hover:text-navy">
                {t.footer.privacy}
              </Link>
            </li>
            <li>
              <Link to="/cgu" className="text-foreground/80 hover:text-navy">
                {t.footer.terms}
              </Link>
            </li>
            <li>
              <Link to="/cookies" className="text-foreground/80 hover:text-navy">
                Cookies
              </Link>
            </li>
            <li>
              <Link to="/mes-donnees" className="text-foreground/80 hover:text-navy">
                Mes données
              </Link>
            </li>
            <li>
              <Link to="/guides" className="text-foreground/80 hover:text-navy">
                Guides
              </Link>
            </li>
            <li>
              <Link to="/experts" className="text-foreground/80 hover:text-navy">
                Nos experts
              </Link>
            </li>
          </ul>
        </nav>

        <div className="text-sm">
          <div className="font-medium text-navy mb-3">{t.footer.contact}</div>
          <a
            href={`mailto:${site.contactEmail}`}
            className="text-foreground/80 hover:text-navy"
          >
            {site.contactEmail}
          </a>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-page py-4 text-xs text-muted-foreground">
          {t.footer.copyright(year)}
        </div>
      </div>
    </footer>
  );
}
