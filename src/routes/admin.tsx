import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { checkAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `Administration — ${site.name}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: AdminError,
  component: AdminShell,
});

function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="font-serif text-2xl text-navy">Espace admin indisponible</h1>
        <p className="text-sm text-muted-foreground break-words">{error.message}</p>
        <Button onClick={reset}>Réessayer</Button>
      </div>
    </div>
  );
}

function AdminShell() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "signed-out" }
    | { kind: "error"; message: string }
    | { kind: "not-admin"; email: string }
    | { kind: "admin"; email: string }
  >({ kind: "loading" });
  const check = useServerFn(checkAdmin);

  async function refresh() {
    setState({ kind: "loading" });
    let user: { id: string; email?: string | null } | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user ?? null;
    } catch {
      setState({ kind: "error", message: "Connexion au service impossible." });
      return;
    }
    if (!user) {
      setState({ kind: "signed-out" });
      return;
    }
    const email = user.email ?? "";

    // 1) Vérification serveur (source de vérité).
    try {
      const r = await check();
      setState(r.isAdmin ? { kind: "admin", email } : { kind: "not-admin", email });
      return;
    } catch {
      // 2) Repli client si le serveur est injoignable : lecture du profil.
    }
    try {
      const { data: profile, error } = await supabase
        .from("profile")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      setState(
        profile?.role === "admin" ? { kind: "admin", email } : { kind: "not-admin", email },
      );
    } catch {
      setState({
        kind: "error",
        message: "Impossible de vérifier vos droits. Vérifiez votre connexion puis réessayez.",
      });
    }
  }

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-surface">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="font-serif text-2xl text-navy">Espace admin indisponible</h1>
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <Button onClick={() => refresh()}>Réessayer</Button>
        </div>
      </div>
    );
  }
  if (state.kind === "signed-out") return <RedirectToAuth />;
  if (state.kind === "not-admin") return <AccessDenied email={state.email} />;
  return <AdminLayout email={state.email} />;
}


function AccessDenied({ email }: { email: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface">
      <div className="max-w-md text-center space-y-4">
        <h1 className="font-serif text-2xl text-navy">Accès refusé</h1>
        <p className="text-muted-foreground">
          Le compte {email} n'a pas le rôle administrateur. Connectez-vous avec un compte
          autorisé.
        </p>
        <div className="flex justify-center gap-3">
          <Button
            onClick={async () => {
              await supabase.auth.signOut();
            }}
          >
            Changer de compte
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>

            Retour au site
          </Button>
        </div>
      </div>
    </div>
  );
}


function RedirectToAuth() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/auth", search: { redirect: "/admin" }, replace: true });
  }, [navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Redirection vers la connexion…
    </div>
  );
}

function AdminLayout({ email }: { email: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const nav = [
    { to: "/admin", label: "Tableau de bord", exact: true },
    { to: "/admin/leads", label: "Leads" },
    { to: "/admin/agents", label: "Agents" },
    { to: "/admin/transactions", label: "Transactions" },
    { to: "/admin/coefficients", label: "Coefficients" },
    { to: "/admin/calibrage", label: "Calibrage" },
    { to: "/admin/rapports", label: "Rapports" },
    { to: "/admin/utilisateurs", label: "Utilisateurs" },
    { to: "/admin/parametres", label: "Paramètres" },
  ];

  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-navy text-navy-foreground border-b border-navy/20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-serif text-base sm:text-lg">Administration</div>

            {/* Desktop nav */}
            <nav
              aria-label="Sections admin"
              className="hidden lg:flex flex-1 gap-1 text-sm overflow-x-auto"
            >
              {nav.map((n) => {
                const active = n.exact
                  ? location.pathname === "/admin" || location.pathname === "/admin/"
                  : location.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-md transition-colors ${
                      active ? "bg-white/15" : "hover:bg-white/10"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-navy-foreground/80 hidden xl:inline">{email}</span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/" });
                }}
                className="hidden sm:inline-flex rounded-md border border-white/30 px-3 py-1.5 hover:bg-white/10"
              >
                Déconnexion
              </button>
              <button
                type="button"
                aria-label="Menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="lg:hidden rounded-md border border-white/30 px-3 py-1.5"
              >
                {open ? "Fermer" : "Menu"}
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          {open && (
            <nav
              aria-label="Sections admin"
              className="lg:hidden mt-3 grid gap-1 text-sm border-t border-white/15 pt-3"
            >
              {nav.map((n) => {
                const active = n.exact
                  ? location.pathname === "/admin" || location.pathname === "/admin/"
                  : location.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={`rounded-md px-3 py-2 transition-colors ${
                      active ? "bg-white/15" : "hover:bg-white/10"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
              <div className="mt-2 border-t border-white/15 pt-2">
                <div className="px-3 py-1 text-xs text-navy-foreground/70 break-all">{email}</div>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/" });
                  }}
                  className="w-full text-left rounded-md px-3 py-2 hover:bg-white/10"
                >
                  Déconnexion
                </button>
              </div>
            </nav>
          )}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
