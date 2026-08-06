// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentPhotoField } from "@/components/admin/AgentPhotoField";

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...a: any[]) => toastError(...a), success: (...a: any[]) => toastSuccess(...a) },
}));

const upload = vi.fn(async () => ({ data: {}, error: null }));
const createSignedUrl = vi.fn(async (path: string) => ({
  data: { signedUrl: `https://cdn.test/${path}?token=abc` },
  error: null,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ upload, createSignedUrl }) } },
}));

function makeFile(name: string, type: string, size: number) {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

function setup(initial = "") {
  let value = initial;
  const onChange = vi.fn((v: string) => {
    value = v;
    rerender();
  });
  const utils = render(<AgentPhotoField value={value} onChange={onChange} />);
  const rerender = () =>
    utils.rerender(<AgentPhotoField value={value} onChange={onChange} />);
  return { onChange, getValue: () => value };
}

const input = () => screen.getByTestId("agent-photo-input") as HTMLInputElement;

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AgentPhotoField", () => {
  it("affiche l'état vide puis l'aperçu après téléversement", async () => {
    const { onChange } = setup();
    expect(screen.getByText("Aucune")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Téléverser une photo/ })).toBeTruthy();

    await userEvent.upload(input(), makeFile("p.png", "image/png", 1000));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const url = onChange.mock.calls[0][0];
    expect(url).toMatch(/^https:\/\/cdn\.test\/agents\/.+\.png\?token=abc$/);
    const img = screen.getByAltText("Aperçu de la photo de l'agent") as HTMLImageElement;
    expect(img.src).toBe(url);
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("bloque un type non supporté sans appeler le stockage", async () => {
    const { onChange } = setup();
    await userEvent.upload(input(), makeFile("doc.pdf", "application/pdf", 1000));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toBe("Format non supporté");
    expect(upload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("bloque un fichier de plus de 3 Mo", async () => {
    const { onChange } = setup();
    await userEvent.upload(input(), makeFile("big.jpg", "image/jpeg", 4 * 1024 * 1024));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toBe("Fichier trop lourd");
    expect(upload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("permet le remplacement d'une photo existante", async () => {
    const { getValue } = setup("https://cdn.test/agents/old.png");
    expect(screen.getByRole("button", { name: /Remplacer/ })).toBeTruthy();

    await userEvent.upload(input(), makeFile("new.webp", "image/webp", 1000));

    await waitFor(() => expect(getValue()).toMatch(/new|agents\//));
    expect(getValue()).not.toBe("https://cdn.test/agents/old.png");
    expect(getValue()).toMatch(/\.webp\?token=abc$/);
  });

  it("supprime la photo et revient à l'état vide", async () => {
    const { getValue } = setup("https://cdn.test/agents/old.png");
    await userEvent.click(screen.getByRole("button", { name: /Retirer/ }));
    expect(getValue()).toBe("");
    expect(screen.getByText("Aucune")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Retirer/ })).toBeNull();
  });

  it("affiche une erreur si le stockage échoue", async () => {
    upload.mockResolvedValueOnce({ data: null, error: new Error("quota") } as any);
    const { onChange } = setup();
    await userEvent.upload(input(), makeFile("p.png", "image/png", 1000));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toBe("Échec du téléversement");
    expect(onChange).not.toHaveBeenCalled();
  });
});
