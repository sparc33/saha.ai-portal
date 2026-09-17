import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  ValidatorFn,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { LOCKOUT_MESSAGES } from '../shared/constants/lockout-messages.constants';

/**
 * LoginComponent — the entry screen of the Patient Portal OTP-based login flow.
 *
 * Regulatory requirement AC-031.8: the AI disclaimer MUST always be visible and non-dismissible.
 *
 * PHI hard stops enforced here:
 * - Identifier values (MR number, phone) are NEVER logged.
 * - apiError message on HTTP failure is ALWAYS the generic string — never the response body.
 * - The AI disclaimer is rendered unconditionally — never inside *ngIf or any conditional.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnDestroy {
  loginForm: FormGroup;
  identifierType: 'mrNumber' | 'phone' = 'mrNumber';
  isLoading = false;
  apiError: string | null = null;

  /** True when the backend returns an ACCOUNT_LOCKED error (403 + code). */
  isAccountLocked = false;
  /** Patient-visible lockout message — always sourced from LOCKOUT_MESSAGES (PHI hard stop). */
  lockoutMessage = '';
  /** Patient-visible throttle message — always sourced from LOCKOUT_MESSAGES (PHI hard stop). */
  throttleMessage = '';

  /** Generic error message — never expose response body detail (PHI hard stop). */
  private readonly GENERIC_ERROR =
    'We could not process your request. Please check your details and try again.';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      identifierValue: ['', [Validators.required, this.formatValidator()]]
    });

    // Clear stale throttle message when the patient edits the identifier field.
    // PHI hard stop: the subscription callback never reads the field value itself.
    this.loginForm.get('identifierValue')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.throttleMessage = '';
      });
  }

  /**
   * Returns a ValidatorFn that validates the format based on current identifierType.
   *
   * MR number: /^MR\d{7}$/ (e.g. MR1234567)
   * Phone:     /^[6-9]\d{9}$/ (Indian mobile — 10 digits starting 6-9)
   */
  formatValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value: string = control.value ?? '';
      if (!value) {
        return null; // required validator handles empty
      }
      const pattern =
        this.identifierType === 'mrNumber'
          ? /^MR\d{7}$/
          : /^[6-9]\d{9}$/;
      return pattern.test(value) ? null : { pattern: true };
    };
  }

  /** Switch identifier type, clear the field value and errors, re-apply validators. */
  switchType(type: 'mrNumber' | 'phone'): void {
    this.identifierType = type;
    this.apiError = null;
    this.throttleMessage = '';
    this.isAccountLocked = false;
    this.lockoutMessage = '';
    const ctrl = this.loginForm.get('identifierValue');
    ctrl?.reset('');
    ctrl?.setValidators([Validators.required, this.formatValidator()]);
    ctrl?.updateValueAndValidity();
  }

  onSubmit(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.apiError = null;

    const identifier: string = this.loginForm.value.identifierValue;
    // PHI hard stop: identifier value is NOT logged — only a generic event label.

    this.authService
      .requestOtp(this.identifierType, identifier)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          // PHI hard stop: only last 4 digits of phone are passed as maskedPhone.
          // identifier is passed for the verify-otp API call — held in memory only,
          // never logged, never displayed to the user.
          const maskedPhone =
            this.identifierType === 'phone'
              ? identifier.slice(-4) // last 4 digits only — PHI hard stop
              : null;
          this.router.navigate(['/otp-entry'], {
            state: {
              identifier,
              identifierType: this.identifierType,
              maskedPhone
            }
          });
        },
        error: (err) => {
          this.isLoading = false;
          // PHI hard stop: NEVER read err.error.message, err.message, or any server-returned
          // string. Only LOCKOUT_MESSAGES constants are used for patient-visible text.
          //
          // Check for account lockout (403 + ACCOUNT_LOCKED code) first.
          if (err.status === 403 && err.error?.errors?.[0]?.code === 'ACCOUNT_LOCKED') {
            this.isAccountLocked = true;
            this.lockoutMessage = LOCKOUT_MESSAGES.ACCOUNT_LOCKED;
            return;
          }
          // Check for session throttle (429 — no Retry-After header; fixed 60-second display).
          if (err.status === 429) {
            this.throttleMessage = LOCKOUT_MESSAGES.THROTTLE(60);
            return;
          }
          // PHI hard stop: The generic message is identical regardless of whether the patient
          // exists — never expose the HTTP error body.
          this.apiError = this.GENERIC_ERROR;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
