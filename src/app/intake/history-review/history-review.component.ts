import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IntakeService } from '../../services/intake.service';

type Section = 'allergies' | 'conditions' | 'medications';

interface SectionState {
  items: string[];
  editItems: string[];
  editing: boolean;
  acknowledged: boolean;
  saving: boolean;
}

/**
 * HistoryReviewComponent — /intake/history-review
 *
 * Displays patient history on file (allergies, conditions, medications).
 * Allows patient to confirm or edit each section before proceeding.
 *
 * PHI hard stop: history content is patient data — never logged.
 * Session ID is logged only as an ID, not with health content.
 */
@Component({
  selector: 'app-history-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history-review.component.html',
  styleUrls: ['./history-review.component.scss']
})
export class HistoryReviewComponent implements OnInit {
  sessionId: string;
  patientType: string;
  isLoading = true;
  errorMessage = '';

  sections: Record<Section, SectionState> = {
    allergies: { items: [], editItems: [], editing: false, acknowledged: false, saving: false },
    conditions: { items: [], editItems: [], editing: false, acknowledged: false, saving: false },
    medications: { items: [], editItems: [], editing: false, acknowledged: false, saving: false }
  };

  get allAcknowledged(): boolean {
    return (
      this.sections.allergies.acknowledged &&
      this.sections.conditions.acknowledged &&
      this.sections.medications.acknowledged
    );
  }

  constructor(
    private intakeService: IntakeService,
    private router: Router
  ) {
    const nav = this.router.getCurrentNavigation();
    this.sessionId = nav?.extras?.state?.['sessionId'] ?? '';
    this.patientType = nav?.extras?.state?.['patientType'] ?? 'returning';
  }

  ngOnInit(): void {
    this.intakeService.getHistory(this.sessionId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          const d = response.data;
          this.sections.allergies.items = d.allergies ?? [];
          this.sections.conditions.items = d.conditions ?? [];
          this.sections.medications.items = d.medications ?? [];
        } else {
          this.errorMessage = 'Unable to load your health records. You may still proceed.';
        }
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Unable to load your health records. You may still proceed.';
      }
    });
  }

  startEdit(section: Section): void {
    const s = this.sections[section];
    s.editItems = [...s.items];
    s.editing = true;
  }

  addItem(section: Section): void {
    this.sections[section].editItems.push('');
  }

  removeItem(section: Section, index: number): void {
    this.sections[section].editItems.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  saveSection(section: Section): void {
    const s = this.sections[section];
    s.saving = true;

    const cleanedItems = s.editItems.filter(item => item.trim().length > 0);
    // PHI: history content is not logged
    this.intakeService.updateHistory(this.sessionId, { [section]: cleanedItems }).subscribe({
      next: () => {
        s.items = cleanedItems;
        s.editing = false;
        s.acknowledged = true;
        s.saving = false;
      },
      error: () => {
        // Optimistic update — still mark acknowledged so patient can proceed
        s.items = cleanedItems;
        s.editing = false;
        s.acknowledged = true;
        s.saving = false;
      }
    });
  }

  confirmSection(section: Section): void {
    this.sections[section].acknowledged = true;
  }

  proceed(): void {
    this.router.navigate(['/intake/chat'], {
      state: { sessionId: this.sessionId, patientType: this.patientType }
    });
  }
}
