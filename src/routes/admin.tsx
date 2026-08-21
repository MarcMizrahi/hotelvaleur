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
  component: AdminShell,
});

function AdminShell() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "signed-out" }
    | { kind: "not-admin"; email: string }
    | { kind: "admin"; email: string }
  >({ kind: "loading" });
  const check = useServerFn(checkAdmin);

  async function refresh() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setState({ kind: "signed-out" });
      return;
    }
    try {
      const r = await check();
      setState(
        r.isAdmin
          ? { kind: "admin", email: data.user.email ?? "" }
          : { kind: "not-admin", email: data.user.email ?? "" }
      );
    } catch {
      setState({ kind: "not-admin", email: data.user.email ?? "" });
    }
  }

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement…
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
    { to: "/admin/mise-en-relation", label: "Mise en relation" },
    { to: "/admin/agents", label: "Agents" },
    { to: "/admin/coefficients", label: "Coefficients" },
    { to: "/admin/benchmarks", label: "Benchmarks" },
    { to: "/admin/transactions", label: "Transactions" },
    { to: "/admin/emails", label: "Emails" },
  ];
  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-navy text-navy-foreground border-b border-navy/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="font-serif text-lg">Administration</div>
            <nav aria-label="Sections admin" className="flex gap-1 text-sm">
              {nav.map((n) => {
                const active = n.exact
                  ? location.pathname === n.to
                  : location.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      active ? "bg-white/15" : "hover:bg-white/10"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-navy-foreground/80 hidden sm:inline">{email}</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
              className="rounded-md border border-white/30 px-3 py-1.5 hover:bg-white/10"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
