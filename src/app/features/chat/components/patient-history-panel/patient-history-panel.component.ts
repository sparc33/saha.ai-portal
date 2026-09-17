import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PatientHistory } from '../../models/chat.model';

/**
 * Presentational component — optional "returning patient" history panel.
 * Collapsed by default. Editable only while `locked` is false (i.e. before the
 * first message of a conversation is sent); once locked it shows a read-only
 * summary chip if history was provided, or nothing at all otherwise.
 */
@Component({
  selector: 'app-patient-history-panel',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './patient-history-panel.component.html',
  styleUrl: './patient-history-panel.component.scss'
})
export class PatientHistoryPanelComponent {
  locked = input<boolean>(false);
  summary = input<PatientHistory | null>(null);

  save = output<PatientHistory | null>();

  readonly expanded = signal(false);

  readonly allergiesText = signal('');
  readonly chronicText = signal('');
  readonly medicationsText = signal('');
  readonly notes = signal('');

  toggleExpanded(): void {
    this.expanded.update((value) => !value);
  }

  onSave(): void {
    const allergies = this.parseList(this.allergiesText());
    const chronicConditions = this.parseList(this.chronicText());
    const medications = this.parseList(this.medicationsText());
    const notes = this.notes().trim();

    const hasContent =
      allergies.length > 0 || chronicConditions.length > 0 || medications.length > 0 || notes.length > 0;

    const history: PatientHistory | null = hasContent
      ? {
          ...(allergies.length ? { allergies } : {}),
          ...(chronicConditions.length ? { chronicConditions } : {}),
          ...(medications.length ? { medications } : {}),
          ...(notes ? { notes } : {})
        }
      : null;

    this.save.emit(history);
    this.expanded.set(false);
  }

  private parseList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
}
