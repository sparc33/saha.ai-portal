import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ReturningPatientIntakeComponent — route entry point for /intake/returning (VAN-39).
 *
 * Stub component: renders a placeholder UI for the returning patient intake flow.
 * ngOnInit contains a TODO for VAN-34 backend integration — PatientHistoryService
 * will trigger history pre-population in a later ticket once VAN-34 is merged.
 *
 * PHI hard stop: no patient health data is stored in component state.
 * Auth token comes from sessionStorage (set by OtpEntryComponent) — not from route params.
 */
@Component({
  selector: 'app-returning-patient-intake',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h1>Welcome Back</h1>
      <p>Loading your health history...</p>
    </div>
  `
})
export class ReturningPatientIntakeComponent implements OnInit {
  ngOnInit(): void {
    // TODO VAN-34: PatientHistoryService.triggerPrePopulation() to be wired once VAN-34 is merged
    void 0; // placeholder — remove when VAN-34 integration is added
  }
}
