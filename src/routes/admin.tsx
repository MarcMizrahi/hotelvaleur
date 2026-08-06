import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { checkAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  if (state.kind === "signed-out") return <LoginForm />;
  if (state.kind === "not-admin") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-2xl text-navy">Accès refusé</h1>
          <p className="text-muted-foreground">
            Le compte {state.email} n'a pas le rôle administrateur.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
            }}
          >
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }
  return <AdminLayout email={state.email} />;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError("Email ou mot de passe incorrect.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-border bg-background p-8 shadow-sm space-y-4"
        aria-label="Connexion administrateur"
      >
        <div>
          <h1 className="font-serif text-2xl text-navy">Espace administrateur</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accès réservé. Les comptes sont créés manuellement.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-password">Mot de passe</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </div>
  );
}

function AdminLayout({ email }: { email: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const nav = [
    { to: "/admin", label: "Tableau de bord", exact: true },
    { to: "/admin/leads", label: "Leads" },
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
