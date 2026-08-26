/** No plans, no checkout: the desktop app runs on the user's own agent. */
export type PurchasablePlan = "pro" | "team";

export async function startCheckout(_plan: PurchasablePlan): Promise<void> {}
export async function openBillingPortal(): Promise<void> {}
