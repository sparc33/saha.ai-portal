import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationStart } from '@angular/router';
import { IntakeService } from '../../services/intake.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

const AUTO_RESET_SECONDS = 3 * 60; // 3 minutes

/**
 * CompletionComponent — /intake/complete
 *
 * Shown after intake session is complete. Calls completeSession on init.
 * Auto-navigates to /intake/welcome after 3 minutes (next patient).
 * Blocks back navigation.
 *
 * PHI hard stop: ZERO clinical output here — no urgency, no note, no score.
 * Session ID only — no patient health content displayed or logged.
 */
@Component({
  selector: 'app-completion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './completion.component.html',
  styleUrls: ['./completion.component.scss']
})
export class CompletionComponent implements OnInit, OnDestroy {
  sessionId: string;
  remainingSeconds = AUTO_RESET_SECONDS;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private routerSub: Subscription | null = null;

  constructor(
    private intakeService: IntakeService,
    private router: Router
  ) {
    const nav = this.router.getCurrentNavigation();
    this.sessionId = nav?.extras?.state?.['sessionId'] ?? '';
  }

  ngOnInit(): void {
    // Complete the session — fire and forget; do not block display on result
    if (this.sessionId) {
      this.intakeService.completeSession(this.sessionId).subscribe({
        next: () => { /* session marked complete */ },
        error: () => { /* non-fatal — display continues */ }
      });
    }

    // Auto-reset countdown
    this.timerHandle = setInterval(() => {
      this.remainingSeconds--;
      if (this.remainingSeconds <= 0) {
        this.navigateToWelcome();
      }
    }, 1000);

    // Block back navigation — redirect forward to /intake/complete
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe((event) => {
        const navEvent = event as NavigationStart;
        if (navEvent.navigationTrigger === 'popstate') {
          this.router.navigate(['/intake/complete'], { replaceUrl: true });
        }
      });
  }

  ngOnDestroy(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
    }
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  get formattedRemaining(): string {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  private navigateToWelcome(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
    }
    this.router.navigate(['/intake/welcome']);
  }
}
