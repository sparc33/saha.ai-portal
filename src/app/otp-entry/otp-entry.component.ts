import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LOCKOUT_MESSAGES } from '../shared/constants/lockout-messages.constants';

/**
 * OtpEntryComponent — the OTP verification screen in the Patient Portal login flow (VAN-37).
 *
 * PHI hard stops enforced here:
 * - identifier value is held in memory for the API call only — NEVER logged, NEVER displayed.
 * - Only last 4 digits of phone number (maskedPhone) are ever shown in the template.
 * - Error messages are ALWAYS hardcoded strings — NEVER from error.error.message.
 * - OTP value is NEVER placed in a URL, query param, or fragment — POST body only.
 *
 * State is received from the previous login step via Router navigation extras (state).
 * The component reads it in the constructor, which runs during navigation.
 */
@Component({
  selector: 'app-otp-entry',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './otp-entry.component.html',
  styleUrl: './otp-entry.component.scss'
})
export class OtpEntryComponent implements OnDestroy {
  /** OTP digits entered by the patient — digits only, max 6. */
  otpValue: string = '';

  /** True while the verify-OTP API call is in flight. */
  isLoading: boolean = false;

  /** Hardcoded plain-language error string — never from the server response. */
  errorMessage: string | null = null;

  /**
   * True when the backend returns 403 + ACCOUNT_LOCKED after too many incorrect OTP attempts.
   * Disables the OTP input and submit button when set.
   */
  isOtpLocked = false;
  /** Patient-visible OTP lockout message — always sourced from LOCKOUT_MESSAGES (PHI hard stop). */
  otpLockoutMessage = '';

  /** Seconds remaining before the resend button re-enables. */
  countdownSeconds: number = 0;

  /** True while the countdown > 0 (resend rate-limit window). */
  resendDisabled: boolean = false;

  /** True while the resend API call is in flight. */
  resendLoading: boolean = false;

  /**
   * The raw patient identifier — held for the API call only.
   * PHI hard stop: NEVER logged, NEVER displayed in the template.
   */
  readonly identifier: string;

  /** 'mrNumber' or 'phone' — determines which masked display to show. */
  readonly identifierType: 'mrNumber' | 'phone';

  /**
   * Last 4 digits of the phone number, or null for MR-number flow.
   * PHI hard stop: always last-4 only — the full phone never passes through.
   */
  readonly maskedPhone: string | null;

  private readonly destroy$ = new Subject<void>();
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private authService: AuthService, private router: Router) {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as
      | {
          identifier: string;
          identifierType: 'mrNumber' | 'phone';
          maskedPhone: string | null;
        }
      | undefined;

    this.identifier = state?.identifier ?? '';
    this.identifierType = state?.identifierType ?? 'mrNumber';
    this.maskedPhone = state?.maskedPhone ?? null;
  }

  /**
   * Strip non-numeric characters and enforce max length of 6.
   * Called on every (input) event on the OTP field.
   */
  onDigitInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = digits;
    this.otpValue = digits;
  }

  /**
   * Submit the OTP for verification.
   *
   * PHI hard stop: error messages are always hardcoded — NEVER error.error.message.
   * PHI hard stop: OTP is sent as POST body only — never in the URL.
   */
  onSubmit(): void {
    if (this.otpValue.length < 6 || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.authService
      .verifyOtp(this.identifierType, this.identifier, this.otpValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.data?.token) {
            sessionStorage.setItem('auth_token', response.data.token);
          }
          const nextRoute = response.data?.nextRoute;
          if (nextRoute === 'new-patient-intake') {
            this.router.navigate(['/intake/new']);
          } else if (nextRoute === 'returning-patient-dashboard') {
            this.router.navigate(['/intake/returning']);
          } else {
            this.router.navigate(['/login']);
          }
        },
        error: (err) => {
          this.isLoading = false;
          // PHI hard stop: NEVER read err.error.message, err.message, or any server-returned
          // string. Only LOCKOUT_MESSAGES constants are used for patient-visible text.
          //
          // OTP lockout: backend uses the same ACCOUNT_LOCKED code for both login and OTP lockout.
          // Detect by 403 + ACCOUNT_LOCKED code, same as the login component.
          if (err.status === 403 && err.error?.errors?.[0]?.code === 'ACCOUNT_LOCKED') {
            this.isOtpLocked = true;
            this.otpLockoutMessage = LOCKOUT_MESSAGES.OTP_LOCKED;
            return;
          }
          // Remaining status-based error handling (wrong code, expired, unknown).
          const status: number = err?.status;
          if (status === 401) {
            this.errorMessage =
              'The code you entered is incorrect. Please try again.';
          } else if (status === 410) {
            this.errorMessage =
              'Your code has expired. Please request a new one.';
          } else {
            this.errorMessage = 'Something went wrong. Please try again.';
          }
        }
      });
  }

  /**
   * Resend the OTP by calling the same initial-login endpoint.
   * No separate resend endpoint exists per VAN-37 API contract.
   *
   * On success: starts a 30-second countdown during which resend is disabled.
   */
  onResend(): void {
    if (this.resendDisabled || this.resendLoading) {
      return;
    }

    this.resendLoading = true;
    this.errorMessage = null;

    this.authService
      .requestOtp(this.identifierType, this.identifier)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resendLoading = false;
          this.resendDisabled = true;
          this.countdownSeconds = 30;
          this.startCountdown();
        },
        error: () => {
          this.resendLoading = false;
          this.errorMessage = 'Something went wrong. Please try again.';
        }
      });
  }

  private startCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.countdownInterval = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds <= 0) {
        this.countdownSeconds = 0;
        this.resendDisabled = false;
        clearInterval(this.countdownInterval!);
        this.countdownInterval = null;
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}
