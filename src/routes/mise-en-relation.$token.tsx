import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { site } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { formatEurosRange } from "@/lib/money";
import { SALE_HORIZONS, OPERATION_TYPES } from "@/lib/brokerage-matching";
import { getBrokerageContext, submitBrokerageRequest } from "@/lib/brokerage.functions";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/mise-en-relation/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `Être mis en relation avec un expert — ${site.name}` },
      {
        name: "description",
        content:
          "Faites-vous accompagner par un agent spécialisé en hôtellerie pour la cession de votre établissement.",
      },
      { property: "og:title", content: `Être mis en relation avec un expert — ${site.name}` },
      {
        property: "og:description",
        content: "Un interlocuteur spécialisé hôtellerie, sélectionné selon votre région et votre segment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BrokeragePage,
});

interface EstimationCtx {
  id: string;
  hotel_name: string | null;
  city: string | null;
  room_count: number;
  star_rating: number;
  value_low_cents: number;
  value_high_cents: number;
  first_name: string | null;
  phone: string | null;
}

function BrokeragePage() {
  const { token } = Route.useParams();
  const loadCtx = useServerFn(getBrokerageContext);
  const submit = useServerFn(submitBrokerageRequest);

  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "invalid" }
    | { kind: "form"; est: EstimationCtx }
    | { kind: "done"; agentName: string | null }
  >({ kind: "loading" });

  const [saleHorizon, setSaleHorizon] = useState<string>("6_18_mois");
  const [operationType, setOperationType] = useState<string>("murs_fonds");
  const [hasMandate, setHasMandate] = useState(false);
  const [confidential, setConfidential] = useState(false);
  const [availability, setAvailability] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let alive = true;
    loadCtx({ data: { token } })
      .then((r) => {
        if (!alive) return;
        if (!r.ok) return setState({ kind: "invalid" });
        if (r.alreadySubmitted) return setState({ kind: "done", agentName: r.agentName });
        setState({ kind: "form", est: r.estimation as EstimationCtx });
        setPhone((r.estimation as EstimationCtx).phone ?? "");
        void track("brokerage.viewed");
      })
      .catch(() => alive && setState({ kind: "invalid" }));
    return () => {
      alive = false;
    };
  }, [token, loadCtx]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      toast.error("Consentement requis", {
        description: "Cochez la case pour autoriser le partage de vos coordonnées.",
      });
      return;
    }
    setPending(true);
    try {
      const r = await submit({
        data: {
          token,
          saleHorizon: saleHorizon as never,
          operationType: operationType as never,
          hasMandate,
          confidential,
          availability: availability.trim() || null,
          phone: phone.trim() || null,
          message: message.trim() || null,
          consentShare: true,
        },
      });
      void track("brokerage.submitted", { sale_horizon: saleHorizon });
      setState({ kind: "done", agentName: r.agentName });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error("Envoi impossible", {
        description:
          err instanceof Error ? err.message : "Réessayez dans quelques instants.",
      });
    } finally {
      setPending(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        Chargement…
      </main>
    );
  }

  if (state.kind === "invalid") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-serif text-3xl">Lien expiré</h1>
        <p className="mt-3 text-muted-foreground">
          Ce lien de mise en relation n'est plus valide. Relancez une estimation pour en obtenir un
          nouveau.
        </p>
        <Button asChild className="mt-6">
          <Link to="/estimation">Refaire une estimation</Link>
        </Button>
      </main>
    );
  }

  if (state.kind === "done") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-serif text-3xl">Votre demande est enregistrée</h1>
        <p className="mt-4 text-muted-foreground">
          {state.agentName
            ? `Votre interlocuteur : ${state.agentName}. Il vous contacte sous 48 heures ouvrées.`
            : "Nous sélectionnons l'expert le plus pertinent pour votre établissement et revenons vers vous sous 48 heures ouvrées."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/experts">Découvrir nos experts</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/guides">Consulter les guides</Link>
          </Button>
        </div>
      </main>
    );
  }

  const est = state.est;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <p className="text-sm text-muted-foreground">Mise en relation confidentielle</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight">
        Faites-vous accompagner par un expert
      </h1>
      <p className="mt-4 text-muted-foreground">
        {est.hotel_name ? `${est.hotel_name} — ` : ""}
        {est.room_count} chambres, {est.star_rating} étoiles
        {est.city ? `, ${est.city}` : ""}. Fourchette estimée :{" "}
        <strong className="text-foreground">
          {formatEurosRange(est.value_low_cents, est.value_high_cents)}
        </strong>
        .
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Agents spécialisés", "Uniquement des professionnels de l'hôtellerie."],
          ["Réponse sous 48 h", "Un premier échange rapide, sans engagement."],
          ["Discrétion", "Vos coordonnées ne sont partagées qu'avec l'agent retenu."],
        ].map(([t, d]) => (
          <li key={t} className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium">{t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} className="mt-10 space-y-8">
        <fieldset className="rounded-lg border border-border bg-card p-6">
          <legend className="px-2 font-serif text-xl">Votre intention</legend>
          <div className="mt-3 grid gap-2">
            {SALE_HORIZONS.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm has-[:checked]:border-primary"
              >
                <input
                  type="radio"
                  name="horizon"
                  value={o.value}
                  checked={saleHorizon === o.value}
                  onChange={() => setSaleHorizon(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-border bg-card p-6">
          <legend className="px-2 font-serif text-xl">Opération souhaitée</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {OPERATION_TYPES.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm has-[:checked]:border-primary"
              >
                <input
                  type="radio"
                  name="operation"
                  value={o.value}
                  checked={operationType === o.value}
                  onChange={() => setOperationType(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={hasMandate}
                onCheckedChange={(v) => setHasMandate(v === true)}
                id="mandate"
              />
              Un mandat est déjà signé avec une agence
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={confidential}
                onCheckedChange={(v) => setConfidential(v === true)}
                id="confidential"
              />
              Je souhaite une vente discrète (hors annonces publiques)
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-border bg-card p-6 space-y-4">
          <legend className="px-2 font-serif text-xl">Vous joindre</legend>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="availability">Disponibilités pour un échange</Label>
            <Input
              id="availability"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="En semaine, plutôt le matin"
              maxLength={300}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Précisions (facultatif)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1500}
              rows={4}
            />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
            />
            <span>
              J'autorise {site.name} à transmettre mes coordonnées et les données de mon estimation
              à l'agent sélectionné, dans le seul but d'être recontacté.{" "}
              <Link to="/confidentialite" className="underline">
                Politique de confidentialité
              </Link>
              .
            </span>
          </label>
        </fieldset>

        <Button type="submit" size="lg" disabled={pending || !consent}>
          {pending ? "Envoi…" : "Être mis en relation"}
        </Button>
      </form>
    </main>
  );
}
