import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject, takeUntil, BehaviorSubject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { OfferingsService } from './offerings.service';
import { LessonsService } from '../lessons/lessons.service';
import { Offering, CreateOfferingData } from './offering.interface';
import { Lesson } from '../lessons/lesson.interface';
import { MatIconModule } from '@angular/material/icon';
import { LessonPreviewService } from '../lessons/lesson-preview.service';

interface WeekDay {
  date: Date;
  dayName: string;
  isToday: boolean;
  isPast: boolean;
  selectedTimes: string[];
}

@Component({
  selector: 'app-offerings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './offerings.html',
  styleUrl: './offerings.scss'
})
export class OfferingsComponent implements OnInit, OnDestroy {
  offerings$: Observable<Offering[]>;
  lessons$: Observable<Lesson[]>;
  currentUser$: Observable<any>;
  
  showCreateModal = false;
  showDeleteModal = false;
  showScheduleModal = false;
  offeringToDelete: Offering | null = null;
  selectedOfferingForSchedule: Offering | null = null;
  createError = '';
  
  // Form data for creating offerings
  offeringForm = {
    lessonId: '',
    price: '',
    duration: 30,
    availableTimes: [] as string[]
  };
  // Remove lessonSearch and updateFilteredLessons logic
  // lessonSearch = '';
  // filteredLessons: Lesson[] = [];
  // private allLessons: Lesson[] = [];
  
  // Available durations
  durations = [30, 60];
  
  // Weekly calendar data
  weekDays: WeekDay[] = [];
  selectedTimeSlots: string[] = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];
  
  showErrors = false;
  private destroy$ = new Subject<void>();
  
  // Search and sort properties
  searchTerm = '';
  sortBy = 'enrolled-desc';
  showSortDropdown = false;
  private allOfferings: Offering[] = [];
  private filteredOfferingsSubject = new BehaviorSubject<Offering[]>([]);

  // Modern dropdown state
  showDurationDropdown: boolean = false;
  showLessonDropdown: boolean = false;
  lessonSearch: string = '';
  filteredLessons: Lesson[] = [];

  // Helper method for price validation
  isValidPrice(price: any): boolean {
    if (price === null || price === undefined) return true;
    const strPrice = price.toString().trim();
    if (strPrice === '') return true; // Treat empty as free
    const numPrice = parseFloat(strPrice);
    return !isNaN(numPrice) && numPrice >= 0;
  }

  isValidMaxStudents(val: string): boolean {
    const n = parseInt(val, 10);
    return !isNaN(n) && n > 0 && n < 1000;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private offeringsService: OfferingsService,
    private lessonsService: LessonsService,
    private lessonPreviewService: LessonPreviewService
  ) {
    this.offerings$ = this.filteredOfferingsSubject.asObservable();
    this.lessons$ = this.lessonsService.getLessons();
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit() {
    this.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (!user) {
        this.router.navigate(['/']);
        return;
      }
      
      if (user.userType !== 'tutor') {
        this.router.navigate(['/']);
        return;
      }
    });
    
    this.initializeWeekCalendar();
    this.lessons$.pipe(takeUntil(this.destroy$)).subscribe(lessons => {
      this.filteredLessons = lessons || [];
      this.filterLessons();
    });
    
    // Load and filter offerings
    this.offeringsService.getMyOfferings().pipe(takeUntil(this.destroy$)).subscribe(offerings => {
      this.allOfferings = offerings || [];
      this.filterOfferings();
    });
    
    // Debug: Log lessons being loaded
    this.lessons$.pipe(takeUntil(this.destroy$)).subscribe(lessons => {
      console.log('Lessons loaded in offerings component:', lessons);
      console.log('Lesson IDs:', lessons?.map(l => ({ id: l.id, name: l.name })));
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeWeekCalendar() {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Adjust to get Monday
    
    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + mondayOffset + i);
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[date.getDay()];
      const isToday = this.isSameDay(date, today);
      
      // Only mark as past if it's a previous day of the week AND the current time has passed
      // For the current week, allow all days to be selectable
      const isPast = false; // Temporarily disable past day logic for testing
      
      this.weekDays.push({
        date: date,
        dayName: dayName,
        isToday: isToday,
        isPast: isPast,
        selectedTimes: []
      });
    }
    

  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  toggleTimeSlot(day: WeekDay, timeSlot: string) {
    const index = day.selectedTimes.indexOf(timeSlot);
    
    if (index > -1) {
      day.selectedTimes.splice(index, 1);
    } else {
      day.selectedTimes.push(timeSlot);
    }
    
    this.updateAvailableTimes();
  }

  isTimeSlotSelected(day: WeekDay, timeSlot: string): boolean {
    return day.selectedTimes.includes(timeSlot);
  }

  formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatDateForDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }

  updateAvailableTimes() {
    this.offeringForm.availableTimes = [];
    this.weekDays.forEach(day => {
      day.selectedTimes.forEach(timeSlot => {
        const dateTime = `${this.formatDateForAPI(day.date)}T${timeSlot}`;
        this.offeringForm.availableTimes.push(dateTime);
      });
    });
  }

  openCreateModal() {
    this.showCreateModal = true;
    document.body.classList.add('modal-open');
    this.resetForm();
    this.initializeWeekCalendar();
    
    // Force refresh of lessons to ensure we have the latest data
    this.lessonsService.getLessons().pipe(takeUntil(this.destroy$)).subscribe(lessons => {
      this.filteredLessons = lessons || [];
      this.filterLessons();
    });
  }

  closeCreateModal() {
    this.showCreateModal = false;
    document.body.classList.remove('modal-open');
    this.resetForm();
    this.showLessonDropdown = false;
    this.showDurationDropdown = false;
  }

  openDeleteModal(offering: Offering) {
    this.offeringToDelete = offering;
    this.showDeleteModal = true;
    document.body.classList.add('modal-open');
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    document.body.classList.remove('modal-open');
    this.offeringToDelete = null;
  }

  resetForm() {
    this.offeringForm = {
      lessonId: '',
      price: '',
      duration: 30,
      availableTimes: []
    };
    this.showErrors = false;
    this.createError = '';
    this.weekDays.forEach(day => {
      day.selectedTimes = [];
    });
  }

  createOffering() {
    this.showErrors = true;
    this.createError = '';
    
    if (!this.offeringForm.lessonId) {
      this.createError = 'Please select a lesson.';
      return;
    }
    
    if (this.offeringForm.price !== '' && !this.isValidPrice(this.offeringForm.price)) {
      this.createError = 'Please enter a valid price (must be 0 or greater).';
      return;
    }
    
    if (this.offeringForm.availableTimes.length === 0) {
      this.createError = 'Please select at least one available time slot.';
      return;
    }
    
    // Check if user already has an offering for this lesson
    const existingOffering = this.allOfferings.find(offering => offering.lesson.id === this.offeringForm.lessonId);
    if (existingOffering) {
      this.createError = 'You already have an offering for this lesson. Please delete the existing offering first.';
      return;
    }
    
    const maxStudents = this.getSelectedLessonMaxStudentsValue();
    
    // Get current user ID
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      alert('User not authenticated');
      return;
    }
    
    // Convert available times to proper ISO8601DateTime format
    const availableTimes = this.offeringForm.availableTimes.map(time => {
      // Ensure the time is in proper ISO8601 format
      const date = new Date(time);
      return date.toISOString();
    });
    
    const offeringData: CreateOfferingData = {
      tutorId: currentUser.id,
      lessonId: this.offeringForm.lessonId,
      price: this.offeringForm.price === '' ? 0 : parseFloat(this.offeringForm.price),
      duration: this.offeringForm.duration,
      availableTimes: availableTimes,
      maxStudents: maxStudents // 0 means unlimited capacity
    };
    
    this.offeringsService.createOffering(offeringData).subscribe({
      next: (result) => {
        if (result.errors && result.errors.length > 0) {
          console.error('GraphQL errors:', result.errors);
          this.createError = 'Error creating offering: ' + result.errors.map((e: any) => e.message).join(', ');
          return;
        }
        if (result.data?.createOffering?.errors?.length > 0) {
          this.createError = 'Error creating offering: ' + result.data.createOffering.errors.join(', ');
        } else {
          this.closeCreateModal();
          // Refresh the offerings list to show the new offering
          this.refreshOfferings();
        }
      },
      error: (error) => {
        console.error('Error creating offering:', error);
        this.createError = 'Error creating offering. Please try again.';
      }
    });
  }

  deleteOffering() {
    if (!this.offeringToDelete) return;

    const offeringId = this.offeringToDelete.id;

    // Close modal AFTER capturing the ID
    this.closeDeleteModal();

    // Remove from local array immediately
    this.allOfferings = this.allOfferings.filter(offering => offering.id !== offeringId);
    this.filterOfferings();

    // Call backend to delete
    this.offeringsService.deleteOffering(offeringId).subscribe({
      next: (result) => {
        if (result.data?.deleteOffering?.success) {
          console.log('Offering deleted successfully');
          // Refresh to ensure sync with backend
          this.refreshOfferings();
        } else {
          console.error('Error deleting offering:', result.data?.deleteOffering?.errors);
          alert('Error deleting offering: ' + result.data?.deleteOffering?.errors?.join(', '));
          // Refresh to restore if there was an error
          this.refreshOfferings();
        }
      },
      error: (error) => {
        console.error('Error deleting offering:', error);
        alert('Error deleting offering');
        // Refresh to restore if there was an error
        this.refreshOfferings();
      }
    });
  }

  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString();
  }

  formatPrice(price: number): string {
    if (price === 0 || price === null || price === undefined) {
      return 'FREE';
    }
    return `$${price.toFixed(2)}`;
  }

  formatDuration(duration: number): string {
    return `${duration} minutes`;
  }

  getSubjectEmoji(subject: string): string {
    const subjects = [
      { name: 'Mathematics', emoji: '📐' },
      { name: 'Science', emoji: '🔬' },
      { name: 'Chemistry', emoji: '🧪' },
      { name: 'Physics', emoji: '⚡' },
      { name: 'Biology', emoji: '🧬' },
      { name: 'English', emoji: '📚' },
      { name: 'Literature', emoji: '📖' },
      { name: 'History', emoji: '📜' },
      { name: 'Geography', emoji: '🌍' },
      { name: 'Archeology', emoji: '🏺' },
      { name: 'Computer Science', emoji: '💻' },
      { name: 'Programming', emoji: '⌨️' },
      { name: 'Art', emoji: '🎨' },
      { name: 'Music', emoji: '🎵' },
      { name: 'Economics', emoji: '💰' },
      { name: 'Psychology', emoji: '🧠' },
      { name: 'Philosophy', emoji: '🤔' },
      { name: 'Astronomy', emoji: '🔭' },
      { name: 'Environmental Science', emoji: '🌱' },
      { name: 'Law', emoji: '⚖️' }
    ];
    
    const found = subjects.find(s => s.name === subject);
    return found ? found.emoji : '📚';
  }

  navigateToLessons() {
    this.router.navigate(['/lessons']);
  }

  getSelectedTimesCount(): number {
    return this.offeringForm.availableTimes.length;
  }



  // Remove lessonSearch and updateFilteredLessons logic
  // updateFilteredLessons() {
  //   const search = this.lessonSearch?.toLowerCase() || '';
  //   this.filteredLessons = this.allLessons.filter(l => !search || l.name.toLowerCase().includes(search));
  // }

  filterOfferings() {
    let filtered = this.allOfferings;
    
    // Apply search filter
    if (this.searchTerm.trim()) {
      filtered = filtered.filter(offering =>
        offering.lesson.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    this.sortOfferings(filtered);
  }

  sortOfferings(offeringsToSort?: Offering[]) {
    const offerings = offeringsToSort || this.allOfferings;
    let sorted = [...offerings];
    
    switch (this.sortBy) {
      case 'enrolled-asc':
        sorted.sort((a, b) => a.enrolledCount - b.enrolledCount);
        break;
      case 'enrolled-desc':
        sorted.sort((a, b) => b.enrolledCount - a.enrolledCount);
        break;
      default:
        sorted.sort((a, b) => b.enrolledCount - a.enrolledCount);
    }
    
    this.filteredOfferingsSubject.next(sorted);
  }

  setSort(sortType: string) {
    this.sortBy = sortType;
    this.showSortDropdown = false;
    this.sortOfferings();
  }

  getSortDisplayText(): string {
    switch (this.sortBy) {
      case 'enrolled-asc':
        return 'Enrolled ↑';
      case 'enrolled-desc':
        return 'Enrolled ↓';
      default:
        return 'Enrolled ↓';
    }
  }

  setDuration(duration: number): void {
    this.offeringForm.duration = duration;
    this.showDurationDropdown = false;
  }

  getDurationDisplayText(): string {
    if (!this.offeringForm.duration) return 'Select Duration';
    return `${this.offeringForm.duration} minutes`;
  }

  filterLessons() {
    this.lessons$.pipe(takeUntil(this.destroy$)).subscribe(lessons => {
      if (!lessons) {
        this.filteredLessons = [];
        return;
      }
      
      // Filter out lessons that already have offerings
      const availableLessons = lessons.filter(lesson => 
        !this.allOfferings.some(offering => offering.lesson.id === lesson.id)
      );
      
      if (!this.lessonSearch) {
        this.filteredLessons = availableLessons;
      } else {
        const search = this.lessonSearch.toLowerCase();
        this.filteredLessons = availableLessons.filter(lesson =>
          lesson.name.toLowerCase().includes(search) ||
          lesson.subject.toLowerCase().includes(search)
        );
      }
    });
  }

  selectLesson(id: string): void {
    const lesson = this.filteredLessons.find(l => l.id === id);
    this.offeringForm.lessonId = id;
    this.showLessonDropdown = false;
  }

  getLessonDisplayName(id: string): string {
    const lesson = this.filteredLessons.find(l => l.id === id);
    return lesson ? `${lesson.name} (${lesson.subject})` : '';
  }

  getSelectedLessonMaxStudents(): string {
    if (!this.offeringForm.lessonId) return '';
    const lesson = this.filteredLessons.find(l => l.id === this.offeringForm.lessonId);
    if (!lesson) return '';
    
    if (!lesson.studentCap || lesson.studentCap === '' || lesson.studentCap === '0') {
      return 'No limit';
    }
    return lesson.studentCap;
  }

  getSelectedLessonMaxStudentsValue(): number {
    if (!this.offeringForm.lessonId) return 0;
    const lesson = this.filteredLessons.find(l => l.id === this.offeringForm.lessonId);
    if (!lesson || !lesson.studentCap || lesson.studentCap === '') {
      return 0; // No limit = 0
    }
    const parsed = parseInt(lesson.studentCap, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  refreshOfferings() {
    this.offeringsService.getMyOfferings().pipe(takeUntil(this.destroy$)).subscribe(offerings => {
      this.allOfferings = offerings || [];
      this.filterOfferings();
    });
  }

  onLessonNameClick(offering: Offering) {
    // Navigate to lessons page and open the lesson preview
    this.lessonPreviewService.openLessonPreview(
      offering.lesson.id,
      offering.lesson.name,
      offering.lesson.description || ''
    );
    this.router.navigate(['/lessons']);
  }

  openScheduleModal(offering: Offering) {
    this.selectedOfferingForSchedule = offering;
    this.showScheduleModal = true;
    document.body.classList.add('modal-open');
  }

  closeScheduleModal() {
    this.showScheduleModal = false;
    document.body.classList.remove('modal-open');
    this.selectedOfferingForSchedule = null;
  }

  // Helper method to check if a time slot is available for the selected offering
  isTimeSlotAvailableForOffering(day: WeekDay, timeSlot: string, offering: Offering): boolean {
    if (!offering) return false;
    
    const dateTime = `${this.formatDateForAPI(day.date)}T${timeSlot}`;
    return offering.availableTimes.some(time => {
      const offeringTime = new Date(time);
      const slotTime = new Date(dateTime);
      return offeringTime.getTime() === slotTime.getTime();
    });
  }

  // Helper method to get short day names
  getShortDayName(dayName: string): string {
    const dayMap: { [key: string]: string } = {
      'Monday': 'Mon',
      'Tuesday': 'Tue', 
      'Wednesday': 'Wed',
      'Thursday': 'Thu',
      'Friday': 'Fri',
      'Saturday': 'Sat',
      'Sunday': 'Sun'
    };
    return dayMap[dayName] || dayName;
  }
} 