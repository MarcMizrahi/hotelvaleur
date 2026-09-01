import type { ReactNode } from "react";

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-3xl text-navy">{value}</p>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="p-8 text-center text-sm text-muted-foreground">{text}</p>;
}

export function Gate({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: ReactNode;
}) {
  return (
    <div className="bg-surface min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md rounded-xl border border-border bg-background p-8 text-center space-y-4">
        <h1 className="font-serif text-2xl text-navy">{title}</h1>
        <p className="text-sm text-muted-foreground">{text}</p>
        <div className="flex justify-center">{action}</div>
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl text-navy">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
