import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listUsers, setUserRole } from "@/lib/backoffice.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/utilisateurs")({
  component: UsersPage,
});

function UsersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listUsers);
  const roleFn = useServerFn(setUserRole);

  const users = useQuery({ queryKey: ["admin", "users"], queryFn: () => listFn() });

  const setRole = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "viewer" }) => roleFn({ data: v }),
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = users.data?.users ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground">
          Attribuez ou retirez le rôle administrateur. Vous ne pouvez pas modifier votre propre
          rôle.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-background p-4 overflow-x-auto">
        <table className="min-w-[640px] w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2">E-mail</th>
              <th className="py-2">Rôle</th>
              <th className="py-2">Inscription</th>
              <th className="py-2">Dernière connexion</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="py-2">{u.email}</td>
                <td className="py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      u.role === "admin"
                        ? "bg-navy text-navy-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {u.role === "admin" ? "Administrateur" : "Utilisateur"}
                  </span>
                </td>
                <td className="py-2 whitespace-nowrap">
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="py-2 whitespace-nowrap">
                  {u.lastSignInAt
                    ? new Date(u.lastSignInAt).toLocaleDateString("fr-FR")
                    : "—"}
                </td>
                <td className="py-2 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={setRole.isPending}
                    onClick={() =>
                      setRole.mutate({
                        userId: u.id,
                        role: u.role === "admin" ? "viewer" : "admin",
                      })
                    }
                  >
                    {u.role === "admin" ? "Retirer admin" : "Passer admin"}
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !users.isLoading && (
              <tr>
                <td colSpan={5} className="py-3 text-muted-foreground">
                  Aucun compte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
