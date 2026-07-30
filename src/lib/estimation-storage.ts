import type { TransactionType, WorksNeeded, SaleIntent } from "@/lib/supabase/types";

export interface EstimationDraft {
  // Étape 1
  regionSlug?: string;
  departmentCode?: string;
  city?: string;
  // Étape 2
  transactionType?: TransactionType;
  leaseYearsRemaining?: number;
  isEmphyteotic?: boolean;
  emphyteoticYearsRemaining?: number;
  // Étape 3
  hotelName?: string;
  roomCount?: number;
  starRating?: number;
  isIndependent?: boolean;
  hasRestaurant?: boolean;
  hasLicence4?: boolean;
  worksNeeded?: WorksNeeded;
  // Étape 4
  annualRevenueCents?: number;
  ebitdaCents?: number;
  occupancyRate?: number;
  // Étape 5
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  consentContact?: boolean;
  consentMarketing?: boolean;
  // Étape 6
  saleIntent?: SaleIntent;
}

const KEY = "hv_estimation_draft";

export function loadDraft(): EstimationDraft {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EstimationDraft) : {};
  } catch {
    return {};
  }
}

export function saveDraft(draft: EstimationDraft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* quota – ignore */
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

const RESULT_KEY = "hv_last_result";
export interface StoredResult {
  id: string;
  valueLowCents: number;
  valueHighCents: number;
  methodUsed: string;
  draft: EstimationDraft;
  reportSent: boolean;
  outlier: boolean;
}
export function saveResult(r: StoredResult) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(r));
}
export function loadResult(): StoredResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    return raw ? (JSON.parse(raw) as StoredResult) : null;
  } catch {
    return null;
  }
}
