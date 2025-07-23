import { Component, ElementRef, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, map, Subject, takeUntil } from 'rxjs';
import { ChatPopupService } from './chat-popup.service';
import { Conversation, Message } from './chat-api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DisplayMessage extends Message { showTimestamp: boolean; }

@Component({
  selector: 'app-chat-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-popup.component.html',
  styleUrls: ['./chat-popup.component.scss']
})
export class ChatPopupComponent implements OnInit, OnDestroy, AfterViewInit {
  isOpen$!: Observable<boolean>;
  conversations$!: Observable<Conversation[]>;
  filteredConversations$!: Observable<Conversation[]>;
  selectedConversation$ = new BehaviorSubject<Conversation | null>(null);
  messages$ = new BehaviorSubject<Message[]>([]);
  displayMessages$ = new BehaviorSubject<DisplayMessage[]>([]);

  @ViewChild('messagesList') messagesListRef!: ElementRef<HTMLDivElement>;

  searchQuery = '';
  newMessage = '';
  private searchSubject = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();

  constructor(private chatPopup: ChatPopupService, private host: ElementRef) {
    this.isOpen$ = this.chatPopup.isOpen$;
    this.conversations$ = this.chatPopup.conversations$;

    // Setup filtered conversations
    this.filteredConversations$ = combineLatest([
      this.conversations$,
      this.searchSubject
    ]).pipe(
      map(([conversations, search]) => {
        if (!search.trim()) return conversations;
        const searchLower = search.toLowerCase();
        return conversations.filter(conv => 
          conv.name.toLowerCase().includes(searchLower)
        );
      })
    );
  }

  ngOnInit() {
    // Subscribe to service's selected conversation
    this.chatPopup.selectedConversation$
      .pipe(takeUntil(this.destroy$))
      .subscribe(conv => {
        this.selectedConversation$.next(conv);
      });

    // Subscribe to messages
    this.chatPopup.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        // Filter out placeholder message
        const filtered = messages.filter(m => m.content !== '[conversation started]');
        if (filtered.length !== messages.length) {
          console.log('[ChatPopupComponent] Filtered out placeholder message from chat view');
        }
        this.messages$.next(filtered);

        // Build grouped display data
        const display: DisplayMessage[] = [];
        filtered.forEach((m, i) => {
          const prev = i > 0 ? filtered[i - 1] : null;
          const showTimestamp = !prev || !this.isSameMinute(m.createdAt, prev.createdAt);
          display.push({ ...m, showTimestamp });
        });
        this.displayMessages$.next(display);

        // Wait for view update then scroll to bottom
        setTimeout(() => this.scrollToBottom(), 0);
      });
  }

  ngAfterViewInit() {
    // ensure initial scroll
    setTimeout(() => this.scrollToBottom(), 0);
  }

  private isSameMinute(date1: string, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate() && d1.getHours() === d2.getHours() && d1.getMinutes() === d2.getMinutes();
  }

  private scrollToBottom() {
    if (this.messagesListRef) {
      const el = this.messagesListRef.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  filterContacts() {
    this.searchSubject.next(this.searchQuery);
  }

  selectConversation(conv: Conversation) {
    this.selectedConversation$.next(conv);
    this.chatPopup.selectConversation(conv);
  }

  async sendMessage() {
    if (this.newMessage.trim().length === 0) return;
    
    const message = this.newMessage.trim();
    this.newMessage = ''; // Clear input immediately for better UX
    
    try {
      const result = this.chatPopup.sendMessage(message);
      if (result) {
        result.subscribe({
          error: (error) => {
            console.error('Failed to send message:', error);
            // Optionally show error to user
          }
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Optionally show error to user
    }
  }

  close() {
    this.selectedConversation$.next(null);
    this.chatPopup.close();
  }
} 