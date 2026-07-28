import type { ReactNode } from "react";

export function PlaceholderPage({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="container-page py-16 md:py-24">
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl md:text-5xl text-navy">{title}</h1>
        <p className="mt-6 text-lg text-foreground/80">{body}</p>
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </div>
  );
}
