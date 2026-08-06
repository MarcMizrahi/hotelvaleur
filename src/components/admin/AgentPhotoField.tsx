import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  AGENT_PHOTO_TYPES,
  uploadAgentPhoto,
  validateAgentPhotoFile,
} from "@/lib/agent-photo";

interface Props {
  value: string;
  onChange: (url: string) => void;
}

export function AgentPhotoField({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    const check = validateAgentPhotoFile(file);
    if (!check.ok) {
      toast.error(check.title, { description: check.description });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const url = await uploadAgentPhoto(supabase as any, file);
      onChange(url);
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
          data-testid="agent-photo-input"
          aria-label="Fichier photo de l'agent"
          accept={AGENT_PHOTO_TYPES.join(",")}
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
