import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IntakeService } from '../../services/intake.service';

/**
 * WelcomeComponent — /intake/welcome
 *
 * Entry point for the patient intake flow. Creates a new session
 * on init and displays clinic branding + AI disclaimer.
 *
 * PHI hard stop: sessionId is not PHI — it is a system-generated ID,
 * safe to hold in component state. No patient health data stored here.
 */
@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {
  clinicName = '';
  sessionId = '';
  isLoading = true;
  errorMessage = '';

  constructor(
    private intakeService: IntakeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.createSession();
  }

  createSession(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.intakeService.createSession('tablet').subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sessionId = response.data.sessionId;
          this.clinicName = response.data.welcomeData?.clinicName ?? 'Our Clinic';
        } else {
          this.errorMessage = 'Unable to start a session. Please try again.';
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to connect. Please check your connection and try again.';
        this.isLoading = false;
      }
    });
  }

  beginCheckIn(): void {
    this.router.navigate(['/intake/identify'], {
      state: { sessionId: this.sessionId }
    });
  }
}
