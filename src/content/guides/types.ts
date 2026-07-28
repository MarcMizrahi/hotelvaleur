export type Guide = {
  slug: string;
  title: string;
  description: string;
  readingMinutes: number;
  updatedAt: string; // ISO date
  tags: string[];
  /** Content as an array of blocks — rendered by <GuideBody />. */
  body: GuideBlock[];
};

export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string; id: string }
  | { type: "h3"; text: string; id: string }
  | { type: "ul"; items: string[] }
  | { type: "callout"; title?: string; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };
