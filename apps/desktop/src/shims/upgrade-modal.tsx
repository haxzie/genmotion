import type { ReactNode } from "react";
import type { LimitKind, LimitSnapshot, PlanId, UpgradeReason } from "@genmotion/shared";

/**
 * There are no quotas in the desktop app — the user pays their own model
 * provider — so this keeps the web components' contract while never gating
 * anything. Same exported surface as `@/components/upgrade-modal`.
 */
export const limitsQueryKey = ["billing-limits"] as const;

export interface PlanPayload {
  id: PlanId;
  name: string;
  seats: number;
  canInvite: boolean;
  prioritySupport: boolean;
}

export interface LimitsResponse {
  plan: PlanPayload;
  limits: LimitSnapshot;
  seats: { used: number; max: number };
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
  limits?: LimitSnapshot;
  plan?: PlanPayload;
  seats?: LimitsResponse["seats"];
  subscription?: LimitsResponse["subscription"];
  canInvite: boolean;
  isExhausted: (kind: LimitKind) => boolean;
}

export function useUpgrade(): UpgradeContextValue {
  return {
    openUpgrade: (_reason: UpgradeReason) => {},
    handleLimitError: (_err: unknown) => false,
    handleAuthClientError: (_err: unknown) => false,
    limits: undefined,
    plan: undefined,
    seats: undefined,
    subscription: undefined,
    canInvite: false,
    isExhausted: (_kind: LimitKind) => false,
  };
}
