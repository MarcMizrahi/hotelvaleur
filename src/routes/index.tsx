import { createFileRoute, Link } from "@tanstack/react-router";
import { useT } from "@/hooks/use-t";
import { site } from "@/config/site";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LineChart, FileText, ArrowRight } from "lucide-react";

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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-surface to-background" />
        <div className="container-page py-16 md:py-28">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-wider text-gold">
              Estimation confidentielle
            </p>
            <h1 className="mt-3 font-serif text-4xl md:text-6xl leading-[1.05] text-navy">
              {t.home.hero.title}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-foreground/80 max-w-2xl">
              {t.home.hero.subtitle}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
              <p className="text-sm text-muted-foreground">
                {t.common.no_engagement}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="container-page py-16 md:py-24">
        <h2 className="font-serif text-3xl md:text-4xl text-navy max-w-2xl">
          {t.home.how.title}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: FileText, title: t.home.how.s1_title, body: t.home.how.s1_body },
            { icon: LineChart, title: t.home.how.s2_title, body: t.home.how.s2_body },
            { icon: ShieldCheck, title: t.home.how.s3_title, body: t.home.how.s3_body },
          ].map((step, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy/5 text-navy">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Étape {i + 1}
                </span>
              </div>
              <h3 className="mt-4 font-serif text-xl text-navy">{step.title}</h3>
              <p className="mt-2 text-foreground/80 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CE QUE NOUS PRENONS EN COMPTE */}
      <section className="bg-surface">
        <div className="container-page py-16 md:py-24 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl text-navy">
              {t.home.factors.title}
            </h2>
            <p className="mt-4 text-foreground/80 max-w-md">
              Nous appliquons les méthodes utilisées par les professionnels de la
              transaction hôtelière, adaptées à votre région.
            </p>
          </div>
          <ul className="space-y-3">
            {t.home.factors.items.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-md border border-border bg-background p-4"
              >
                <span
                  aria-hidden
                  className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold"
                />
                <span className="text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CHIFFRES DU MARCHÉ */}
      <section className="container-page py-16 md:py-24">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h2 className="font-serif text-3xl md:text-4xl text-navy">
            {t.home.market.title}
          </h2>
          <p className="text-sm text-muted-foreground">{t.home.market.year}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {t.home.market.items.map((it, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-8"
            >
              <div className="font-serif text-4xl md:text-5xl text-navy tabular">
                {it.number}
              </div>
              <div className="mt-3 text-foreground/80">{it.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CONFIDENTIALITÉ */}
      <section className="bg-navy text-navy-foreground">
        <div className="container-page py-16 md:py-24 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5" />
            Confidentialité
          </div>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl text-navy-foreground">
            {t.home.privacy.title}
          </h2>
          <div className="mt-6 space-y-4 text-white/85 leading-relaxed max-w-2xl">
            <p>{t.home.privacy.p1}</p>
            <p>{t.home.privacy.p2}</p>
            <p>{t.home.privacy.p3}</p>
          </div>
        </div>
      </section>

      {/* MÉTHODE + LIMITES */}
      <section className="container-page py-16 md:py-24">
        <div className="max-w-3xl">
          <h2 className="font-serif text-2xl md:text-3xl text-navy">
            {t.home.method.title}
          </h2>
          <p className="mt-4 text-foreground/80 leading-relaxed">
            {t.home.method.body}
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-t border-border">
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
