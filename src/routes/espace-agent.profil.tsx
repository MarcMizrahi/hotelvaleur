import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAgentSpace, updateAgentContact } from "@/lib/agent-space.functions";
import { AgentContactForm } from "@/components/agent-contact-form";
import { SectionCard } from "@/components/agent-space-ui";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/espace-agent/profil")({
  component: AgentProfilePage,
});

function AgentProfilePage() {
  const queryClient = useQueryClient();
  const fetchSpace = useServerFn(getAgentSpace);

  const { data } = useQuery({
    queryKey: ["agent-space"],
    queryFn: () => fetchSpace(),
    retry: false,
  });

  const saveContact = useMutation({
    mutationFn: useServerFn(updateAgentContact),
    onSuccess: () => {
      toast.success("Coordonnées mises à jour.");
      queryClient.invalidateQueries({ queryKey: ["agent-space"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    } as never);
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Mot de passe mis à jour.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  if (!data || !data.isAgent) return null;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Mes coordonnées"
        description="Vos informations de contact et votre visibilité dans l'annuaire."
      >
        <AgentContactForm
          agent={data.agent}
          busy={saveContact.isPending}
          onSave={(values) => saveContact.mutate({ data: values })}
        />
      </SectionCard>

      <SectionCard
        title="Mot de passe"
        description="Modifiez le mot de passe de votre compte agent."
      >
        <form onSubmit={handlePasswordSubmit} className="grid gap-4 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Button
              type="submit"
              disabled={savingPassword}
              className="bg-navy text-navy-foreground hover:bg-navy/90"
            >
              {savingPassword ? "Enregistrement…" : "Modifier le mot de passe"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
