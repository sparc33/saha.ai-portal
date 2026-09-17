import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IntakeService } from '../../services/intake.service';

/**
 * IdentityComponent — /intake/identify
 *
 * Verifies returning patient identity via date of birth + MR number or phone.
 * PHI hard stop: mismatch details are NEVER displayed; only a generic message is shown.
 * PHI hard stop: identifier values are not logged anywhere in this component.
 */
@Component({
  selector: 'app-identity',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './identity.component.html',
  styleUrls: ['./identity.component.scss']
})
export class IdentityComponent {
  sessionId: string;
  identityForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private intakeService: IntakeService,
    private router: Router
  ) {
    // Read sessionId from router navigation state — must be done in constructor
    const nav = this.router.getCurrentNavigation();
    this.sessionId = nav?.extras?.state?.['sessionId'] ?? '';

    this.identityForm = this.fb.group({
      dateOfBirth: ['', [Validators.required]],
      identifierType: ['mrNumber', [Validators.required]],
      identifier: ['', [Validators.required]]
    });
  }

  get identifierType(): string {
    return this.identityForm.get('identifierType')?.value ?? 'mrNumber';
  }

  get identifierLabel(): string {
    return this.identifierType === 'mrNumber' ? 'Medical Record Number' : 'Phone Number';
  }

  get identifierPlaceholder(): string {
    return this.identifierType === 'mrNumber' ? 'Enter MR number' : 'Enter phone number';
  }

  onSubmit(): void {
    if (this.identityForm.invalid || this.isSubmitting) {
      this.identityForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const { dateOfBirth, identifierType, identifier } = this.identityForm.value;

    // PHI: dateOfBirth and identifier values are NOT logged
    this.intakeService.identifyPatient(this.sessionId, {
      dateOfBirth,
      identifierType,
      identifier
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success && response.data) {
          const result = response.data.result;
          if (result === 'recognised') {
            this.router.navigate(['/intake/history-review'], {
              state: { sessionId: this.sessionId, patientType: 'returning' }
            });
          } else {
            // 'unrecognised' or 'ambiguous' → treat as new patient
            this.router.navigate(['/intake/chat'], {
              state: { sessionId: this.sessionId, patientType: 'new' }
            });
          }
        } else {
          // Generic error — PHI: never show mismatch reason
          this.errorMessage = "We couldn't verify your identity. Please proceed or speak to front desk.";
        }
      },
      error: () => {
        this.isSubmitting = false;
        // Generic error — PHI: never show mismatch reason
        this.errorMessage = "We couldn't verify your identity. Please proceed or speak to front desk.";
      }
    });
  }

  skipToChat(): void {
    this.router.navigate(['/intake/chat'], {
      state: { sessionId: this.sessionId, patientType: 'new' }
    });
  }
}
