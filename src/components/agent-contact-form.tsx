import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AgentContactForm({
  agent,
  busy,
  onSave,
}: {
  agent: {
    company: string | null;
    phone: string | null;
    bio: string | null;
    monthly_capacity: number;
    is_active: boolean;
    is_public: boolean;
    email: string;
    regions: string[];
  };
  busy: boolean;
  onSave: (v: {
    company: string | null;
    phone: string | null;
    bio: string | null;
    monthly_capacity: number;
    is_active: boolean;
    is_public: boolean;
  }) => void;
}) {
  const [company, setCompany] = useState(agent.company ?? "");
  const [phone, setPhone] = useState(agent.phone ?? "");
  const [bio, setBio] = useState(agent.bio ?? "");
  const [capacity, setCapacity] = useState(String(agent.monthly_capacity));
  const [isActive, setIsActive] = useState(agent.is_active);
  const [isPublic, setIsPublic] = useState(agent.is_public);

  return (
    <form
      className="rounded-xl border border-border bg-background p-6 space-y-5 max-w-2xl"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          company: company.trim() || null,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          monthly_capacity: Number(capacity) || 0,
          is_active: isActive,
          is_public: isPublic,
        });
      }}
    >
      <div>
        <h2 className="font-serif text-xl text-navy">Coordonnées protégées</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Votre email et votre téléphone ne sont jamais affichés publiquement : ils sont
          transmis uniquement aux vendeurs qui vous sont attribués.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Email de contact</Label>
          <Input value={agent.email} readOnly className="bg-surface" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-phone">Téléphone</Label>
          <Input
            id="agent-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6 12 34 56 78"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-company">Société</Label>
          <Input
            id="agent-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-capacity">Capacité mensuelle (dossiers)</Label>
          <Input
            id="agent-capacity"
            type="number"
            min={0}
            max={500}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="agent-bio">Présentation</Label>
        <Textarea
          id="agent-bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Disponible pour recevoir de nouveaux dossiers
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Afficher ma fiche sur l'annuaire public (sans email ni téléphone)
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Zones couvertes : {agent.regions.length ? agent.regions.join(", ") : "—"} (modifiables
        par l'équipe HotelValeur).
      </p>

      <Button
        type="submit"
        disabled={busy}
        className="bg-navy text-navy-foreground hover:bg-navy/90"
      >
        {busy ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
