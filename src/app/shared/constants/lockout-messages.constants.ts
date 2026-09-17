/**
 * Patient-visible lockout and throttle messages — the single source of truth.
 *
 * PHI hard stops enforced here:
 * - No patient name, date of birth, record number, or any other PHI.
 * - No HTTP status codes, error codes, or technical system detail.
 * - Recovery instruction directs to staff/front desk only — no self-service unlock path.
 *
 * All user-visible lockout strings must come from this file.
 * Components must NEVER render err.error.message, err.message, or any server-returned string.
 */
export const LOCKOUT_MESSAGES = {
  ACCOUNT_LOCKED:
    'Your account has been locked. Please visit the front desk or contact staff for assistance.',
  OTP_LOCKED:
    'Too many incorrect attempts. Your account has been locked. Please visit the front desk or contact staff to continue.',
  THROTTLE: (waitSeconds: number) =>
    `Too many attempts. Please wait ${waitSeconds} second${waitSeconds !== 1 ? 's' : ''} before trying again.`,
} as const;
