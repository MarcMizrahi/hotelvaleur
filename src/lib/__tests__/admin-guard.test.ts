import { describe, it, expect } from "vitest";
import { assertAdmin } from "@/lib/admin-guard";

function fakeClient(result: { data: { role: string | null } | null; error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => result }),
      }),
    }),
  };
}

describe("assertAdmin", () => {
  it("laisse passer un admin", async () => {
    await expect(
      assertAdmin({ supabase: fakeClient({ data: { role: "admin" }, error: null }), userId: "u" }),
    ).resolves.toBeUndefined();
  });

  it("refuse un utilisateur non admin, sans profil, ou en cas d'erreur", async () => {
    for (const r of [
      { data: { role: "user" }, error: null },
      { data: null, error: null },
      { data: { role: "admin" }, error: new Error("db") },
    ]) {
      await expect(assertAdmin({ supabase: fakeClient(r), userId: "u" })).rejects.toThrow(
        "Accès refusé.",
      );
    }
  });
});
