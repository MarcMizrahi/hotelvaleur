import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAgentSpace, updateAgentContact } from "@/lib/agent-space.functions";
import { AgentContactForm } from "@/components/agent-contact-form";
import { SectionCard } from "@/components/agent-space-ui";

export const Route = createFileRoute("/espace-agent/coordonnees")({
  component: AgentContactPage,
});

function AgentContactPage() {
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

  if (!data || !data.isAgent) return null;

  return (
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
  );
}
