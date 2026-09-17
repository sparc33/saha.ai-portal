import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * NewPatientIntakeComponent — route entry point for /intake/new (VAN-39).
 *
 * Stub component: renders a placeholder UI for the new patient intake flow.
 * The full intake form UI is out of scope for VAN-39 (separate ticket).
 *
 * PHI hard stop: no patient health data stored in component state.
 */
@Component({
  selector: 'app-new-patient-intake',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h1>Welcome</h1>
      <p>Let's get started with your intake form.</p>
    </div>
  `
})
export class NewPatientIntakeComponent {}
