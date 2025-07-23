import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatPopupService } from '../../chat/chat-popup.service';
import { ChatApiService } from '../../chat/chat-api.service';

export interface TutorProfile {
  id: string;
  name: string;
  email: string;
  userType: string;
  user_type?: string; // snake_case variant from backend
  education?: string;
  gender?: string;
  age?: number;
  bio?: string;
  timezone?: string;
  rating?: number;
  totalSessions?: number;
  profileImageUrl?: string; // <-- add this line
}

@Component({
  selector: 'app-tutor-profile-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutor-profile-preview.html',
  styleUrls: ['./tutor-profile-preview.scss']
})
export class TutorProfilePreviewComponent {
  @Input() isVisible: boolean = false;
  @Input() tutor: TutorProfile | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() messageTutor = new EventEmitter<TutorProfile>();

  constructor(private chatPopup: ChatPopupService, private chatApi: ChatApiService) {}

  close() {
    this.closeModal.emit();
  }

  getStarsArray(stars: number): number[] {
    if (!stars || stars < 0) return [];
    // Return the number of filled stars (rounded down)
    const filled = Math.floor(stars);
    return Array.from({ length: filled }, (_, i) => i);
  }

  getEmptyStarsArray(stars: number): number[] {
    if (!stars || stars < 0) return Array.from({ length: 5 }, (_, i) => i);
    // Always return enough to make 5 total stars
    const filled = Math.floor(stars);
    return Array.from({ length: 5 - filled }, (_, i) => i);
  }

  async openChat() {
    if (!this.tutor) {
      console.error('[TutorProfilePreview] No tutor selected');
      return;
    }

    const tutorId = this.tutor.id; // capture before closing modal
    const tutorData = this.tutor;

    this.closeModal.emit(); // Close the modal (may destroy this component)

    try {
      await this.chatApi.createConversation(tutorId).toPromise();
      this.chatPopup.open(tutorId);
      this.messageTutor.emit(tutorData);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }
} 