import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Presentational component — the composer bar (textarea + send button).
 * Emits the trimmed message text via `send`; owns only local draft state.
 */
@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message-input.component.html',
  styleUrl: './message-input.component.scss'
})
export class MessageInputComponent {
  disabled = input<boolean>(false);
  send = output<string>();

  draft = signal('');

  onSubmit(): void {
    const trimmed = this.draft().trim();
    if (!trimmed || this.disabled()) {
      return;
    }
    this.send.emit(trimmed);
    this.draft.set('');
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSubmit();
    }
  }
}
