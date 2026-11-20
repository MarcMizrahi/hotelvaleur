import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";


/** Simulation : calcule les propositions sans rien modifier. */
export const previewCalibration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { runCalibration } = await import("@/lib/calibration.server");
    return await runCalibration({ apply: false, mode: "manual" });
  });

/** Application manuelle du calibrage par un administrateur. */
export const applyCalibration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { userId } = context as never as { userId: string };
    const { runCalibration } = await import("@/lib/calibration.server");
    return await runCalibration({ apply: true, mode: "manual", actor: userId });
  });

/** Journal des exécutions de calibrage. */
export const listCalibrationRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabase } = context as never as { supabase: any };
    const { data } = await supabase
      .from("calibration_run")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    return { runs: data ?? [] };
  });
