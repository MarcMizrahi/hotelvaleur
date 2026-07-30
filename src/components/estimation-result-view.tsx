import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { StoredResult } from "@/lib/estimation-storage";
import { formatEurosRange } from "@/lib/money";
import { regions } from "@/lib/regions";

export function EstimationResultView({ result }: { result: StoredResult }) {
  const d = result.draft;
  const region = regions.find((r) => r.slug === d.regionSlug);
  const dep = region?.departments.find((x) => x.code === d.departmentCode);
  const txLabel =
    d.transactionType === "murs_fonds"
      ? "murs et fonds"
      : d.transactionType === "fonds"
        ? "fonds de commerce"
        : "murs seuls";

  const hasFinancials = !!d.ebitdaCents || !!d.annualRevenueCents;

  return (
    <>
      <p className="text-sm text-muted-foreground">Estimation confidentielle</p>

      <h2 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">Entre</h2>
      <p className="mt-2 font-serif text-5xl leading-tight tabular-nums sm:text-6xl">
        {formatEurosRange(result.valueLowCents, result.valueHighCents)}
      </p>

      <p className="mt-6 text-lg text-muted-foreground">
        {d.hotelName ? `${d.hotelName} — ` : ""}
        Pour un hôtel de {d.roomCount} chambre{(d.roomCount ?? 0) > 1 ? "s" : ""},{" "}
        {d.starRating ? `${d.starRating} étoiles` : "non classé"}
        {dep ? `, dans le ${dep.name}` : ""}, {txLabel}.
      </p>

      <section className="mt-10 rounded-lg border border-border bg-card p-6">
        <h3 className="font-serif text-2xl">La méthode</h3>
        <p className="mt-3 text-sm text-muted-foreground">
          {result.methodUsed === "blended"
            ? "Nous avons combiné le multiple d'EBITDA et le prix par chambre observés dans votre région, en donnant davantage de poids à l'exploitation."
            : "Faute de données financières, nous avons utilisé les prix par chambre observés dans votre région et élargi la fourchette."}
        </p>
        {!hasFinancials && (
          <p className="mt-4 rounded-md bg-muted p-3 text-sm">
            Communiquez votre chiffre d'affaires pour affiner cette estimation.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <h3 className="font-serif text-2xl">Facteurs pris en compte</h3>
        <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground">
          {d.hotelName && <li>Établissement : {d.hotelName}</li>}
          <li>Nombre de chambres : {d.roomCount}</li>
          <li>Classement : {d.starRating ? `${d.starRating} étoiles` : "non classé"}</li>
          <li>Type de transaction : {txLabel}</li>
          {d.worksNeeded && <li>Travaux à prévoir : {d.worksNeeded}</li>}
          {d.hasRestaurant && <li>Restaurant présent</li>}
          {d.hasLicence4 && <li>Licence IV</li>}
          {typeof d.occupancyRate === "number" && (
            <li>Taux d'occupation renseigné : {d.occupancyRate} %</li>
          )}
        </ul>
      </section>

      {result.outlier && (
        <p className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          Les chiffres transmis semblent inhabituels par rapport aux références du secteur. Nous
          vous recommandons de les faire vérifier par un professionnel avant toute décision.
        </p>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        Cette estimation est <strong>indicative</strong>. Elle repose sur des références de marché
        et ne remplace pas l'expertise d'un professionnel, qui prendra en compte l'état de votre
        bien, votre bail, votre clientèle et votre comptabilité réelle.
      </p>

      <p className="mt-6 text-sm">
        {result.reportSent
          ? "Un récapitulatif vient de vous être envoyé par email."
          : "Un récapitulatif détaillé vous sera envoyé par email dans quelques instants."}
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/guides">Consulter les guides</Link>
        </Button>
        {region && (
          <Button asChild variant="ghost">
            <Link to="/prix-hotel/$region" params={{ region: region.slug }}>
              Prix dans votre région
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}
