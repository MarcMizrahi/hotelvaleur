import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAgentSpace } from "@/lib/agent-space.functions";
import { Button } from "@/components/ui/button";
import { Gate } from "@/components/agent-space-ui";
import { site } from "@/config/site";

const NAV = [
  { to: "/espace-agent", label: "Tableau de bord", exact: true },
  { to: "/espace-agent/estimations", label: "Mes estimations", exact: false },
  { to: "/espace-agent/zones", label: "Par zone", exact: false },
  { to: "/espace-agent/profil", label: "Profil", exact: false },
  { to: "/espace-agent/demandes", label: "Demandes de valorisation", exact: false },
  { to: "/espace-agent/nouvelle-demande", label: "Nouvelle demande", exact: false },
  { to: "/espace-agent/transactions", label: "Transactions en attente", exact: false },
  { to: "/espace-agent/notifications", label: "Notifications", exact: false },
] as const;

export const Route = createFileRoute("/espace-agent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `Espace agent — ${site.name}` },
      {
        name: "description",
        content:
          "Espace sécurisé des agents partenaires HotelValeur : estimations attribuées, mises en relation et coordonnées protégées.",
      },
      { property: "og:title", content: `Espace agent — ${site.name}` },
      {
        property: "og:description",
        content: "Consultez vos estimations attribuées et vos mises en relation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgentSpaceLayout,
});

function AgentSpaceLayout() {
  const navigate = useNavigate();
  const fetchSpace = useServerFn(getAgentSpace);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["agent-space"],
    queryFn: () => fetchSpace(),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Chargement de votre espace…
      </div>
    );
  }

  if (isError) {
    return (
      <Gate
        title="Connexion requise"
        text="Connectez-vous avec l'adresse email de votre fiche agent pour accéder à votre espace sécurisé."
        action={
          <Button
            className="bg-navy text-navy-foreground hover:bg-navy/90"
            onClick={() => navigate({ to: "/auth", search: { redirect: "/espace-agent" } })}
          >
            Se connecter
          </Button>
        }
      />
    );
  }

  if (!data || !data.isAgent) {
    return (
      <Gate
        title="Aucune fiche agent associée"
        text="Votre compte n'est rattaché à aucune fiche agent partenaire. Contactez l'équipe HotelValeur pour obtenir un accès."
        action={
          <Button asChild variant="outline">
            <Link to="/mon-compte">Retour à mon compte</Link>
          </Button>
        }
      />
    );
  }

  const agent = data.agent;

  return (
    <div className="bg-surface min-h-screen">
      <div className="container-page py-10 md:py-16 space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Espace agent sécurisé
          </p>
          <h1 className="font-serif text-3xl text-navy">{agent.full_name}</h1>
          <p className="text-muted-foreground">
            {agent.company ? `${agent.company} · ` : ""}
            {agent.email}
          </p>
        </header>

        <nav className="-mx-4 overflow-x-auto px-4">
          <div className="flex gap-2 border-b border-border min-w-max">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="px-4 py-2 text-sm rounded-t-md text-muted-foreground hover:text-navy transition-colors whitespace-nowrap"
                activeProps={{
                  className:
                    "px-4 py-2 text-sm rounded-t-md bg-background text-navy border border-b-transparent border-border font-medium whitespace-nowrap",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
