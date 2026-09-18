import { Component, OnInit } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IntakeService, PatientNoteData } from '../../services/intake.service';

/**
 * NoteComponent — /clinician/note/:sessionId
 *
 * Displays the AI-generated structured note for a given session.
 * Session ID comes from route params (not router state) because this
 * is a URL-param route — it must be deep-linkable.
 *
 * PHI: Clinical note content is displayed on screen (clinician-facing only).
 * It is not logged; only the session ID is used for API calls.
 */
@Component({
  selector: 'app-note',
  standalone: true,
  imports: [CommonModule, SlicePipe],
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss']
})
export class NoteComponent implements OnInit {
  sessionId: string;
  noteData: PatientNoteData | null = null;
  isLoading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private intakeService: IntakeService,
    private router: Router
  ) {
    this.sessionId = this.route.snapshot.paramMap.get('sessionId') ?? '';
  }

  ngOnInit(): void {
    if (!this.sessionId) {
      this.errorMessage = 'Session not found.';
      this.isLoading = false;
      return;
    }

    this.intakeService.getPatientNote(this.sessionId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.noteData = response.data;
        } else {
          this.errorMessage = 'Unable to load patient note.';
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Unable to load patient note. Please try again.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/clinician/queue']);
  }

  urgencyColor(level: string | null | undefined): string {
    switch (level) {
      case 'emergency': return '#dc2626';
      case 'urgent': return '#d97706';
      case 'routine': return '#16a34a';
      default: return '#9ca3af';
    }
  }

  urgencyLabel(level: string | null | undefined): string {
    switch (level) {
      case 'emergency': return 'Emergency';
      case 'urgent': return 'Urgent';
      case 'routine': return 'Routine';
      default: return 'Pending';
    }
  }
}
