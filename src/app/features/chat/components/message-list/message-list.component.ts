import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  viewChild
} from '@angular/core';
import { ChatMessage } from '../../models/chat.model';

/**
 * Presentational component — renders the scrollable conversation thread.
 * Owns no state or services; purely driven by @Input signals.
 */
@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message-list.component.html',
  styleUrl: './message-list.component.scss'
})
export class MessageListComponent implements AfterViewChecked {
  messages = input.required<ChatMessage[]>();
  isLoading = input<boolean>(false);

  private readonly scrollAnchor = viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');
  private lastMessageCount = 0;

  ngAfterViewChecked(): void {
    const currentCount = this.messages().length;
    if (currentCount !== this.lastMessageCount) {
      this.lastMessageCount = currentCount;
      this.scrollToBottom();
    }
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    const anchor = this.scrollAnchor();
    anchor?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}
