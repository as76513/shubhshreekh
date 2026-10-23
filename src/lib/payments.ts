/**
 * January 2027 switch. Keep this false while the Play listing is free.
 * Set it true together with backend/internal/billing.PaymentsEnabled to
 * bring back prices, Upgrade to Pro, and the trial lock.
 */
export const paymentsEnabled = false;

/** Full access while payments are off. When they are on, only Pro qualifies. */
export function hasFullAccess(subscription?: string | null): boolean {
  return !paymentsEnabled || subscription === "pro";
}
