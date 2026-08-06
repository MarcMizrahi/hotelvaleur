import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 3 * 1024 * 1024; // 3 Mo
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const TEN_YEARS = 60 * 60 * 24 * 3650;

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export function AgentPhotoField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Format non supporté", {
        description: "Utilisez une image JPG, PNG ou WebP.",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Fichier trop lourd", {
        description: `Taille max 3 Mo (fichier : ${(file.size / 1024 / 1024).toFixed(1)} Mo).`,
      });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `agents/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("agent-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data, error: signErr } = await supabase.storage
        .from("agent-photos")
        .createSignedUrl(path, TEN_YEARS);
      if (signErr || !data?.signedUrl) throw signErr ?? new Error("URL indisponible");
      onChange(data.signedUrl);
      toast.success("Photo téléversée");
    } catch (e: any) {
      toast.error("Échec du téléversement", {
        description: e?.message ?? "Réessayez dans un instant.",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-muted">
          {value ? (
            <img
              src={value}
              alt="Aperçu de la photo de l'agent"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              Aucune
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Téléversement…" : value ? "Remplacer" : "Téléverser une photo"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => onChange("")}
            >
              Retirer
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        JPG, PNG ou WebP — 3 Mo maximum. Vous pouvez aussi coller une URL https.
      </p>
      <Input
        id="a-photo"
        type="url"
        placeholder="https://…/photo.jpg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
