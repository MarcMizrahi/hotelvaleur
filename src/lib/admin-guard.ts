/**
 * Garde d'accès partagée par les server functions du back-office.
 * Vérifie, avec le client Supabase de l'utilisateur (RLS appliquée), que
 * son profil porte le rôle « admin ». Lève une erreur sinon.
 */

interface ProfileQueryClient {
  from(table: "profile"): {
    select(columns: "role"): {
      eq(
        column: "id",
        value: string,
      ): {
        maybeSingle(): PromiseLike<{
          data: { role: string | null } | null;
          error: unknown;
        }>;
      };
    };
  };
}

export async function assertAdmin(ctx: { supabase: unknown; userId: string }): Promise<void> {
  const client = ctx.supabase as ProfileQueryClient;
  const { data, error } = await client
    .from("profile")
    .select("role")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (error || data?.role !== "admin") throw new Error("Accès refusé.");
}
