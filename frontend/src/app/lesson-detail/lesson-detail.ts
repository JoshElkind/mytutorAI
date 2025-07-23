import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TutorProfilePreviewComponent, TutorProfile } from '../explore/tutor-profile-preview/tutor-profile-preview';
import { ChatPopupService } from '../chat/chat-popup.service';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { ChangeDetectorRef } from '@angular/core';
import { OfferingsService } from '../offerings/offerings.service';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  availableSessions: Session[];
}

interface Session {
  id: string;
  time: Date;
  isAvailable: boolean;
}

const GET_LESSON_SESSIONS = gql`
  query GetLessonSessions($lessonId: ID!) {
    lesson(id: $lessonId) {
      id
      sessions {
        id
        startTime
        endTime
      }
    }
  }
`;

const PURCHASE_SESSIONS = gql`
  mutation PurchaseSessions($offeringId: ID!, $sessionTimes: [ISO8601DateTime!]!) {
    purchaseSessions(offeringId: $offeringId, sessionTimes: $sessionTimes) {
      success
      errors
      sessions {
        id
        tutorName
        tutorEmail
        studentName
        studentEmail
        lessonName
        startTime
        endTime
        duration
      }
    }
  }
`;

@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  imports: [CommonModule, TutorProfilePreviewComponent],
  templateUrl: './lesson-detail.html',
  styleUrls: ['./lesson-detail.scss']
})
export class LessonDetailComponent implements OnInit {
  offering: any = null;
  showTutorPreview = false;
  selectedTutor: TutorProfile | null = null;

  // Calendar state
  currentDate = new Date();
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarDays: CalendarDay[] = [];
  selectedSessions: Session[] = [];
  bookedSessionTimes: Date[] = [];
  loadingSessions = false;

  // New properties for time selection modal
  showTimeSelectionModal = false;
  selectedDaySlots: Session[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatPopup: ChatPopupService,
    private apollo: Apollo,
    private cdr: ChangeDetectorRef,
    private offeringsService: OfferingsService // <-- inject service
  ) {}

  ngOnInit(): void {
    const navState: any = history.state;
    if (navState && navState.offering) {
      this.offering = navState.offering;
      this.fetchBookedSessionsAndInitCalendar();
    } else {
      // If offering not in state, try to get id and fetch from backend
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.offeringsService.getOfferingById(id).subscribe(offering => {
          if (offering) {
            this.offering = offering;
            this.fetchBookedSessionsAndInitCalendar();
            this.cdr.markForCheck();
          } else {
            this.router.navigate(['/explore']);
          }
        });
      } else {
        this.router.navigate(['/explore']);
      }
    }
  }

  fetchBookedSessionsAndInitCalendar(): void {
    this.loadingSessions = true;
    this.apollo.query<any>({
      query: GET_LESSON_SESSIONS,
      variables: { lessonId: this.offering.lesson.id },
      fetchPolicy: 'network-only'
    }).subscribe({
      next: (result) => {
        const sessions = result.data?.lesson?.sessions || [];
        this.bookedSessionTimes = sessions.map((s: any) => new Date(s.startTime));
        this.loadingSessions = false;
        this.initializeCalendar();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.bookedSessionTimes = [];
        this.loadingSessions = false;
        this.initializeCalendar();
        this.cdr.markForCheck();
      }
    });
  }

  initializeCalendar(): void {
    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    const now = new Date();
    // Get days from previous month to fill first week
    const firstDayOfWeek = firstDay.getDay();
    const prevMonthDays = Array.from({ length: firstDayOfWeek }, (_, i) => {
      const date = new Date(firstDay);
      date.setDate(-i);
      return this.createCalendarDay(date, false, now);
    }).reverse();

    // Get days of current month
    const currentMonthDays = Array.from(
      { length: lastDay.getDate() },
      (_, i) => this.createCalendarDay(new Date(firstDay.getFullYear(), firstDay.getMonth(), i + 1), true, now)
    );

    // Get days from next month to fill last week
    const remainingDays = (7 - ((firstDayOfWeek + lastDay.getDate()) % 7)) % 7;
    const nextMonthDays = Array.from({ length: remainingDays }, (_, i) => {
      const date = new Date(lastDay);
      date.setDate(lastDay.getDate() + i + 1);
      return this.createCalendarDay(date, false, now);
    });

    this.calendarDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
    this.cdr.markForCheck();
  }

  createCalendarDay(date: Date, isCurrentMonth: boolean, now: Date): CalendarDay {
    // Only show sessions for days that are today or in the future
    if (date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      return {
        date,
        dayNumber: date.getDate(),
        isCurrentMonth,
        availableSessions: []
      };
    }
    // Use offering.availableTimes for this day, filter out booked and past times
    const availableSessions = (this.offering?.availableTimes || [])
      .map((iso: string) => new Date(iso))
      .filter((sessionTime: Date) => {
        // Only times for this day
        return (
          sessionTime.getFullYear() === date.getFullYear() &&
          sessionTime.getMonth() === date.getMonth() &&
          sessionTime.getDate() === date.getDate()
        );
      })
      .filter((sessionTime: Date) => {
        // Exclude times in the past
        return sessionTime > now;
      })
      .filter((sessionTime: Date) => {
        // Exclude times already booked by anyone
        return !this.bookedSessionTimes.some(
          (booked: Date) => Math.abs(booked.getTime() - sessionTime.getTime()) < 60 * 1000 // 1 min tolerance
        );
      })
      .map((sessionTime: Date) => ({
        id: `session-${sessionTime.getTime()}`,
        time: sessionTime,
        isAvailable: true
      }));
    return {
      date,
      dayNumber: date.getDate(),
      isCurrentMonth,
      availableSessions
    };
  }

  get currentMonthYear(): string {
    return this.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  previousMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1);
    this.initializeCalendar();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1);
    this.initializeCalendar();
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' });
  }

  isDateSelected(date: Date): boolean {
    return this.selectedSessions.some(session => 
      session.time.toDateString() === date.toDateString()
    );
  }

  isSessionSelected(session: Session): boolean {
    return this.selectedSessions.some(s => s.id === session.id);
  }

  toggleSession(session: Session): void {
    const index = this.selectedSessions.findIndex(s => s.id === session.id);
    if (index === -1) {
      this.selectedSessions.push(session);
    } else {
      this.selectedSessions.splice(index, 1);
    }
  }

  getTotalCost(): number {
    return this.selectedSessions.length * (this.offering?.price || 0);
  }

  openTutor() {
    if (!this.offering) return;
    const tutor = this.offering.tutor;
    this.selectedTutor = {
      id: tutor.id,
      name: tutor.name,
      email: tutor.email,
      userType: tutor.userType,
      education: tutor.education,
      gender: tutor.gender,
      age: tutor.age,
      bio: tutor.bio,
      profileImageUrl: tutor.profileImageUrl,
      timezone: tutor.timezone,
      rating: tutor.rating,
      totalSessions: tutor.totalSessions
    } as TutorProfile;
    this.showTutorPreview = true;
  }

  closeTutor() {
    this.showTutorPreview = false;
    this.selectedTutor = null;
  }

  messageTutor() {
    if (this.offering?.tutor?.id) {
      this.chatPopup.open(this.offering.tutor.id);
    }
  }

  cancel(): void {
    this.router.navigate(['/explore']);
  }

  purchase(): void {
    if (this.selectedSessions.length === 0) return;

    const sessionTimes = this.selectedSessions.map(session => session.time);

    this.apollo.mutate({
      mutation: PURCHASE_SESSIONS,
      variables: {
        offeringId: this.offering.id,
        sessionTimes: sessionTimes
      }
    }).subscribe({
      next: (result: any) => {
        if (result.data?.purchaseSessions?.success) {
          // Navigate to explore page
          this.router.navigate(['/explore']);
        } else {
          const errors = result.data?.purchaseSessions?.errors || ['Failed to purchase sessions'];
          alert(errors.join('\n'));
        }
      },
      error: (error) => {
        alert('Failed to purchase sessions. Please try again.');
      }
    });
  }

  openTimeSelectionModal(day: CalendarDay): void {
    if (day.availableSessions.length > 0) {
      this.selectedDaySlots = day.availableSessions;
      this.showTimeSelectionModal = true;
    }
  }

  closeTimeSelectionModal(): void {
    this.showTimeSelectionModal = false;
    this.selectedDaySlots = [];
  }

  clearAllSelections(): void {
    this.selectedSessions = [];
  }
} 