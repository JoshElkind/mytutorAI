import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { createConsumer, Consumer, Subscription } from '@rails/actioncable';
import { Observable, Subject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  private consumer?: Consumer;
  private subscription?: Subscription;
  private readonly messageSubject = new Subject<any>();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const cableUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/cable`;
      this.consumer = createConsumer(cableUrl);
      this.subscribe();
    }
  }

  /**
   * Stream of incoming ActionCable messages.
   */
  public onMessage(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  private subscribe(): void {
    if (this.consumer) {
      this.subscription = this.consumer.subscriptions.create('MessagesChannel', {
        received: (data: any) => {
          this.messageSubject.next(data);
        }
      });
    }
  }
} 