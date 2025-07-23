import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from './auth/auth.service';

@Component({
  selector: 'app-session-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-history.html',
  styleUrl: './session-history.scss'
})
export class SessionHistory implements OnInit {
  currentUser: any = null;
  userType: 'student' | 'tutor' | null = null;
  pastSessions: any[] = [];
  selectedLessonIndex: number | null = null;
  selectedStudentIndex: number | null = null;
  sortOption: 'earliest' | 'latest' = 'earliest';
  showSortDropdown: boolean = false;
  showFeedbackPopup: boolean = false;
  feedbackPopupText: string = '';

  constructor(public authService: AuthService) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.userType = user?.userType || null;
      this.pastSessions = user?.pastSessions || user?.past_sessions || [];
    });
  }

  selectLesson(idx: number) {
    this.selectedLessonIndex = idx;
    this.selectedStudentIndex = null;
    const lesson = this.getSelectedLesson();
    if (!lesson) return;
    if (lesson.students) {
      lesson.students.forEach((student: any, sidx: number) => {
      });
    }
  }

  selectStudent(idx: number) {
    this.selectedStudentIndex = idx;
    const student = this.getSelectedStudent();
    if (!student) return;
  }

  getSelectedLesson() {
    if (this.selectedLessonIndex === null) return null;
    const lesson = this.pastSessions[this.selectedLessonIndex];
    return lesson;
  }

  getSelectedStudent() {
    const lesson = this.getSelectedLesson();
    if (!lesson || !lesson.students || this.selectedStudentIndex === null) return null;
    const student = lesson.students[this.selectedStudentIndex];
    return student;
  }

  setSortOption(option: 'earliest' | 'latest') {
    this.sortOption = option;
    this.showSortDropdown = false;
  }

  getSortedSessions() {
    const lesson = this.getSelectedLesson();
    if (!lesson || !lesson.sessions) return [];
    // Assume session[0] is the datetime string
    const sorted = [...lesson.sessions].sort((a: any[], b: any[]) => {
      const dateA = new Date(a[0]).getTime();
      const dateB = new Date(b[0]).getTime();
      return this.sortOption === 'earliest' ? dateA - dateB : dateB - dateA;
    });
    return sorted;
  }

  openFeedbackPopup(text: string) {
    this.feedbackPopupText = text;
    this.showFeedbackPopup = true;
  }

  closeFeedbackPopup() {
    this.showFeedbackPopup = false;
    this.feedbackPopupText = '';
  }
}
