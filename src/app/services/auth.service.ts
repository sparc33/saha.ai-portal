import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Response shape for POST /auth/verify-otp (VAN-37).
 * Standard JSON envelope per PROJECT_CONFIG.md response conventions.
 *
 * PHI hard stop: callers must NEVER display data.token or any server-provided
 * message directly to the user — always use hardcoded error strings instead.
 */
export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    expiresIn: number;
    patientId: string;
    patientType: 'new' | 'returning';
    nextRoute: string;
  };
  errors?: unknown[];
}

/**
 * AuthService — encapsulates all authentication API calls.
 *
 * PHI hard stops enforced here:
 * - Identifier values (MR number, phone) are NEVER logged — not even on error.
 * - OTP values are NEVER logged.
 * - Error propagation is left to the caller — this service does not swallow errors
 *   or expose response body detail; callers must display only a generic message.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  /**
   * Request a one-time passcode for the given patient identifier.
   *
   * Calls POST /auth/login per VAN-33's contract.
   * Body: { identifier: string, identifierType: 'mrNumber' | 'phone' }
   * Success: { success: true, data: null, message: string, errors: [] }
   * Error: { success: false, data: null, message: string, errors: [] } — HTTP 400/500
   *
   * IMPORTANT: The identifier value is NOT logged anywhere in this method.
   * Used for both initial OTP request and resend (same endpoint per VAN-37).
   */
  requestOtp(
    identifierType: 'mrNumber' | 'phone',
    identifier: string
  ): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/auth/login`, {
      identifier,
      identifierType
    });
  }

  /**
   * Verify the one-time passcode entered by the patient.
   *
   * Calls POST /auth/verify-otp per VAN-37's contract.
   * Body: { identifier, identifierType, otp }
   * OTP is NEVER passed as a URL param or query param — POST body only.
   *
   * IMPORTANT: identifier and otp values are NOT logged anywhere in this method.
   */
  verifyOtp(
    identifierType: 'mrNumber' | 'phone',
    identifier: string,
    otp: string
  ): Observable<VerifyOtpResponse> {
    return this.http.post<VerifyOtpResponse>(
      `${environment.apiUrl}/auth/verify-otp`,
      { identifier, identifierType, otp }
    );
  }
}
