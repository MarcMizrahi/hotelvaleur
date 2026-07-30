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
  loadDraft,
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
import { useServerFn } from "@tanstack/react-start";

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

const TOTAL_STEPS = 6;

function EstimationPage() {
  const submit = useServerFn(submitEstimation);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<EstimationDraft>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<StoredResult | null>(null);

  useEffect(() => {
    setDraft(loadDraft());
    captureAttribution();
    void track("funnel_vendeur.started");
  }, []);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

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

  const goNext = async () => {
    const err = validateStep(step, draft);
    if (err) {
      setError(err);
      return;
    }
    await track(`funnel_vendeur.step_${step}`);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async () => {
    const err = validateStep(6, draft);
    if (err) {
      setError(err);
      return;
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
          annualRevenueCents: draft.annualRevenueCents ?? null,
          ebitdaCents: draft.ebitdaCents ?? null,
          occupancyRate: draft.occupancyRate ?? null,
          email: draft.email!,
          phone: draft.phone ?? null,
          firstName: draft.firstName ?? null,
          lastName: draft.lastName ?? null,
          saleIntent: draft.saleIntent!,
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
      const msg = e instanceof Error ? e.message : "Une erreur est survenue.";
      setError(msg + " Vos réponses sont conservées, réessayez dans un instant.");
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">
          Étape {step} sur {TOTAL_STEPS}
        </p>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-2 h-1" />
      </div>

      <div className="min-h-[360px]">
        {step === 1 && <Step1 draft={draft} update={update} />}
        {step === 2 && <Step2 draft={draft} update={update} />}
        {step === 3 && <Step3 draft={draft} update={update} />}
        {step === 4 && <Step4 draft={draft} update={update} />}
        {step === 5 && <Step5 draft={draft} update={update} />}
        {step === 6 && <Step6 draft={draft} update={update} />}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} disabled={step === 1 || submitting}>
          ← Retour
        </Button>
        {step < TOTAL_STEPS ? (
          <Button onClick={goNext}>Continuer</Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Calcul en cours…" : "Recevoir mon estimation"}
          </Button>
        )}
      </div>
    </main>
  );
}

// ---------- Validation ----------

function validateStep(step: number, d: EstimationDraft): string | null {
  switch (step) {
    case 1:
      if (!d.regionSlug) return "Sélectionnez votre région.";
      if (!d.departmentCode) return "Sélectionnez votre département.";
      return null;
    case 2:
      if (!d.transactionType) return "Choisissez le type de transaction envisagé.";
      if (d.isEmphyteotic && (!d.emphyteoticYearsRemaining || d.emphyteoticYearsRemaining < 1))
        return "Indiquez la durée restante du bail emphytéotique.";
      return null;
    case 3:
      if (!d.roomCount || d.roomCount < 1 || d.roomCount > 500)
        return "Indiquez un nombre de chambres entre 1 et 500.";
      if (typeof d.starRating !== "number") return "Précisez le classement (0 à 5 étoiles).";
      return null;
    case 4:
      return null; // facultatif
    case 5:
      if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
        return "Une adresse email valide est nécessaire pour recevoir le rapport.";
      if (!d.consentContact)
        return "Merci de cocher l'accord de recontact pour recevoir votre estimation.";
      return null;
    case 6:
      if (!d.saleIntent) return "Indiquez où vous en êtes dans votre projet.";
      return null;
  }
  return null;
}

// ---------- Steps ----------

function Step1({ draft, update }: StepProps) {
  const currentRegion = regions.find((r) => r.slug === draft.regionSlug);
  return (
    <section>
      <h1 className="font-serif text-3xl">Où se situe votre hôtel ?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        La localisation influence fortement la valorisation.
      </p>
      <div className="mt-6 space-y-4">
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
          <Label htmlFor="hotelName">Nom de l'hôtel (facultatif)</Label>
          <Input
            id="hotelName"
            value={draft.hotelName ?? ""}
            placeholder="Ex. Hôtel du Château"
            onChange={(e) => update({ hotelName: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Il reste confidentiel. Il nous sert à repérer une enseigne ou un positionnement
            premium, qui influencent la valorisation.
          </p>
        </div>
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

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    setImportErr(null);
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
        update(found);
        setImportMsg(`Importé depuis ${file.name} : ${labels.join(", ")}.`);
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
          .xlsx, .xls ou .csv contenant chiffre d'affaires, EBITDA et/ou taux d'occupation. Les
          champs ci-dessous seront pré-remplis.
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

interface StepProps {
  draft: EstimationDraft;
  update: (patch: Partial<EstimationDraft>) => void;
}

// avoid tree-shake of useMemo import if unused; kept for future readability
void useMemo;
