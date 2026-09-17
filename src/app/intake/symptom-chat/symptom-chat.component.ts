import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IntakeService } from '../../services/intake.service';

const SESSION_TIMEOUT_SECONDS = 30 * 60; // 30 minutes
const TIMEOUT_WARNING_SECONDS = 2 * 60;  // warn at 2 min remaining

interface ChatMessage {
  role: 'ai' | 'patient';
  content: string;
}

/**
 * SymptomChatComponent — /intake/chat
 *
 * AI-driven symptom collection chat interface.
 * PHI hard stop: message content (symptoms) is NEVER logged.
 * Session IDs may be logged; message text may not.
 *
 * Emergency overlay uses [hidden] (CSS display toggle), not *ngIf,
 * so it stays in the DOM at all times per the PHI/UX requirement.
 */
@Component({
  selector: 'app-symptom-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './symptom-chat.component.html',
  styleUrls: ['./symptom-chat.component.scss']
})
export class SymptomChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageList') private messageListRef!: ElementRef;

  sessionId: string;
  patientType: string;

  messages: ChatMessage[] = [];
  inputText = '';
  isSending = false;
  isComplete = false;
  isEmergency = false;

  remainingSeconds = SESSION_TIMEOUT_SECONDS;
  showTimeoutWarning = false;
  private timerHandle: ReturnType<typeof setInterval> | null = null;

  private shouldScrollToBottom = false;

  constructor(
    private intakeService: IntakeService,
    private router: Router
  ) {
    const nav = this.router.getCurrentNavigation();
    this.sessionId = nav?.extras?.state?.['sessionId'] ?? '';
    this.patientType = nav?.extras?.state?.['patientType'] ?? 'new';
  }

  ngOnInit(): void {
    // Initial AI welcome message — not from API; no PHI
    this.messages.push({
      role: 'ai',
      content: "Hello! I'm here to help gather information for your visit. Please tell me what brings you in today."
    });

    // Session timeout countdown
    this.timerHandle = setInterval(() => {
      this.remainingSeconds--;
      this.showTimeoutWarning = this.remainingSeconds <= TIMEOUT_WARNING_SECONDS && this.remainingSeconds > 0;
      if (this.remainingSeconds <= 0) {
        this.onSessionTimeout();
      }
    }, 1000);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
    }
  }

  get formattedRemaining(): string {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get inputDisabled(): boolean {
    return this.isSending || this.isComplete || this.isEmergency;
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.inputDisabled) {
      return;
    }

    // PHI: symptom text is NOT logged
    this.messages.push({ role: 'patient', content: text });
    this.inputText = '';
    this.isSending = true;
    this.shouldScrollToBottom = true;

    this.intakeService.sendMessage(this.sessionId, text).subscribe({
      next: (response) => {
        this.isSending = false;
        if (response.success && response.data) {
          const { aiResponse, isComplete, isEmergency } = response.data;

          // PHI: aiResponse content is not logged
          if (aiResponse) {
            this.messages.push({ role: 'ai', content: aiResponse });
            this.shouldScrollToBottom = true;
          }

          if (isEmergency) {
            this.isEmergency = true;
          } else if (isComplete) {
            this.isComplete = true;
            setTimeout(() => {
              this.router.navigate(['/intake/complete'], {
                state: { sessionId: this.sessionId }
              });
            }, 1500);
          }
        } else {
          this.messages.push({
            role: 'ai',
            content: 'I encountered an issue. Please try again or speak to front desk staff.'
          });
          this.shouldScrollToBottom = true;
        }
      },
      error: () => {
        this.isSending = false;
        this.messages.push({
          role: 'ai',
          content: 'I encountered a connection issue. Please try again or speak to front desk staff.'
        });
        this.shouldScrollToBottom = true;
      }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private onSessionTimeout(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
    }
    this.messages = [];
    this.router.navigate(['/intake/welcome']);
  }

  private scrollToBottom(): void {
    try {
      const el = this.messageListRef?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch {
      // Scroll failure is non-fatal
    }
  }
}
