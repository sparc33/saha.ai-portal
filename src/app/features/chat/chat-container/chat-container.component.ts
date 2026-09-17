import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { MessageInputComponent } from '../components/message-input/message-input.component';
import { MessageListComponent } from '../components/message-list/message-list.component';
import { PatientHistoryPanelComponent } from '../components/patient-history-panel/patient-history-panel.component';
import { ChatMessage, PatientHistory } from '../models/chat.model';
import { ChatService } from '../services/chat.service';

const DISCLAIMER_TEXT =
  "I'm an AI assistant, not a substitute for professional medical advice. " +
  'If this is a medical emergency, call 911 or your local emergency number immediately.';

function createMessage(role: ChatMessage['role'], text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    timestamp: Date.now()
  };
}

/**
 * Container (smart) component for the chat feature.
 * Owns all state (messages, loading, error, session) and delegates every
 * HTTP call to ChatService. Presentational children only receive @Input/@Output.
 */
@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [MessageListComponent, MessageInputComponent, PatientHistoryPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chat-container.component.html',
  styleUrl: './chat-container.component.scss'
})
export class ChatContainerComponent {
  private readonly chatService = inject(ChatService);

  readonly messages = signal<ChatMessage[]>([createMessage('system-notice', DISCLAIMER_TEXT)]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly patientHistory = signal<PatientHistory | null>(null);

  private readonly sessionId = signal<string | null>(this.chatService.getStoredSessionId());

  /** True once a session exists — the point after which patient history can no longer be edited. */
  readonly hasSession = computed(() => this.sessionId() !== null);

  onSavePatientHistory(history: PatientHistory | null): void {
    this.patientHistory.set(history);
  }

  onSend(text: string): void {
    this.error.set(null);
    this.messages.update((current) => [...current, createMessage('user', text)]);
    this.isLoading.set(true);

    // Only the first message of a conversation establishes the session, so
    // patient history is only meaningful there — the backend ignores it afterwards.
    const historyForThisTurn = this.hasSession() ? undefined : this.patientHistory() ?? undefined;

    this.chatService
      .sendMessage(text, this.sessionId(), historyForThisTurn)
      .pipe(
        catchError((err) => {
          const message =
            err?.status === 0
              ? "Can't reach the assistant right now. Please check your connection and try again."
              : 'Something went wrong while sending your message. Please try again.';
          this.error.set(message);
          return of(null);
        })
      )
      .subscribe((response) => {
        this.isLoading.set(false);
        if (!response) {
          return;
        }
        this.sessionId.set(response.sessionId);
        this.chatService.setStoredSessionId(response.sessionId);
        this.messages.update((current) => [...current, createMessage('assistant', response.reply)]);
      });
  }

  onReset(): void {
    this.chatService.clearStoredSessionId();
    this.sessionId.set(null);
    this.error.set(null);
    this.isLoading.set(false);
    this.patientHistory.set(null);
    this.messages.set([createMessage('system-notice', DISCLAIMER_TEXT)]);
  }
}
