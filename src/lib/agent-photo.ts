import type { SupabaseClient } from "@supabase/supabase-js";

export const AGENT_PHOTO_BUCKET = "agent-photos";
export const AGENT_PHOTO_MAX_BYTES = 3 * 1024 * 1024; // 3 Mo
export const AGENT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AGENT_PHOTO_URL_TTL = 60 * 60 * 24 * 3650; // ~10 ans

export type PhotoValidation =
  | { ok: true }
  | { ok: false; code: "type" | "size"; title: string; description: string };

export function validateAgentPhotoFile(file: {
  type: string;
  size: number;
}): PhotoValidation {
  if (!AGENT_PHOTO_TYPES.includes(file.type)) {
    return {
      ok: false,
      code: "type",
      title: "Format non supporté",
      description: "Utilisez une image JPG, PNG ou WebP.",
    };
  }
  if (file.size > AGENT_PHOTO_MAX_BYTES) {
    return {
      ok: false,
      code: "size",
      title: "Fichier trop lourd",
      description: `Taille max 3 Mo (fichier : ${(file.size / 1024 / 1024).toFixed(1)} Mo).`,
    };
  }
  return { ok: true };
}

export function agentPhotoObjectPath(fileName: string, id = crypto.randomUUID()) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return `agents/${id}.${ext}`;
}

/** Téléverse la photo et renvoie une URL signée longue durée (stockée en base). */
export async function uploadAgentPhoto(
  client: SupabaseClient<any, any, any>,
  file: File,
): Promise<string> {
  const path = agentPhotoObjectPath(file.name);
  const storage = client.storage.from(AGENT_PHOTO_BUCKET);
  const { error } = await storage.upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data, error: signErr } = await storage.createSignedUrl(
    path,
    AGENT_PHOTO_URL_TTL,
  );
  if (signErr || !data?.signedUrl) {
    throw signErr ?? new Error("URL indisponible");
  }
  return data.signedUrl;
}

/** Valeur envoyée en base : URL nettoyée, ou null quand la photo est supprimée. */
export function photoUrlForPayload(value: string): string | null {
  return value.trim() || null;
}
