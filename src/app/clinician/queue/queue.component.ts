import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IntakeService, QueueItem } from '../../services/intake.service';

const REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds

type UrgencyFilter = 'all' | 'emergency' | 'urgent' | 'routine';

/**
 * QueueComponent — /clinician/queue
 *
 * Displays all completed intake sessions for clinician triage review.
 * Auto-refreshes every 30 seconds.
 *
 * PHI: No health data is logged — only session IDs and urgency levels.
 * Patient names are shown on screen (clinician-facing) but not logged.
 */
@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './queue.component.html',
  styleUrls: ['./queue.component.scss']
})
export class QueueComponent implements OnInit, OnDestroy {
  queue: QueueItem[] = [];
  activeFilter: UrgencyFilter = 'all';
  lastRefreshed: Date | null = null;
  isLoading = true;
  errorMessage = '';
  clinicName = 'Saha.ai';

  private refreshHandle: ReturnType<typeof setInterval> | null = null;

  filterTabs: Array<{ label: string; value: UrgencyFilter }> = [
    { label: 'All', value: 'all' },
    { label: 'Emergency', value: 'emergency' },
    { label: 'Urgent', value: 'urgent' },
    { label: 'Routine', value: 'routine' }
  ];

  constructor(
    private intakeService: IntakeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadQueue();
    this.refreshHandle = setInterval(() => this.loadQueue(), REFRESH_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.refreshHandle !== null) {
      clearInterval(this.refreshHandle);
    }
  }

  loadQueue(): void {
    this.intakeService.getClinicianQueue().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && Array.isArray(response.data)) {
          this.queue = response.data;
        } else {
          this.errorMessage = 'Unable to load queue.';
        }
        this.lastRefreshed = new Date();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Unable to load queue. Will retry automatically.';
        this.lastRefreshed = new Date();
      }
    });
  }

  setFilter(filter: UrgencyFilter): void {
    this.activeFilter = filter;
  }

  get filteredQueue(): QueueItem[] {
    if (this.activeFilter === 'all') {
      return this.queue;
    }
    return this.queue.filter(item => item.urgencyLevel === this.activeFilter);
  }

  openNote(sessionId: string): void {
    this.router.navigate(['/clinician/note', sessionId]);
  }

  urgencyColor(level: string | null): string {
    switch (level) {
      case 'emergency': return '#dc2626';
      case 'urgent': return '#d97706';
      case 'routine': return '#16a34a';
      default: return '#9ca3af';
    }
  }

  urgencyLabel(level: string | null): string {
    switch (level) {
      case 'emergency': return 'Emergency';
      case 'urgent': return 'Urgent';
      case 'routine': return 'Routine';
      default: return 'Pending';
    }
  }

  formatTime(isoString: string): string {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  }
}
