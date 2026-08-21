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
  worksCostCents?: number;
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
  // Étape 7 (facultative)
  priceExpectationCents?: number;
}

const KEY = "hv_estimation_draft";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 jours

export interface StoredDraft {
  draft: EstimationDraft;
  step: number;
  updatedAt: number;
}

/** Charge le brouillon + l'étape en cours (localStorage, expire après 7 jours). */
export function loadDraftState(): StoredDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(KEY) ?? window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft> & EstimationDraft;
    // Ancien format : le brouillon était stocké à plat.
    if (!parsed || typeof parsed !== "object") return null;
    if (!("draft" in parsed)) {
      return { draft: parsed as EstimationDraft, step: 1, updatedAt: Date.now() };
    }
    const state = parsed as StoredDraft;
    if (!state.draft || Date.now() - (state.updatedAt ?? 0) > MAX_AGE_MS) {
      clearDraft();
      return null;
    }
    return {
      draft: state.draft,
      step: Math.min(Math.max(1, Math.round(state.step ?? 1)), 6),
      updatedAt: state.updatedAt,
    };
  } catch {
    return null;
  }
}

export function loadDraft(): EstimationDraft {
  return loadDraftState()?.draft ?? {};
}

export function saveDraft(draft: EstimationDraft, step = 1) {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredDraft = { draft, step, updatedAt: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota – ignore */
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
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
  brokerageToken?: string | null;
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
