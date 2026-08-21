import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { site } from "@/config/site";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: `Connexion et création de compte — ${site.name}` },
      {
        name: "description",
        content:
          "Connectez-vous ou créez votre compte pour retrouver vos estimations d'hôtel et suivre vos mises en relation.",
      },
      { property: "og:title", content: `Connexion — ${site.name}` },
      {
        property: "og:description",
        content:
          "Accédez à votre espace HotelValeur : estimations, mises en relation et espace administrateur.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

/** Crée la ligne de profil (rôle « user ») si elle n'existe pas encore. */
async function ensureProfile(userId: string) {
  const { data } = await supabase
    .from("profile")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (data) return data.role;
  await supabase.from("profile").insert({ id: userId, role: "user" });
  return "user";
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  async function routeAfterLogin(userId: string) {
    const role = await ensureProfile(userId);
    const safe =
      redirect && redirect.startsWith("/") && !redirect.startsWith("//")
        ? redirect
        : null;
    navigate({ to: safe ?? (role === "admin" ? "/admin" : "/mon-compte"), replace: true });
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user) routeAfterLogin(data.user.id);
      else setChecking(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    if (mode === "signin") {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (err || !data.user) {
        setError("Email ou mot de passe incorrect.");
        return;
      }
      await routeAfterLogin(data.user.id);
    } else {
      if (password.length < 8) {
        setLoading(false);
        setError("Le mot de passe doit contenir au moins 8 caractères.");
        return;
      }
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      setLoading(false);
      if (err) {
        setError(
          err.message.toLowerCase().includes("registered")
            ? "Un compte existe déjà avec cet email."
            : "La création du compte a échoué. Réessayez."
        );
        return;
      }
      if (data.session?.user) {
        await routeAfterLogin(data.session.user.id);
        return;
      }
      setInfo(
        "Compte créé. Vérifiez votre boîte mail et cliquez sur le lien de confirmation pour vous connecter."
      );
    }
  }

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="bg-surface">
      <div className="container-page py-16 flex justify-center">
        <div className="w-full max-w-md rounded-xl border border-border bg-background p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-navy">
            {mode === "signin" ? "Connexion" : "Créer un compte"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Un seul espace pour vos estimations, vos mises en relation et
            l'administration.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-surface p-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setInfo(null);
              }}
              className={`rounded-md py-2 transition-colors ${
                mode === "signin" ? "bg-background shadow-sm font-medium text-navy" : ""
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setInfo(null);
              }}
              className={`rounded-md py-2 transition-colors ${
                mode === "signup" ? "bg-background shadow-sm font-medium text-navy" : ""
              }`}
            >
              Créer un compte
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Mot de passe</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}
            {info && (
              <div
                role="status"
                className="rounded-md border border-border bg-surface p-3 text-sm text-foreground"
              >
                {info}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? "Veuillez patienter…"
                : mode === "signin"
                  ? "Se connecter"
                  : "Créer mon compte"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="hover:text-navy underline underline-offset-4">
              Retour au site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
