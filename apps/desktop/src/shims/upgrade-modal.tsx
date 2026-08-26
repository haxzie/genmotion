import type { ReactNode } from "react";
import type { PlanId, UpgradeReason } from "@genmotion/shared";

/**
 * The web components' upgrade contract, wired to nothing.
 *
 * The desktop app's paywall is enforced at export, in the main process, where
 * it can be checked against the API — not by the reused editor components. So
 * this keeps the same exported surface and never gates anything.
 */
export const limitsQueryKey = ["billing-limits"] as const;

export interface PlanPayload {
  id: PlanId;
  name: string;
  seats: number;
  canInvite: boolean;
}

export interface TrialPayload {
  active: boolean;
  daysLeft: number;
  endsAt: string | null;
}

export interface LimitsResponse {
  plan: PlanPayload;
  seats: { used: number; max: number };
  trial: TrialPayload;
  entitled: boolean;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    manageable: boolean;
    paid: boolean;
  };
}

export function UpgradeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

interface UpgradeContextValue {
  openUpgrade: (reason: UpgradeReason) => void;
  handleLimitError: (err: unknown) => boolean;
  handleAuthClientError: (err: unknown) => boolean;
  plan?: PlanPayload;
  seats?: LimitsResponse["seats"];
  trial?: TrialPayload;
  subscription?: LimitsResponse["subscription"];
  canInvite: boolean;
}

export function useUpgrade(): UpgradeContextValue {
  return {
    openUpgrade: (_reason: UpgradeReason) => {},
    handleLimitError: (_err: unknown) => false,
    handleAuthClientError: (_err: unknown) => false,
    plan: undefined,
    seats: undefined,
    trial: undefined,
    subscription: undefined,
    canInvite: false,
  };
}
