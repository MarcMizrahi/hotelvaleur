import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fr } from "@/locales/fr";
import { loadResult, type StoredResult } from "@/lib/estimation-storage";
import { EstimationResultView } from "@/components/estimation-result-view";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/estimation/resultat")({
  head: () => ({
    meta: [
      { title: `Votre estimation — ${fr.common.brand}` },
      {
        name: "description",
        content: "Le résultat de votre estimation hôtelière, avec la méthode et les facteurs.",
      },
      { property: "og:title", content: `Votre estimation — ${fr.common.brand}` },
      {
        property: "og:description",
        content: "Fourchette de valeur, méthode et facteurs d'ajustement.",
      },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<StoredResult | null>(null);

  useEffect(() => {
    const r = loadResult();
    if (!r) {
      navigate({ to: "/estimation" });
      return;
    }
    setResult(r);
    void track("resultat.viewed", { method_used: r.methodUsed });
  }, [navigate]);

  if (!result) return null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <EstimationResultView result={result} />
    </main>
  );
}
