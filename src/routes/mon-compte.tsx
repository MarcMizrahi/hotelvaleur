import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";

export const Route = createFileRoute("/mon-compte")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `Mon compte — ${site.name}` },
      {
        name: "description",
        content:
          "Votre espace personnel HotelValeur : estimations, mises en relation et gestion de votre compte.",
      },
      { property: "og:title", content: `Mon compte — ${site.name}` },
      {
        property: "og:description",
        content: "Gérez votre compte HotelValeur et retrouvez vos estimations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; email: string; role: string }
  >({ kind: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: "/mon-compte" }, replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profile")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!active) return;
      setState({
        kind: "ready",
        email: data.user.email ?? "",
        role: profile?.role === "admin" ? "admin" : "user",
      });
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  if (state.kind === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="bg-surface">
      <div className="container-page py-16">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="font-serif text-3xl text-navy">Mon compte</h1>
            <p className="mt-2 text-muted-foreground">{state.email}</p>
          </div>

          <div className="rounded-xl border border-border bg-background p-6 space-y-4">
            <h2 className="font-serif text-xl text-navy">Vos actions</h2>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-navy text-navy-foreground hover:bg-navy/90">
                <Link to="/estimation">Estimer mon hôtel</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/mes-donnees">Mes données personnelles</Link>
              </Button>
              {state.role === "admin" && (
                <Button asChild variant="outline">
                  <Link to="/admin">Espace administrateur</Link>
                </Button>
              )}
            </div>
          </div>

          <AccountSettings email={state.email} role={state.role} />
        </div>
      </div>
    </div>
  );
}

