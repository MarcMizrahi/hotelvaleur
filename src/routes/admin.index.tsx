import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/admin/rapports", replace: true });
  }, [navigate]);
  return <p className="text-muted-foreground">Redirection…</p>;
}
