import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Paramètres de compte communs (admin et utilisateur) :
 * identité, changement d'email, changement de mot de passe, session.
 */
export function AccountSettings({ email, role }: { email: string; role: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"email" | "password" | null>(null);

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setBusy("email");
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      setNewEmail("");
      toast.success("Un email de confirmation vous a été envoyé à la nouvelle adresse.");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy("password");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      setPassword("");
      setConfirm("");
      toast.success("Mot de passe mis à jour.");
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: {}, replace: true });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-background p-6">
        <h2 className="font-serif text-xl text-navy">Identité</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Adresse email</dt>
            <dd className="font-medium text-navy break-all">{email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Rôle</dt>
            <dd className="font-medium text-navy">
              {role === "admin" ? "Administrateur" : "Utilisateur"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-background p-6">
        <h2 className="font-serif text-xl text-navy">Changer d'adresse email</h2>
        <form onSubmit={changeEmail} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new-email">Nouvelle adresse</Label>
            <Input
              id="new-email"
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nouvelle@adresse.fr"
            />
          </div>
          <Button type="submit" disabled={busy === "email"}>
            {busy === "email" ? "Envoi…" : "Mettre à jour"}
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          La nouvelle adresse doit être confirmée via le lien envoyé par email.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-background p-6">
        <h2 className="font-serif text-xl text-navy">Changer de mot de passe</h2>
        <form onSubmit={changePassword} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirmation</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy === "password"}>
              {busy === "password" ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-background p-6 flex items-center justify-between gap-4">
        <div>
          <div className="font-medium text-navy">Session</div>
          <p className="text-sm text-muted-foreground">
            Déconnectez-vous si vous utilisez un ordinateur partagé.
          </p>
        </div>
        <Button variant="outline" onClick={signOut}>
          Déconnexion
        </Button>
      </section>
    </div>
  );
}
