import { AlertCircle } from "lucide-react";
import { site } from "@/config/site";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { fr } from "@/locales/fr";
import { regions } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  loadDraftState,
  saveDraft,
  clearDraft,
  saveResult,
  type EstimationDraft,
  type StoredResult,
} from "@/lib/estimation-storage";
import { EstimationResultView } from "@/components/estimation-result-view";
import { parseEuros } from "@/lib/money";
import { track, captureAttribution } from "@/lib/analytics";
import { submitEstimation } from "@/lib/estimation.functions";
import { searchHotels, type HotelSuggestion } from "@/lib/hotel-lookup.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { classifySubmitError, type FormError } from "@/lib/estimation-errors";


export const Route = createFileRoute("/estimation")({
  head: () => ({
    meta: [
      { title: `Estimation gratuite de votre hôtel — ${fr.common.brand}` },
      {
        name: "description",
        content:
          "Estimez la valeur de votre hôtel en 3 minutes. Fourchette basée sur les prix par chambre et multiples d'EBITDA de votre région.",
      },
      { property: "og:title", content: `Estimation gratuite — ${fr.common.brand}` },
      {
        property: "og:description",
        content: "3 minutes, sans engagement, résultat immédiat par email.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: EstimationPage,
});

const TOTAL_STEPS = 7;

function EstimationPage() {
  const submit = useServerFn(submitEstimation);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<EstimationDraft>({});
  const [error, setError] = useState<FormError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<StoredResult | null>(null);
  const [restored, setRestored] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadDraftState();
    if (saved) {
      setDraft(saved.draft);
      setStep(saved.step);
      if (saved.step > 1 || Object.keys(saved.draft).length > 0) setRestored(true);
    }
    setHydrated(true);
    captureAttribution();
    void track("funnel_vendeur.started");
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft(draft, step);
  }, [draft, step, hydrated]);


  useEffect(() => {
    const onUnload = () => {
      if (step < TOTAL_STEPS) {
        // Fire-and-forget
        void track("funnel_vendeur.abandoned", { step });
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [step]);

  const update = (patch: Partial<EstimationDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  };

  const focusField = (fieldId?: string) => {
    if (!fieldId) return;
    window.setTimeout(() => {
      const el = document.getElementById(fieldId);
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.focus({ preventScroll: true });
      }
    }, 80);
  };

  const applyFix = (err: FormError) => {
    if (err.gotoStep) setStep(err.gotoStep);
    setError(null);
    focusField(err.fieldId);
  };

  const goNext = async () => {
    const err = validateStep(step, draft);
    if (err) {
      setError(err);
      focusField(err.fieldId);
      return;
    }
    await track(`funnel_vendeur.step_${step}`);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    for (let s = 1; s <= TOTAL_STEPS; s++) {
      const err = validateStep(s, draft);
      if (err) {
        setError({ ...err, gotoStep: s });
        if (s !== step) setStep(s);
        focusField(err.fieldId);
        toast.error(err.title, { description: err.hint ?? err.message });
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const attr = JSON.parse(sessionStorage.getItem("hv_attribution") ?? "{}");
      const res = await submit({
        data: {
          regionSlug: draft.regionSlug!,
          departmentCode: draft.departmentCode!,
          city: draft.city ?? null,
          transactionType: draft.transactionType!,
          leaseYearsRemaining: draft.leaseYearsRemaining ?? null,
          isEmphyteotic: draft.isEmphyteotic ?? null,
          emphyteoticYearsRemaining: draft.emphyteoticYearsRemaining ?? null,
          hotelName: draft.hotelName ?? null,
          roomCount: draft.roomCount!,
          starRating: draft.starRating ?? 0,
          isIndependent: draft.isIndependent ?? true,
          hasRestaurant: draft.hasRestaurant ?? false,
          hasLicence4: draft.hasLicence4 ?? false,
          worksNeeded: draft.worksNeeded ?? null,
          worksCostCents: draft.worksCostCents ?? null,
          annualRevenueCents: draft.annualRevenueCents ?? null,
          ebitdaCents: draft.ebitdaCents ?? null,
          occupancyRate: draft.occupancyRate ?? null,
          email: draft.email!,
          phone: draft.phone ?? null,
          firstName: draft.firstName ?? null,
          lastName: draft.lastName ?? null,
          saleIntent: draft.saleIntent!,
          priceExpectationCents: draft.priceExpectationCents ?? null,
          consentContact: draft.consentContact ?? false,
          consentMarketing: draft.consentMarketing ?? false,
          utm_source: attr.utm_source ?? null,
          utm_medium: attr.utm_medium ?? null,
          utm_campaign: attr.utm_campaign ?? null,
          referrer: attr.referrer ?? null,
          landing_page: attr.landing_page ?? null,
          turnstileToken: null,
        },
      });
      const stored: StoredResult = {
        id: res.id,
        valueLowCents: res.valueLowCents,
        valueHighCents: res.valueHighCents,
        methodUsed: res.methodUsed,
        draft,
        reportSent: res.reportSent,
        outlier: res.outlier,
        brokerageToken: res.brokerageToken,
      };
      saveResult(stored);
      await track("funnel_vendeur.step_6");
      await track("estimation.completed", { method_used: res.methodUsed });
      if (draft.saleIntent === "moins_1_an" || draft.saleIntent === "1_a_2_ans") {
        await track("lead.qualified", { sale_intent: draft.saleIntent });
      }
      setResult(stored);
      void track("resultat.viewed", { method_used: res.methodUsed });
      clearDraft();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: unknown) {
      const err = classifySubmitError(e);
      setError(err);
      toast.error(err.title, { description: err.hint ?? err.message });
      if (err.gotoStep) setStep(err.gotoStep);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <EstimationResultView result={result} />
      </main>
    );
  }

  const stepLabels = [
    "Localisation",
    "Établissement",
    "Exploitation",
    "Chiffres",
    "Projet",
    "Contact",
    "Prix en tête",
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 pb-32 sm:py-16 sm:pb-16">
      {restored && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
        >
          <span className="min-w-0 text-foreground/80">
            Progression restaurée — vous reprenez à l'étape {step} sur {TOTAL_STEPS}.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearDraft();
              setDraft({});
              setStep(1);
              setRestored(false);
              setError(null);
            }}
          >
            Recommencer
          </Button>
        </div>
      )}
      <div className="mb-8">

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <p className="min-w-0 truncate font-serif text-lg text-navy">
            {stepLabels[step - 1]}
          </p>
          <p className="shrink-0 text-sm text-muted-foreground tabular">
            Étape {step} / {TOTAL_STEPS}
          </p>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-3 h-1.5" />
        <ol className="mt-3 hidden gap-1 sm:grid sm:grid-cols-7" aria-hidden>
          {stepLabels.map((label, i) => (
            <li
              key={label}
              className={`truncate text-[11px] uppercase tracking-wider ${
                i + 1 <= step ? "text-navy" : "text-muted-foreground/60"
              }`}
            >
              {label}
            </li>
          ))}
        </ol>
      </div>

      <div className="min-h-[360px] rounded-2xl border border-border bg-card p-5 sm:p-8">
        {step === 1 && <Step1 draft={draft} update={update} />}
        {step === 2 && <Step2 draft={draft} update={update} />}
        {step === 3 && <Step3 draft={draft} update={update} />}
        {step === 4 && <Step4 draft={draft} update={update} />}
        {step === 5 && <Step5 draft={draft} update={update} />}
        {step === 6 && <Step6 draft={draft} update={update} />}
        {step === 7 && <Step7 draft={draft} update={update} />}
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
        >
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium text-destructive">{error.title}</p>
              <p className="mt-1 text-foreground/80">{error.message}</p>
              {error.hint && (
                <p className="mt-1 text-muted-foreground">{error.hint}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {(error.gotoStep || error.fieldId) && (
                  <Button size="sm" variant="outline" onClick={() => applyFix(error)}>
                    Corriger {error.gotoStep ? `(étape ${error.gotoStep})` : ""}
                  </Button>
                )}
                {error.retryable && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => void handleSubmit()}
                  >
                    Relancer le calcul
                  </Button>
                )}
                <Button size="sm" variant="ghost" asChild>
                  <a href={`mailto:${site.contactEmail}`}>Nous écrire</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Button variant="ghost" onClick={goBack} disabled={step === 1 || submitting}>
            ← Retour
          </Button>
          {step < TOTAL_STEPS ? (
            <Button onClick={goNext} className="min-w-36 bg-navy text-navy-foreground hover:bg-navy/90">
              Continuer
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="min-w-36 bg-navy text-navy-foreground hover:bg-navy/90"
            >
              {submitting ? "Calcul en cours…" : "Recevoir mon estimation"}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}


// ---------- Validation ----------

function validateStep(step: number, d: EstimationDraft): FormError | null {
  const err = (
    title: string,
    message: string,
    hint?: string,
    fieldId?: string,
  ): FormError => ({ title, message, hint, fieldId, gotoStep: step });

  switch (step) {
    case 1:
      if (!d.regionSlug)
        return err(
          "Région manquante",
          "La région détermine les références de prix appliquées.",
          "Choisissez la région de votre établissement.",
          "region",
        );
      if (!d.departmentCode)
        return err(
          "Département manquant",
          "Le département affine la fourchette au sein de la région.",
          "Sélectionnez le département dans la liste.",
          "dep",
        );
      return null;
    case 2:
      if (!d.transactionType)
        return err(
          "Type de transaction manquant",
          "La méthode de valorisation dépend de ce que vous cédez (murs, fonds, ou les deux).",
          "Sélectionnez l'une des trois options.",
        );
      if (d.isEmphyteotic && (!d.emphyteoticYearsRemaining || d.emphyteoticYearsRemaining < 1))
        return err(
          "Durée du bail emphytéotique manquante",
          "La durée restante fait fortement varier la valeur d'un bail emphytéotique.",
          "Indiquez le nombre d'années restantes (au moins 1).",
          "emp",
        );
      return null;
    case 3:
      if (!d.roomCount || d.roomCount < 1 || d.roomCount > 500)
        return err(
          "Nombre de chambres invalide",
          "Le nombre de chambres est la base du calcul par prix/chambre.",
          "Saisissez un nombre entre 1 et 500 (chambres exploitées).",
          "rooms",
        );
      if (typeof d.starRating !== "number")
        return err(
          "Classement manquant",
          "Le classement conditionne le positionnement de prix retenu.",
          "Choisissez de 0 à 5 étoiles (0 si non classé).",
        );
      return null;
    case 4: {
      if (
        typeof d.occupancyRate === "number" &&
        (d.occupancyRate <= 0 || d.occupancyRate > 100)
      )
        return err(
          "Taux d'occupation invalide",
          "Le taux d'occupation doit être exprimé en pourcentage.",
          "Saisissez une valeur entre 1 et 100, ou laissez le champ vide.",
          "occ",
        );
      if (
        typeof d.annualRevenueCents === "number" &&
        typeof d.ebitdaCents === "number" &&
        d.ebitdaCents > d.annualRevenueCents
      )
        return err(
          "EBITDA supérieur au chiffre d'affaires",
          "L'EBITDA saisi dépasse le chiffre d'affaires annuel, ce qui fausserait le calcul.",
          "Vérifiez les deux montants (en euros, hors taxes) ou laissez l'EBITDA vide.",
          "ebitda",
        );
      return null;
    }
    case 5:
      if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
        return err(
          "Adresse email invalide",
          "Le rapport détaillé vous est envoyé par email.",
          "Format attendu : prenom.nom@domaine.fr",
          "em",
        );
      if (!d.consentContact)
        return err(
          "Accord de recontact requis",
          "Sans cet accord nous ne pouvons pas vous transmettre l'estimation.",
          "Cochez la case de consentement au-dessus du bouton.",
        );
      return null;
    case 6:
      if (!d.saleIntent)
        return err(
          "Horizon de projet manquant",
          "Cette information nous permet d'adapter les conseils du rapport.",
          "Sélectionnez l'échéance qui correspond le mieux.",
        );
      return null;
    case 7:
      if (
        typeof d.priceExpectationCents === "number" &&
        (d.priceExpectationCents <= 0 || d.priceExpectationCents > 500_000_000_00)
      )
        return err(
          "Montant invalide",
          "Le prix indiqué doit être un montant en euros réaliste.",
          "Saisissez un montant positif, ou laissez le champ vide.",
          "price-exp",
        );
      return null;
  }
  return null;
}


// ---------- Steps ----------

function Step1({ draft, update }: StepProps) {
  const currentRegion = regions.find((r) => r.slug === draft.regionSlug);
  const lookup = useServerFn(searchHotels);
  const [nameInput, setNameInput] = useState(draft.hotelName ?? "");
  const [suggestions, setSuggestions] = useState<HotelSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [identified, setIdentified] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setNameInput(draft.hotelName ?? "");
  }, [draft.hotelName]);

  useEffect(() => {
    const q = nameInput.trim();
    if (dismissed || q.length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await lookup({ data: { query: q } });
        if (!cancelled) setSuggestions(res);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [nameInput, dismissed, lookup]);

  const pick = (s: HotelSuggestion) => {
    update({
      hotelName: s.name,
      regionSlug: s.regionSlug ?? draft.regionSlug,
      departmentCode: s.regionSlug ? s.departmentCode : draft.departmentCode,
      city: s.city ?? draft.city,
      starRating: s.starRating ?? draft.starRating,
      roomCount: s.roomCount ?? draft.roomCount,
    });
    setNameInput(s.name);
    setSuggestions([]);
    setDismissed(true);
    setIdentified([s.name, s.label].filter(Boolean).join(" — "));
  };

  return (
    <section>
      <h1 className="font-serif text-3xl">Quel est votre hôtel, et où se situe-t-il ?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Saisissez le nom de l'établissement : nous tentons de l'identifier pour pré-remplir la
        localisation. La localisation influence fortement la valorisation.
      </p>
      <div className="mt-6 space-y-4">
        <div className="relative">
          <Label htmlFor="hotelName">Nom de l'hôtel (facultatif)</Label>
          <Input
            id="hotelName"
            autoComplete="off"
            value={nameInput}
            placeholder="Ex. Hôtel du Château"
            onChange={(e) => {
              setNameInput(e.target.value);
              setDismissed(false);
              setIdentified(null);
              update({ hotelName: e.target.value || undefined });
            }}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Il reste confidentiel. Il nous sert à identifier l'établissement et à repérer une
            enseigne ou un positionnement premium, qui influencent la valorisation.
          </p>
          {searching && !dismissed && (
            <p className="mt-1 text-xs text-muted-foreground">Recherche de l'établissement…</p>
          )}
          {identified && (
            <p className="mt-1 text-xs text-primary">
              Établissement identifié : {identified}. Vérifiez les champs pré-remplis ci-dessous.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setIdentified(null);
                  setDismissed(false);
                }}
              >
                Choisir un autre établissement
              </button>
            </p>
          )}
          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-lg">
              <p className="border-b border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                {suggestions.length} correspondance{suggestions.length > 1 ? "s" : ""} trouvée
                {suggestions.length > 1 ? "s" : ""} — sélectionnez la bonne entrée
              </p>
              <ul className="max-h-72 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <li key={`${s.name}-${i}`}>
                    <button
                      type="button"
                      onClick={() => pick(s)}
                      className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{s.name}</span>
                        {s.label && (
                          <span className="block text-xs text-muted-foreground">{s.label}</span>
                        )}
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {[
                            s.kind === "hotel" ? "Hôtel" : s.kind === "guest_house" ? "Maison d'hôtes" : s.kind,
                            s.starRating ? `${s.starRating}★` : null,
                            s.roomCount ? `${s.roomCount} chambres` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.confidence >= 70
                            ? "bg-primary/10 text-primary"
                            : s.confidence >= 45
                              ? "bg-muted text-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                        title="Score de confiance de la correspondance"
                      >
                        {s.confidence}%
                      </span>
                    </button>
                  </li>
                ))}
                <li className="border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestions([]);
                      setDismissed(true);
                    }}
                    className="block w-full px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted"
                  >
                    Aucun de ces établissements — saisir manuellement
                  </button>
                </li>
              </ul>
            </div>
          )}

        </div>
        <div>
          <Label htmlFor="region">Région</Label>
          <select
            id="region"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draft.regionSlug ?? ""}
            onChange={(e) => update({ regionSlug: e.target.value, departmentCode: undefined })}
          >
            <option value="">— Sélectionner —</option>
            {regions.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="dep">Département</Label>
          <select
            id="dep"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={draft.departmentCode ?? ""}
            onChange={(e) => update({ departmentCode: e.target.value })}
            disabled={!currentRegion}
          >
            <option value="">— Sélectionner —</option>
            {currentRegion?.departments.map((dep) => (
              <option key={dep.code} value={dep.code}>
                {dep.code} — {dep.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="city">Ville (facultatif)</Label>
          <Input
            id="city"
            value={draft.city ?? ""}
            onChange={(e) => update({ city: e.target.value })}
          />
        </div>
      </div>
    </section>
  );
}


function Step2({ draft, update }: StepProps) {
  const options: Array<{
    key: NonNullable<EstimationDraft["transactionType"]>;
    title: string;
    desc: string;
  }> = [
    {
      key: "murs_fonds",
      title: "Les murs et le fonds",
      desc: "Vous vendez l'immobilier et l'exploitation.",
    },
    {
      key: "fonds",
      title: "Le fonds de commerce seul",
      desc: "Vous vendez l'exploitation, les murs restent la propriété d'un tiers ou la vôtre.",
    },
    {
      key: "murs",
      title: "Les murs seuls",
      desc: "Vous vendez l'immobilier, l'exploitation continue avec un bail.",
    },
  ];
  const isFonds = draft.transactionType === "fonds";
  const isMursOrBoth =
    draft.transactionType === "murs" || draft.transactionType === "murs_fonds";
  return (
    <section>
      <h1 className="font-serif text-3xl">Que souhaitez-vous céder ?</h1>
      <div className="mt-6 space-y-3">
        {options.map((o) => {
          const selected = draft.transactionType === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => update({ transactionType: o.key })}
              className={`block w-full rounded-lg border p-4 text-left transition ${
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/40"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-medium">{o.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
            </button>
          );
        })}
      </div>

      {isFonds && (
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
          <Label htmlFor="lease">Années restantes sur le bail commercial</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            La durée résiduelle du bail est le premier facteur de valeur d'un fonds seul.
          </p>
          <Input
            id="lease"
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            className="mt-2 max-w-[160px]"
            value={draft.leaseYearsRemaining ?? ""}
            onChange={(e) =>
              update({
                leaseYearsRemaining: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      )}

      {isMursOrBoth && (
        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={draft.isEmphyteotic ?? false}
              onCheckedChange={(v) =>
                update({
                  isEmphyteotic: v === true,
                  emphyteoticYearsRemaining: v === true ? draft.emphyteoticYearsRemaining : undefined,
                })
              }
            />
            <span>
              Les murs sont détenus via un <strong>bail emphytéotique</strong>
              <span className="block text-xs text-muted-foreground">
                Bail long (18–99 ans) dont la valeur s'éteint à l'échéance.
              </span>
            </span>
          </label>
          {draft.isEmphyteotic && (
            <div>
              <Label htmlFor="emp">Années restantes</Label>
              <Input
                id="emp"
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                className="mt-1 max-w-[160px]"
                value={draft.emphyteoticYearsRemaining ?? ""}
                onChange={(e) =>
                  update({
                    emphyteoticYearsRemaining: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Step3({ draft, update }: StepProps) {
  return (
    <section>
      <h1 className="font-serif text-3xl">Votre établissement</h1>
      <div className="mt-6 space-y-5">
        <div>
          <Label htmlFor="rooms">Nombre de chambres</Label>


          <Input
            id="rooms"
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            value={draft.roomCount ?? ""}
            onChange={(e) =>
              update({ roomCount: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
        <div>
          <Label>Classement</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4, 5].map((n) => {
              const active = draft.starRating === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => update({ starRating: n })}
                  className={`rounded-md border px-3 py-2 text-sm transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {n === 0 ? "Non classé" : `${n} ★`}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Options</Label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.hasRestaurant ?? false}
              onCheckedChange={(v) => update({ hasRestaurant: v === true })}
            />
            Restaurant
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.hasLicence4 ?? false}
              onCheckedChange={(v) => update({ hasLicence4: v === true })}
            />
            Licence IV
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.isIndependent ?? true}
              onCheckedChange={(v) => update({ isIndependent: v === true })}
            />
            Établissement indépendant (décoché = sous enseigne)
          </label>
        </div>
        <div>
          <Label>Travaux à prévoir</Label>
          <div className="mt-2 flex gap-2">
            {(["aucun", "legers", "importants"] as const).map((w) => {
              const active = draft.worksNeeded === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => update({ worksNeeded: w })}
                  className={`rounded-md border px-3 py-2 text-sm capitalize transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {w === "aucun" ? "Aucun" : w === "legers" ? "Légers" : "Importants"}
                </button>
              );
            })}
          </div>
          {(draft.worksNeeded === "legers" || draft.worksNeeded === "importants") && (
            <div className="mt-4">
              <Label htmlFor="works-cost">Montant estimé des travaux (€) — facultatif</Label>
              <Input
                id="works-cost"
                key={`works-cost-${draft.worksCostCents ?? ""}`}
                inputMode="numeric"
                placeholder="Ex. 150 000"
                defaultValue={draft.worksCostCents ? String(draft.worksCostCents / 100) : ""}
                onBlur={(e) => update({ worksCostCents: parseEuros(e.target.value) || undefined })}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Si vous le renseignez, ce montant est directement déduit de la valeur de
                l'actif (à la place de la décote forfaitaire pour travaux).
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Step4({ draft, update }: StepProps) {
  const [showTip, setShowTip] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importedYears, setImportedYears] = useState<
    { year: number; annualRevenueCents?: number; ebitdaCents?: number; occupancyRate?: number }[]
  >([]);
  const [cagr, setCagr] = useState<number | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    setImportErr(null);
    setImportedYears([]);
    setCagr(null);
    try {
      const { parseFinancialsFile } = await import("@/lib/spreadsheet-import");
      const found = await parseFinancialsFile(file);
      const labels: string[] = [];
      if (found.annualRevenueCents) labels.push("chiffre d'affaires");
      if (found.ebitdaCents) labels.push("EBITDA");
      if (typeof found.occupancyRate === "number") labels.push("taux d'occupation");
      if (labels.length === 0) {
        setImportErr(
          "Aucune donnée reconnue. Le fichier doit contenir des libellés comme « Chiffre d'affaires », « EBITDA » ou « Taux d'occupation » suivis de leur valeur.",
        );
      } else {
        update({
          annualRevenueCents: found.annualRevenueCents,
          ebitdaCents: found.ebitdaCents,
          occupancyRate: found.occupancyRate,
        });
        const multi = (found.years ?? []).length > 1;
        setImportedYears(found.years ?? []);
        setCagr(typeof found.revenueCagr === "number" ? found.revenueCagr : null);
        setImportMsg(
          multi
            ? `Importé depuis ${file.name} : ${found.years!.length} exercices détectés (${found.years![0].year}–${found.years![found.years!.length - 1].year}). Valeurs retenues = moyenne pondérée par récence.`
            : `Importé depuis ${file.name} : ${labels.join(", ")}.`,
        );
      }
    } catch {
      setImportErr("Fichier illisible. Formats acceptés : .xlsx, .xls, .csv.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section>
      <h1 className="font-serif text-3xl">Vos chiffres, si vous les avez sous la main.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Facultatif. Sans ces informations, nous vous donnerons une fourchette plus large basée
        sur les références de votre région.
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <Label htmlFor="xls">Importer un fichier Excel</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          .xlsx, .xls ou .csv contenant chiffre d'affaires, EBITDA et/ou taux d'occupation. Un
          fichier sur plusieurs exercices (une colonne ou une ligne par année) est pris en charge :
          les derniers exercices sont pondérés par récence. Les champs ci-dessous seront pré-remplis.
        </p>
        <Input
          id="xls"
          type="file"
          accept=".xlsx,.xls,.csv"
          className="mt-2"
          disabled={importing}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        {importing && <p className="mt-2 text-xs text-muted-foreground">Lecture du fichier…</p>}
        {importMsg && <p className="mt-2 text-xs text-primary">{importMsg}</p>}
        {importErr && <p className="mt-2 text-xs text-destructive">{importErr}</p>}

        {importedYears.length > 1 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-1 text-left font-medium">Exercice</th>
                  <th className="py-1 text-right font-medium">CA</th>
                  <th className="py-1 text-right font-medium">EBITDA</th>
                  <th className="py-1 text-right font-medium">Occupation</th>
                </tr>
              </thead>
              <tbody>
                {importedYears.map((y) => (
                  <tr key={y.year} className="border-t border-border/60">
                    <td className="py-1">{y.year}</td>
                    <td className="py-1 text-right">
                      {y.annualRevenueCents
                        ? `${Math.round(y.annualRevenueCents / 100).toLocaleString("fr-FR")} €`
                        : "—"}
                    </td>
                    <td className="py-1 text-right">
                      {y.ebitdaCents
                        ? `${Math.round(y.ebitdaCents / 100).toLocaleString("fr-FR")} €`
                        : "—"}
                    </td>
                    <td className="py-1 text-right">
                      {typeof y.occupancyRate === "number" ? `${y.occupancyRate} %` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cagr !== null && (
              <p className="mt-2 text-xs text-muted-foreground">
                Tendance du chiffre d'affaires : {cagr > 0 ? "+" : ""}
                {cagr} % par an sur la période.
              </p>
            )}
          </div>
        )}
      </div>


      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor="ca">Chiffre d'affaires annuel (€)</Label>
          <Input
            id="ca"
            key={`ca-${draft.annualRevenueCents ?? ""}`}
            inputMode="numeric"
            defaultValue={draft.annualRevenueCents ? String(draft.annualRevenueCents / 100) : ""}
            onBlur={(e) => update({ annualRevenueCents: parseEuros(e.target.value) || undefined })}
          />
        </div>
        <div>
          <Label htmlFor="ebitda">EBITDA / excédent brut d'exploitation (€)</Label>
          <Input
            id="ebitda"
            key={`ebitda-${draft.ebitdaCents ?? ""}`}
            inputMode="numeric"
            defaultValue={draft.ebitdaCents ? String(draft.ebitdaCents / 100) : ""}
            onBlur={(e) => update({ ebitdaCents: parseEuros(e.target.value) || undefined })}
          />
          <button
            type="button"
            onClick={() => setShowTip((s) => !s)}
            className="mt-1 text-xs text-primary underline"
          >
            Qu'est-ce que l'EBITDA ?
          </button>
          {showTip && (
            <p className="mt-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
              C'est le résultat de votre exploitation avant loyers financiers, amortissements et
              impôts. En hôtellerie, il représente souvent 25 à 35 % du chiffre d'affaires.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="occ">Taux d'occupation moyen (%)</Label>
          <Input
            id="occ"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={draft.occupancyRate ?? ""}
            onChange={(e) =>
              update({ occupancyRate: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </div>
      </div>
    </section>
  );
}

function Step5({ draft, update }: StepProps) {
  return (
    <section>
      <h1 className="font-serif text-3xl">Vos coordonnées</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        L'estimation vous est envoyée immédiatement par email.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fn">Prénom (facultatif)</Label>
          <Input
            id="fn"
            value={draft.firstName ?? ""}
            onChange={(e) => update({ firstName: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="ln">Nom (facultatif)</Label>
          <Input
            id="ln"
            value={draft.lastName ?? ""}
            onChange={(e) => update({ lastName: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="em">Email *</Label>
          <Input
            id="em"
            type="email"
            required
            value={draft.email ?? ""}
            onChange={(e) => update({ email: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="tel">Téléphone (facultatif)</Label>
          <Input
            id="tel"
            type="tel"
            value={draft.phone ?? ""}
            onChange={(e) => update({ phone: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            className="mt-1"
            checked={draft.consentContact ?? false}
            onCheckedChange={(v) => update({ consentContact: v === true })}
          />
          <span>J'accepte d'être recontacté au sujet de mon projet de cession.</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            className="mt-1"
            checked={draft.consentMarketing ?? false}
            onCheckedChange={(v) => update({ consentMarketing: v === true })}
          />
          <span>Je souhaite recevoir des conseils sur la transmission d'un hôtel.</span>
        </label>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Vos données ne sont jamais publiées. Nous ne divulguons jamais le nom de votre
        établissement. Vous pouvez demander leur suppression à tout moment.{" "}
        <a href="/confidentialite" className="underline">
          Politique de confidentialité
        </a>
        .
      </p>
    </section>
  );
}

function Step6({ draft, update }: StepProps) {
  const options: Array<{
    key: NonNullable<EstimationDraft["saleIntent"]>;
    label: string;
  }> = [
    { key: "moins_1_an", label: "Oui, dans moins d'un an" },
    { key: "1_a_2_ans", label: "Oui, dans un à deux ans" },
    { key: "plus_2_ans", label: "Peut-être, à plus long terme" },
    { key: "curiosite", label: "Non, simple curiosité" },
  ];
  return (
    <section>
      <h1 className="font-serif text-3xl">Envisagez-vous de céder votre établissement ?</h1>
      <div className="mt-6 space-y-3">
        {options.map((o) => {
          const active = draft.saleIntent === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => update({ saleIntent: o.key })}
              className={`block w-full rounded-lg border p-4 text-left transition ${
                active
                  ? "border-primary bg-primary/5 ring-2 ring-primary/40"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Step7({ draft, update }: StepProps) {
  return (
    <section>
      <h1 className="font-serif text-3xl">Avez-vous déjà un prix en tête ?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Facultatif. Cette information reste confidentielle et n'influence pas le calcul de
        votre fourchette : elle nous aide simplement à mieux vous conseiller.
      </p>

      <div className="mt-6">
        <Label htmlFor="price-exp">Prix envisagé (€)</Label>
        <Input
          id="price-exp"
          key={`price-exp-${draft.priceExpectationCents ?? ""}`}
          inputMode="numeric"
          placeholder="Ex. 2 500 000"
          defaultValue={
            draft.priceExpectationCents ? String(draft.priceExpectationCents / 100) : ""
          }
          onBlur={(e) =>
            update({ priceExpectationCents: parseEuros(e.target.value) || undefined })
          }
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Vous pouvez laisser ce champ vide et recevoir directement votre estimation.
        </p>
      </div>
    </section>
  );
}

interface StepProps {
  draft: EstimationDraft;
  update: (patch: Partial<EstimationDraft>) => void;
}

// avoid tree-shake of useMemo import if unused; kept for future readability
void useMemo;
