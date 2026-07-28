import type { GuideBlock } from "@/content/guides/types";

export function GuideBody({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <div className="guide-prose max-w-[68ch] text-[17px] leading-[1.7] text-foreground/90">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return <p key={i} className="mt-5">{b.text}</p>;
          case "h2":
            return (
              <h2 key={i} id={b.id} className="mt-12 font-serif text-2xl text-navy scroll-mt-24">
                {b.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} id={b.id} className="mt-8 font-serif text-xl text-navy scroll-mt-24">
                {b.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={i} className="mt-4 space-y-2 list-disc pl-6">
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            );
          case "callout":
            return (
              <aside
                key={i}
                className="mt-6 rounded-md border-l-4 border-gold bg-surface p-5"
                role="note"
              >
                {b.title && <div className="font-medium text-navy">{b.title}</div>}
                <p className={b.title ? "mt-1" : ""}>{b.text}</p>
              </aside>
            );
          case "table":
            return (
              <div key={i} className="mt-6 overflow-x-auto">
                <table className="min-w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr>
                      {b.headers.map((h, j) => (
                        <th key={j} className="px-3 py-2 text-left border-b border-border font-medium text-navy">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td key={k} className="px-3 py-2 border-b border-border/60">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}

export function GuideToc({ blocks }: { blocks: GuideBlock[] }) {
  const headings = blocks.filter((b) => b.type === "h2") as Array<{ type: "h2"; text: string; id: string }>;
  if (headings.length === 0) return null;
  return (
    <nav aria-label="Sommaire" className="text-sm">
      <div className="font-medium text-navy mb-3">Sommaire</div>
      <ol className="space-y-2">
        {headings.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`} className="text-foreground/80 hover:text-navy underline-offset-2 hover:underline">
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
