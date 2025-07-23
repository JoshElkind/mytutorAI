import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, filter, first, switchMap, tap } from 'rxjs';
import { ChatApiService, Conversation, Message } from './chat-api.service';
import { AuthService } from '../auth/auth.service';
import { ChatSocketService } from './chat-socket.service';

@Injectable({ providedIn: 'root' })
export class ChatPopupService {
  /** Whether the popup is currently open */
  readonly isOpen$ = new BehaviorSubject<boolean>(false);

  /** List of all conversations for the user */
  readonly conversations$ = new BehaviorSubject<Conversation[]>([]);

  /** Currently selected conversation (other user) */
  readonly selectedConversation$ = new BehaviorSubject<Conversation | null>(null);

  /** Messages in the selected conversation */
  readonly messages$ = new BehaviorSubject<Message[]>([]);

  constructor(private chatApi: ChatApiService, private socket: ChatSocketService, private auth: AuthService) {
    this.init(this.socket);

    // Close any open popups when the user logs out (currentUser becomes null)
    this.auth.currentUser$.subscribe(user => {
      if (user === null) {
        this.close();
      }
    });
  }

  /** Initializes websocket subscription for real-time updates. */
  init(socketService: ChatSocketService) {
    socketService.onMessage().subscribe((payload: any) => {
      if (payload?.action !== 'new_message' || !payload.message) return;

      const msg = payload.message as Message;
      const otherUserId = msg.sender.id === this.getCurrentUserId() ? msg.receiver.id : msg.sender.id;

      // If message belongs to currently selected conversation, append to messages list
      if (this.selectedConversation$.value?.userId === otherUserId) {
        this.messages$.next([...this.messages$.value, msg]);
      }

      // Update or add conversation in list
      let convs = [...this.conversations$.value];
      let conv = convs.find((c) => c.userId === otherUserId);
      if (conv) {
        conv.lastMessage = msg.content;
        conv.lastMessageTime = msg.createdAt;
        conv.unreadCount = (conv.unreadCount || 0) + (this.selectedConversation$.value?.userId === otherUserId ? 0 : 1);
      } else {
        conv = {
          userId: otherUserId,
          name: msg.sender.name,
          email: '',
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount: 1,
          isOnline: false
        } as Conversation;
        convs = [conv, ...convs];
      }
      this.conversations$.next(convs);
    });
  }

  private getCurrentUserId(): string | null {
    // Attempt to read user id from JWT cookie
    const tokenMatch = document.cookie.match(/auth_token=([^;]+)/);
    if (!tokenMatch) return null;
    try {
      const token = decodeURIComponent(tokenMatch[1]);
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_id || null;
    } catch {
      return null;
    }
  }

  /** Opens the chat popup. Optionally auto-selects or creates conversation with `otherUserId`. */
  open(otherUserId?: string): void {
    if (!this.isOpen$.value) {
      this.isOpen$.next(true);
    }

    // Always reload conversations when opening
    this.chatApi
      .getConversations()
      .pipe(
        tap((convs) => {
          const cleaned = convs.map(c => {
            if (c.lastMessage === '[conversation started]') {
              return { ...c, lastMessage: '', lastMessageTime: c.lastMessageTime } as Conversation;
            }
            return c;
          });
          this.conversations$.next(cleaned);
        }),
        first()
      )
      .subscribe((convs) => {
        if (otherUserId) {
          const match = convs.find((c) => c.userId === otherUserId);
          if (match) {
            this.selectConversation(match);
          } else {
            // Do not create a placeholder conversation; wait for backend creation
            this.selectedConversation$.next(null);
            this.messages$.next([]);
          }
        }
      });
  }

  /** Closes the popup. */
  close(): void {
    this.isOpen$.next(false);
    this.selectedConversation$.next(null);
    this.messages$.next([]);
  }

  /** Selects a conversation and loads messages. */
  selectConversation(conversation: Conversation): void {
    this.selectedConversation$.next(conversation);

    this.chatApi
      .getMessages(conversation.userId)
      .subscribe((msgs) => {
        // Sort messages so oldest first, newest last
        const sorted = [...msgs].sort((a, b) => {
          const t1 = new Date(a.createdAt).getTime();
          const t2 = new Date(b.createdAt).getTime();
          return t1 - t2;
        });
        this.messages$.next(sorted);
      });
  }

  /** Sends a message in the currently selected conversation. */
  sendMessage(content: string) {
    const conversation = this.selectedConversation$.value;
    if (!conversation) return;

    return this.chatApi.sendMessage(conversation.userId, content).pipe(
      tap(msg => {
        if (msg) {
          // Update messages list
          this.messages$.next([...this.messages$.value, msg]);
          
          // Update conversation list
          const convs = [...this.conversations$.value];
          const idx = convs.findIndex((c) => c.userId === conversation.userId);
          if (idx > -1) {
            convs[idx] = {
              ...convs[idx],
              lastMessage: msg.content,
              lastMessageTime: msg.createdAt,
              unreadCount: 0
            };
            this.conversations$.next(convs);
          }
        }
      })
    );
  }
} 