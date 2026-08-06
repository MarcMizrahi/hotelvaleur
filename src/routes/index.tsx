import { createFileRoute, Link } from "@tanstack/react-router";
import { useT } from "@/hooks/use-t";
import { site } from "@/config/site";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  LineChart,
  FileText,
  ArrowRight,
  Clock,
  Lock,
  BadgeEuro,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${site.name} — Combien vaut votre hôtel ?` },
      {
        name: "description",
        content:
          "Estimation gratuite et confidentielle de la valeur de vente d'un hôtel en France. Résultat en 3 minutes, avec la méthode détaillée.",
      },
      { property: "og:title", content: `${site.name} — Combien vaut votre hôtel ?` },
      {
        property: "og:description",
        content:
          "Estimation gratuite et confidentielle de la valeur de vente d'un hôtel en France.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const t = useT();

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_100%_at_85%_0%,color-mix(in_oklab,var(--color-gold)_16%,transparent)_0%,transparent_55%),linear-gradient(to_bottom,var(--color-surface),var(--color-background))]" />
        <div className="container-page grid gap-10 py-14 md:py-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16">
          <div className="min-w-0">
            <p className="eyebrow">Estimation confidentielle</p>
            <h1 className="mt-4 font-serif text-[2.5rem] leading-[1.05] text-navy sm:text-5xl md:text-6xl">
              {t.home.hero.title}
            </h1>
            <div className="mt-6 h-px w-24 hairline-gold" aria-hidden />
            <p className="mt-6 max-w-xl text-lg text-foreground/75 md:text-xl">
              {t.home.hero.subtitle}
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                asChild
                size="lg"
                className="h-14 bg-navy px-8 text-base text-navy-foreground shadow-[0_16px_36px_-20px_oklch(0.24_0.055_265_/_0.9)] transition-transform hover:-translate-y-0.5 hover:bg-navy/90"
              >
                <Link to="/estimation">
                  {t.common.cta_estimate}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">{t.common.no_engagement}</p>
            </div>

            <ul className="mt-10 grid gap-x-6 gap-y-3 text-sm text-foreground/75 sm:grid-cols-3">
              {[
                { icon: Clock, label: "Résultat en 3 minutes" },
                { icon: Lock, label: "100 % confidentiel" },
                { icon: BadgeEuro, label: "Méthodes de marché" },
              ].map((f) => (
                <li key={f.label} className="flex items-center gap-2">
                  <f.icon className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                  <span className="min-w-0">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Carte de synthèse */}
          <div className="min-w-0">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_30px_70px_-45px_oklch(0.24_0.055_265_/_0.6)] sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="eyebrow">Aperçu du rapport</span>
                <span className="rounded-full bg-navy/5 px-2.5 py-1 text-xs font-medium text-navy">
                  Exemple
                </span>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                Hôtel 3★ · 42 chambres · Occitanie
              </p>
              <div className="mt-2 font-serif text-3xl text-navy tabular sm:text-4xl">
                3,4 – 4,1 M€
              </div>
              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-surface">
                <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-navy to-gold" />
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 text-sm">
                {[
                  ["Multiple d'EBITDA", "7,2×"],
                  ["Prix par chambre", "88 k€"],
                  ["Comparables retenus", "12"],
                  ["Type", "Murs + fonds"],
                ].map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 font-medium text-navy tabular">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="container-page py-16 md:py-24">
        <p className="eyebrow">Méthode</p>
        <h2 className="mt-3 max-w-2xl font-serif text-3xl text-navy md:text-4xl">
          {t.home.how.title}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: FileText, title: t.home.how.s1_title, body: t.home.how.s1_body },
            { icon: LineChart, title: t.home.how.s2_title, body: t.home.how.s2_body },
            { icon: ShieldCheck, title: t.home.how.s3_title, body: t.home.how.s3_body },
          ].map((step, i) => (
            <div key={i} className="surface-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy text-navy-foreground">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Étape {i + 1}
                </span>
              </div>
              <h3 className="mt-5 font-serif text-xl text-navy">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-foreground/75">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CE QUE NOUS PRENONS EN COMPTE */}
      <section className="border-y border-border bg-surface">
        <div className="container-page grid gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="eyebrow">Critères</p>
            <h2 className="mt-3 font-serif text-3xl text-navy md:text-4xl">
              {t.home.factors.title}
            </h2>
            <p className="mt-4 max-w-md text-foreground/75">
              Nous appliquons les méthodes utilisées par les professionnels de la
              transaction hôtelière, adaptées à votre région.
            </p>
          </div>
          <ul className="space-y-3">
            {t.home.factors.items.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:border-navy/20"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                <span className="min-w-0 text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CHIFFRES DU MARCHÉ */}
      <section className="container-page py-16 md:py-24">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <h2 className="min-w-0 font-serif text-3xl text-navy md:text-4xl">
            {t.home.market.title}
          </h2>
          <p className="shrink-0 text-sm text-muted-foreground">{t.home.market.year}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {t.home.market.items.map((it, i) => (
            <div key={i} className="surface-card p-8">
              <div className="font-serif text-4xl text-navy tabular md:text-5xl">
                {it.number}
              </div>
              <div className="mt-3 h-px w-10 hairline-gold" aria-hidden />
              <div className="mt-3 text-foreground/75">{it.label}</div>
            </div>
          ))}
        </div>
      </section>


      {/* CONFIDENTIALITÉ */}
      <section className="relative overflow-hidden bg-navy text-navy-foreground">
        <div
          aria-hidden
          className="absolute inset-0 -z-0 bg-[radial-gradient(90%_70%_at_100%_0%,color-mix(in_oklab,var(--color-gold)_22%,transparent)_0%,transparent_60%)]"
        />
        <div className="container-page relative max-w-4xl py-16 md:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            <ShieldCheck className="h-3.5 w-3.5" />
            Confidentialité
          </div>
          <h2 className="mt-5 font-serif text-3xl text-navy-foreground md:text-4xl">
            {t.home.privacy.title}
          </h2>
          <div className="mt-6 max-w-2xl space-y-4 leading-relaxed text-navy-foreground/80">
            <p>{t.home.privacy.p1}</p>
            <p>{t.home.privacy.p2}</p>
            <p>{t.home.privacy.p3}</p>
          </div>
        </div>
      </section>

      {/* MÉTHODE + LIMITES */}
      <section className="container-page py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="eyebrow">Transparence</p>
          <h2 className="mt-3 font-serif text-2xl text-navy md:text-3xl">
            {t.home.method.title}
          </h2>
          <p className="mt-4 leading-relaxed text-foreground/75">
            {t.home.method.body}
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-t border-border bg-surface">

        <div className="container-page py-16 md:py-20 text-center max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-navy">
            {t.home.final_cta.title}
          </h2>
          <p className="mt-3 text-foreground/80">{t.home.final_cta.body}</p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              className="bg-navy text-navy-foreground hover:bg-navy/90 h-14 px-8 text-base"
            >
              <Link to="/estimation">
                {t.common.cta_estimate}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t.common.no_engagement}
          </p>
        </div>
      </section>
    </div>
  );
}
