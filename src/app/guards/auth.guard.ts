import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * authGuard — functional route guard (Angular 17) for VAN-39.
 *
 * Checks for the presence of 'auth_token' in sessionStorage.
 * - Token present → allow route activation (returns true).
 * - Token absent → redirect to /login (returns UrlTree).
 *
 * PHI hard stop: the token value itself is NEVER logged.
 * patientType is not re-checked here — VAN-37's OtpEntryComponent
 * already navigated directly to the correct intake route based on
 * the server's nextRoute value; this guard only verifies the auth session exists.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = sessionStorage.getItem('auth_token');
  if (!token) {
    return router.createUrlTree(['/login']);
  }
  return true;
};
