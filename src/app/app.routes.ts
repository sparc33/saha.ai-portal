import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { OtpEntryComponent } from './otp-entry/otp-entry.component';
import { authGuard } from './guards/auth.guard';
import { ReturningPatientIntakeComponent } from './intake/returning-patient-intake.component';
import { NewPatientIntakeComponent } from './intake/new-patient-intake.component';

// Intake flow components (hackathon AI clinical intake — no authGuard; session-level identity)
import { WelcomeComponent } from './intake/welcome/welcome.component';
import { IdentityComponent } from './intake/identity/identity.component';
import { HistoryReviewComponent } from './intake/history-review/history-review.component';
import { SymptomChatComponent } from './intake/symptom-chat/symptom-chat.component';
import { CompletionComponent } from './intake/completion/completion.component';

// Clinician dashboard components
import { QueueComponent } from './clinician/queue/queue.component';
import { NoteComponent } from './clinician/note/note.component';

export const routes: Routes = [
  // Default redirect to intake welcome (AI clinical intake entry point)
  { path: '', redirectTo: '/intake/welcome', pathMatch: 'full' },

  // Auth routes
  { path: 'login', component: LoginComponent },
  {
    path: 'otp-entry',
    component: OtpEntryComponent
    // VAN-37 — replaced OtpPlaceholderComponent with the real OTP entry screen.
  },

  // Legacy intake routes (VAN-39 — kept for backward compatibility)
  {
    path: 'intake/returning',
    component: ReturningPatientIntakeComponent,
    canActivate: [authGuard]
    // VAN-39 — returning patient intake; guarded by authGuard (requires auth_token in sessionStorage).
  },
  {
    path: 'intake/new',
    component: NewPatientIntakeComponent,
    canActivate: [authGuard]
    // VAN-39 — new patient intake; guarded by authGuard (requires auth_token in sessionStorage).
  },

  // AI Clinical Intake flow (hackathon build — no authGuard; session-level identity)
  { path: 'intake/welcome', component: WelcomeComponent },
  { path: 'intake/identify', component: IdentityComponent },
  { path: 'intake/history-review', component: HistoryReviewComponent },
  { path: 'intake/chat', component: SymptomChatComponent },
  { path: 'intake/complete', component: CompletionComponent },

  // Clinician dashboard (demo — no authGuard)
  { path: 'clinician/queue', component: QueueComponent },
  { path: 'clinician/note/:sessionId', component: NoteComponent },

  { path: '**', redirectTo: '/intake/welcome' }
];
