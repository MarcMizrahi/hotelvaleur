import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export function LegalReviewBanner() {
  return (
    <div
      role="note"
      className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
      <p>
        Document à faire relire par un juriste avant l'exploitation commerciale du site.
      </p>
    </div>
  );
}

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <article className="container-page py-10 md:py-16">
      <div className="max-w-3xl">
        <LegalReviewBanner />
        <h1 className="mt-6 font-serif text-3xl md:text-4xl text-navy">{title}</h1>
        {updated && (
          <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {updated}</p>
        )}
        <div className="legal-prose mt-8 text-[17px] leading-[1.7] text-foreground/90 space-y-5">
          {children}
        </div>
      </div>
    </article>
  );
}
