import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Apollo } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import gql from 'graphql-tag';
import { AuthService } from '../auth/auth.service';
import { TutorProfilePreviewComponent, TutorProfile } from '../explore/tutor-profile-preview/tutor-profile-preview';
import { ChatPopupService } from '../chat/chat-popup.service';

export interface Session {
  id: string;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  lessonName: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
}

const GET_MY_UPCOMING_SESSIONS = gql`
  query GetMyUpcomingSessions {
    myUpcomingSessions {
      id
      tutorId
      tutorName
      tutorEmail
      studentId
      studentName
      studentEmail
      lessonName
      startTime
      endTime
      duration
    }
  }
`;

const GET_USER_PROFILE = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
      userType
      education
      gender
      age
      bio
      profileImageUrl
      timezone
      rating
      totalSessions
    }
  }
`;

const EVENT_COLORS = [
  '#8b5cf6', // purple
  '#10b981', // green
  '#f59e42', // orange
  '#2563eb', // blue
  '#f43f5e', // red
  '#eab308', // yellow
  '#14b8a6', // teal
  '#6366f1', // indigo
];

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, TutorProfilePreviewComponent],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.scss']
})
export class CalendarComponent implements OnInit, OnDestroy {
  sessions$: Observable<Session[]>;
  allSessions: Session[] = [];
  selectedSession: Session | null = null;
  selectedDay: Date | null = null;
  sessionsForSelectedDay: Session[] = [];

  today = new Date();
  currentMonth: number = this.today.getMonth();
  currentYear: number = this.today.getFullYear();
  calendarDays: { date: Date, sessions: Session[] }[] = [];

  private timer: any;
  private timeUpdateTimer: any;
  now: Date = new Date();
  currentUser: any = null;
  lessonColorMap: { [lessonName: string]: string } = {};

  // Profile preview properties
  showProfilePreview = false;
  selectedProfile: TutorProfile | null = null;

  constructor(
    private apollo: Apollo,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private chatPopup: ChatPopupService
  ) {
    this.sessions$ = this.apollo.watchQuery<{ myUpcomingSessions: Session[] }>({
      query: GET_MY_UPCOMING_SESSIONS,
      fetchPolicy: 'network-only'
    }).valueChanges.pipe(
      map(result => {
        if (result.data) {
          if (result.data.myUpcomingSessions) {
            result.data.myUpcomingSessions.forEach((session: any, idx: number) => {
            });
          }
        }
        return (result.data && result.data.myUpcomingSessions) ? result.data.myUpcomingSessions : [];
      })
    );
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.generateCalendar();
    });
  }

  ngOnInit() {
    this.sessions$.subscribe(sessions => {
      this.allSessions = sessions;
      this.assignLessonColors();
      this.generateCalendar();
    });
    this.generateCalendar();
    this.timer = setInterval(() => {
      this.now = new Date();
      this.cdr.markForCheck();
    }, 10000); // update every 10 seconds

    // Start timer to update time displays every minute
    this.timeUpdateTimer = setInterval(() => {
      this.cdr.detectChanges(); // Trigger change detection to update time displays
    }, 60000); // Update every minute
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
    }
  }

  assignLessonColors() {
    // Assign a consistent color to each lessonName
    const uniqueLessons = Array.from(new Set(this.allSessions.map(s => s.lessonName)));
    uniqueLessons.forEach((lesson, idx) => {
      this.lessonColorMap[lesson] = EVENT_COLORS[idx % EVENT_COLORS.length];
    });
  }

  generateCalendar() {
    const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1);
    const lastDayOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDay = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon...
    const calendar: { date: Date, sessions: Session[] }[] = [];

    // Fill in days before the 1st of the month
    for (let i = 0; i < startDay; i++) {
      calendar.push({ date: null as any, sessions: [] });
    }
    // Fill in days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(this.currentYear, this.currentMonth, d);
      const sessions = this.allSessions.filter(s => {
        const sessionDate = new Date(s.startTime);
        // Only show sessions for this user
        if (!this.currentUser) return false;
        if (this.currentUser.userType === 'tutor') {
          if (s.tutorEmail !== this.currentUser.email) return false;
        } else {
          if (s.studentEmail !== this.currentUser.email) return false;
        }
        return sessionDate.getFullYear() === date.getFullYear() &&
               sessionDate.getMonth() === date.getMonth() &&
               sessionDate.getDate() === date.getDate();
      });
      calendar.push({ date, sessions });
    }
    this.calendarDays = calendar;
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  selectDay(day: { date: Date, sessions: Session[] }) {
    if (!day.date) return;
    this.selectedDay = day.date;
    this.sessionsForSelectedDay = day.sessions;
  }

  selectSession(session: Session) {
    this.selectedSession = session;
  }

  closeSessionDetails() {
    this.selectedSession = null;
  }

  closeDayPopup() {
    this.selectedDay = null;
    this.sessionsForSelectedDay = [];
  }

  getEventColor(idx: number, lessonName?: string): string {
    if (lessonName && this.lessonColorMap[lessonName]) {
      return this.lessonColorMap[lessonName];
    }
    return EVENT_COLORS[idx % EVENT_COLORS.length];
  }

  isSessionOngoing(session: Session): boolean {
    const now = this.now.getTime();
    const start = new Date(session.startTime).getTime();
    const end = new Date(session.endTime).getTime();
    return now >= start && now < end;
  }

  filteredUpcomingSessions(sessions: Session[]): Session[] {
    const now = this.now;
    if (!this.currentUser) return [];
    return sessions.filter(s => {
      if (this.currentUser.userType === 'tutor') {
        return s.tutorEmail === this.currentUser.email && new Date(s.endTime) > now;
      } else {
        return s.studentEmail === this.currentUser.email && new Date(s.endTime) > now;
      }
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  getTimeToEvent(session: Session): number {
    // Returns seconds until event
    return Math.max(0, Math.floor((new Date(session.startTime).getTime() - this.now.getTime()) / 1000));
  }

  getTimeToEventLabel(session: Session): string {
    if (this.isSessionOngoing(session)) return 'Now';
    const seconds = this.getTimeToEvent(session);
    if (seconds < 60) return 'in 1 min';
    if (seconds < 3600) return `in ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `in ${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) === 1 ? '' : 's'}`;
    return `in ${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) === 1 ? '' : 's'}`;
  }

  getMonthName(): string {
    return new Date(this.currentYear, this.currentMonth).toLocaleString('default', { month: 'long' });
  }

  getSessionTagsForDay(day: { date: Date, sessions: Session[] }): { session: Session, color: string }[] {
    if (!day.date) return [];
    const now = this.now;
    // Only show future or ongoing sessions
    const futureSessions = day.sessions.filter(s => new Date(s.endTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    // Pick up to 3 sessions
    return futureSessions.slice(0, 3).map((session) => ({
      session,
      color: this.lessonColorMap[session.lessonName] || EVENT_COLORS[0]
    }));
  }

  getExtraSessionCountForDay(day: { date: Date, sessions: Session[] }): number {
    if (!day.date) return 0;
    const now = this.now;
    const futureSessions = day.sessions.filter(s => new Date(s.endTime) > now);
    return Math.max(0, futureSessions.length - 3);
  }

  // Add this method to the CalendarComponent
  hasOngoingSession(): boolean {
    if (!this.allSessions || !this.currentUser) return false;
    return this.allSessions.some(s => this.isSessionOngoing(s) && (
      (this.currentUser.userType === 'tutor' && s.tutorEmail === this.currentUser.email) ||
      (this.currentUser.userType === 'student' && s.studentEmail === this.currentUser.email)
    ));
  }

  openTutorProfile(tutor: any) {
    // Close any open popups showing session lists/details first
    this.closeDayPopup();
    this.closeSessionDetails();
    this.fetchUserProfile(tutor.id, tutor);
  }

  openStudentProfile(student: any) {
    // Close any open popups showing session lists/details first
    this.closeDayPopup();
    this.closeSessionDetails();
    this.fetchUserProfile(student.id, student);
  }

  closeProfilePreview() {
    this.showProfilePreview = false;
    this.selectedProfile = null;
  }

  onMessageUser(user: TutorProfile) {
    this.showProfilePreview = false;
    this.chatPopup.open(user.id);
  }

  private fetchUserProfile(userId: string, fallback: any) {
    // Show the modal immediately with whatever data we have
    this.selectedProfile = fallback;
    this.showProfilePreview = true;

    // Fetch full profile details in background and update when they arrive
    this.apollo.query<{ user: any }>({
      query: GET_USER_PROFILE,
      variables: { id: userId },
      fetchPolicy: 'network-only'
    }).subscribe(({ data }) => {
      if (data && data.user) {
        this.selectedProfile = data.user;
        // Trigger change detection manually because we updated object reference
        this.cdr.detectChanges();
      }
    }, (error) => {
      console.error('[Calendar] Failed to fetch user profile:', error);
    });
  }
} 