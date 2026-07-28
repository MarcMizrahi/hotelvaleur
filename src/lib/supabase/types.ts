/**
 * Domain-friendly re-exports of the generated Supabase types.
 * The generated file lives at `@/integrations/supabase/types` (auto-managed).
 */
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Estimation = Tables<"estimation">;
export type EstimationInsert = TablesInsert<"estimation">;
export type EstimationUpdate = TablesUpdate<"estimation">;

export type ValuationCoefficient = Tables<"valuation_coefficient">;
export type ValuationCoefficientInsert = TablesInsert<"valuation_coefficient">;
export type ValuationCoefficientUpdate = TablesUpdate<"valuation_coefficient">;

export type AnalyticsEvent = Tables<"analytics_event">;
export type AnalyticsEventInsert = TablesInsert<"analytics_event">;

export type EmailLog = Tables<"email_log">;
export type EmailLogInsert = TablesInsert<"email_log">;

export type Unsubscribe = Tables<"unsubscribe">;

export type Profile = Tables<"profile">;

export type TransactionType = "murs" | "fonds" | "murs_fonds";
export type WorksNeeded = "aucun" | "legers" | "importants";
export type SaleIntent = "moins_1_an" | "1_a_2_ans" | "plus_2_ans" | "curiosite";
export type EstimationStatus =
  | "nouveau"
  | "qualifie"
  | "injoignable"
  | "hors_cible"
  | "archive";
export type ValuationMethod = "ebitda_multiple" | "per_room" | "blended";
