import { describe, expect, it, vi } from "vitest";
import {
  AGENT_PHOTO_BUCKET,
  AGENT_PHOTO_MAX_BYTES,
  AGENT_PHOTO_URL_TTL,
  agentPhotoObjectPath,
  photoUrlForPayload,
  uploadAgentPhoto,
  validateAgentPhotoFile,
} from "@/lib/agent-photo";

function makeClient(overrides: Partial<Record<string, any>> = {}) {
  const upload = overrides.upload ?? vi.fn(async () => ({ data: {}, error: null }));
  const createSignedUrl =
    overrides.createSignedUrl ??
    vi.fn(async (path: string) => ({
      data: { signedUrl: `https://cdn.test/${path}?token=abc` },
      error: null,
    }));
  const from = vi.fn(() => ({ upload, createSignedUrl }));
  return { client: { storage: { from } } as any, upload, createSignedUrl, from };
}

const file = (name: string, type: string, size: number) =>
  ({ name, type, size }) as unknown as File;

describe("validation taille / type", () => {
  it("accepte JPG, PNG et WebP sous la limite", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateAgentPhotoFile({ type: t, size: 500_000 }).ok).toBe(true);
    }
  });

  it("refuse un type non image ou non supporté", () => {
    const r = validateAgentPhotoFile({ type: "application/pdf", size: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("type");
      expect(r.description).toMatch(/JPG, PNG ou WebP/);
    }
    expect(validateAgentPhotoFile({ type: "image/gif", size: 1000 }).ok).toBe(false);
  });

  it("refuse un fichier au-dessus de 3 Mo et l'accepte à la limite exacte", () => {
    expect(
      validateAgentPhotoFile({ type: "image/png", size: AGENT_PHOTO_MAX_BYTES }).ok,
    ).toBe(true);
    const r = validateAgentPhotoFile({
      type: "image/png",
      size: AGENT_PHOTO_MAX_BYTES + 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("size");
      expect(r.description).toMatch(/3 Mo/);
    }
  });
});

describe("chemin d'objet", () => {
  it("conserve l'extension en minuscules et isole chaque fichier", () => {
    expect(agentPhotoObjectPath("Photo.JPG", "id-1")).toBe("agents/id-1.jpg");
    expect(agentPhotoObjectPath("sans-extension", "id-2")).toBe("agents/id-2.jpg");
    expect(agentPhotoObjectPath("a.png")).not.toBe(agentPhotoObjectPath("a.png"));
  });
});

describe("téléversement", () => {
  it("téléverse dans le bon bucket et renvoie une URL signée longue durée", async () => {
    const { client, upload, createSignedUrl, from } = makeClient();
    const url = await uploadAgentPhoto(client, file("p.png", "image/png", 1000));

    expect(from).toHaveBeenCalledWith(AGENT_PHOTO_BUCKET);
    const [path, , opts] = upload.mock.calls[0];
    expect(path).toMatch(/^agents\/[0-9a-f-]+\.png$/);
    expect(opts).toMatchObject({ contentType: "image/png", upsert: false });
    expect(createSignedUrl).toHaveBeenCalledWith(path, AGENT_PHOTO_URL_TTL);
    expect(url).toBe(`https://cdn.test/${path}?token=abc`);
  });

  it("remonte l'erreur de stockage", async () => {
    const { client } = makeClient({
      upload: vi.fn(async () => ({ data: null, error: new Error("quota") })),
    });
    await expect(
      uploadAgentPhoto(client, file("p.png", "image/png", 10)),
    ).rejects.toThrow("quota");
  });

  it("remonte une erreur si l'URL signée est indisponible", async () => {
    const { client } = makeClient({
      createSignedUrl: vi.fn(async () => ({ data: null, error: null })),
    });
    await expect(
      uploadAgentPhoto(client, file("p.png", "image/png", 10)),
    ).rejects.toThrow("URL indisponible");
  });

  it("remplacement : un second téléversement produit une nouvelle URL", async () => {
    const { client } = makeClient();
    const a = await uploadAgentPhoto(client, file("a.png", "image/png", 10));
    const b = await uploadAgentPhoto(client, file("b.webp", "image/webp", 10));
    expect(b).not.toBe(a);
    expect(b).toMatch(/\.webp/);
  });
});

describe("mise à jour en base", () => {
  it("envoie l'URL nettoyée et null après suppression", () => {
    expect(photoUrlForPayload("  https://cdn.test/x.png  ")).toBe(
      "https://cdn.test/x.png",
    );
    expect(photoUrlForPayload("")).toBeNull();
    expect(photoUrlForPayload("   ")).toBeNull();
  });
});
