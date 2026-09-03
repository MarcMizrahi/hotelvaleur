import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listMyAgentRequests, submitAgentRequest } from "@/lib/agent-space.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Empty, SectionCard } from "@/components/agent-space-ui";
import { regions } from "@/lib/regions";

export const Route = createFileRoute("/espace-agent/nouvelle-demande")({
  component: NewAgentRequestPage,
});

const OPERATIONS = [
  { id: "murs_fonds", label: "Murs et fonds" },
  { id: "fonds", label: "Fonds de commerce" },
  { id: "murs", label: "Murs seuls" },
  { id: "bail", label: "Bail" },
] as const;

const URGENCIES = [
  { id: "normale", label: "Normale" },
  { id: "prioritaire", label: "Prioritaire" },
  { id: "urgente", label: "Urgente" },
] as const;

const STATUS: Record<string, string> = {
  nouveau: "Nouvelle",
  en_cours: "En cours",
  traite: "Traitée",
  refuse: "Refusée",
};

const EMPTY = {
  hotelName: "",
  city: "",
  regionSlug: "",
  departmentCode: "",
  roomCount: "",
  starRating: "",
  transactionType: "murs_fonds",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  urgency: "normale",
  message: "",
};

function NewAgentRequestPage() {
  const queryClient = useQueryClient();
  const fetchMine = useServerFn(listMyAgentRequests);
  const [form, setForm] = useState({ ...EMPTY });

  const { data, isLoading } = useQuery({
    queryKey: ["agent-my-requests"],
    queryFn: () => fetchMine(),
    retry: false,
  });

  const submit = useMutation({
    mutationFn: useServerFn(submitAgentRequest),
    onSuccess: () => {
      toast.success("Demande envoyée à l'administration HotelValeur.");
      setForm({ ...EMPTY });
      queryClient.invalidateQueries({ queryKey: ["agent-my-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function set(key: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.hotelName.trim().length < 2) {
      toast.error("Indiquez le nom de l'hôtel.");
      return;
    }
    submit.mutate({
      data: {
        hotelName: form.hotelName.trim(),
        city: form.city.trim() || null,
        regionSlug: form.regionSlug || null,
        departmentCode: form.departmentCode.trim() || null,
        roomCount: form.roomCount ? Number(form.roomCount) : null,
        starRating: form.starRating !== "" ? Number(form.starRating) : null,
        transactionType: form.transactionType as "murs_fonds" | "fonds" | "murs" | "bail",
        contactName: form.contactName.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        contactPhone: form.contactPhone.trim() || null,
        urgency: form.urgency as "normale" | "prioritaire" | "urgente",
        message: form.message.trim() || null,
      },
    });
  }

  const requests = data?.requests ?? [];

  return (
    <div className="space-y-10">
      <SectionCard
        title="Nouvelle demande de valorisation"
        description="Transmettez un dossier à l'administration HotelValeur. Il apparaîtra immédiatement sur votre fiche dans l'espace admin."
      >
        <form
          onSubmit={onSubmit}
          className="grid gap-4 rounded-xl border border-border bg-background p-6 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Label htmlFor="hotelName">Nom de l'hôtel *</Label>
            <Input
              id="hotelName"
              value={form.hotelName}
              onChange={(e) => set("hotelName", e.target.value)}
              maxLength={160}
              required
            />
          </div>

          <div>
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              maxLength={120}
            />
          </div>

          <div>
            <Label htmlFor="regionSlug">Région</Label>
            <select
              id="regionSlug"
              value={form.regionSlug}
              onChange={(e) => set("regionSlug", e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {regions.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="departmentCode">Département</Label>
            <Input
              id="departmentCode"
              value={form.departmentCode}
              onChange={(e) => set("departmentCode", e.target.value)}
              maxLength={5}
              placeholder="75"
            />
          </div>

          <div>
            <Label htmlFor="roomCount">Nombre de chambres</Label>
            <Input
              id="roomCount"
              type="number"
              min={1}
              max={2000}
              value={form.roomCount}
              onChange={(e) => set("roomCount", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="starRating">Catégorie</Label>
            <select
              id="starRating"
              value={form.starRating}
              onChange={(e) => set("starRating", e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {[0, 1, 2, 3, 4, 5].map((s) => (
                <option key={s} value={s}>
                  {s === 0 ? "Non classé" : `${s}★`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="transactionType">Type d'opération</Label>
            <select
              id="transactionType"
              value={form.transactionType}
              onChange={(e) => set("transactionType", e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {OPERATIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="contactName">Contact propriétaire</Label>
            <Input
              id="contactName"
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              maxLength={120}
            />
          </div>

          <div>
            <Label htmlFor="contactEmail">Email du contact</Label>
            <Input
              id="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="contactPhone">Téléphone du contact</Label>
            <Input
              id="contactPhone"
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
              maxLength={40}
            />
          </div>

          <div>
            <Label htmlFor="urgency">Urgence</Label>
            <select
              id="urgency"
              value={form.urgency}
              onChange={(e) => set("urgency", e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {URGENCIES.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="message">Contexte du dossier</Label>
            <Textarea
              id="message"
              rows={4}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              maxLength={2000}
              placeholder="Historique, éléments financiers, attentes du propriétaire…"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <Button
              type="submit"
              disabled={submit.isPending}
              className="bg-navy text-navy-foreground hover:bg-navy/90"
            >
              {submit.isPending ? "Envoi…" : "Envoyer à l'administration"}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Mes demandes envoyées"
        description="Suivi du traitement par l'équipe HotelValeur."
      >
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          {isLoading ? (
            <Empty text="Chargement…" />
          ) : requests.length === 0 ? (
            <Empty text="Aucune demande envoyée pour le moment." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Hôtel</th>
                    <th className="p-3">Lieu</th>
                    <th className="p-3">Urgence</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3">Envoyée le</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r: any) => (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="p-3">
                        <div className="font-medium">{r.hotel_name}</div>
                        <div className="text-muted-foreground">
                          {[r.room_count ? `${r.room_count} ch.` : null,
                            r.star_rating != null ? `${r.star_rating}★` : null]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {r.city ?? r.region_slug ?? "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">{r.urgency}</td>
                      <td className="p-3">
                        <div>{STATUS[r.status] ?? r.status}</div>
                        {r.admin_notes && (
                          <div className="text-muted-foreground">{r.admin_notes}</div>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
