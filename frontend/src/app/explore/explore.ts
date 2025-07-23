import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject, takeUntil, BehaviorSubject, combineLatest, map, startWith } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ExploreService } from './explore.service';
import { Offering } from '../offerings/offering.interface';
import { MatIconModule } from '@angular/material/icon';
import { LessonPreviewService } from '../lessons/lesson-preview.service';
import { TutorProfilePreviewComponent, TutorProfile } from './tutor-profile-preview/tutor-profile-preview';
import { SUBJECTS, AGE_GROUPS } from '../lessons/lesson.interface';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ChatPopupService } from '../chat/chat-popup.service';
import { Conversation } from '../chat/chat-api.service';
import { ChatApiService } from '../chat/chat-api.service';

interface FilterOptions {
  subject: string;
  ageGroup: string;
  priceRange: string;
  duration: string;
  availability: string;
}

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TutorProfilePreviewComponent, MatDialogModule],
  templateUrl: './explore.html',
  styleUrls: ['./explore.scss']
})
export class ExploreComponent implements OnInit, OnDestroy {
  offerings$: Observable<Offering[]>;
  currentUser$: Observable<any>;
  
  // Search and filter properties
  searchTerm = '';
  filters: FilterOptions = {
    subject: '',
    ageGroup: '',
    priceRange: '',
    duration: '',
    availability: ''
  };
  
  // UI state
  showFilters = false;
  showSortDropdown = false;
  sortBy = 'relevance';
  isLoading = false;
  showGradesDropdown: { [key: string]: boolean } = {};
  activeDropdown: string | null = null;
  
  // Tutor profile preview popup
  showTutorProfilePopup = false;
  selectedTutor: TutorProfile | null = null;
  
  // Messaging
  showMessages = false;
  selectedTutorForMessages: any = null;
  selectedConversation: any = null;
  
  // Pagination properties
  currentPage = 1;
  itemsPerPage = 9; // 3 rows of 3 offerings
  totalPages = 1;
  
  // Grade options
  gradeOptions = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
  
  // Available filter options
  subjects = SUBJECTS.map(subject => subject.name);
  
  ageGroups = AGE_GROUPS.map(ageGroup => 
    ageGroup.name === 'Elementary School' ? 'Grade School' : ageGroup.name
  );
  priceRanges = ['Free', 'Under $20', '$20-$50', '$50-$100', 'Over $100'];
  durations = ['30 minutes', '60 minutes', '90 minutes', '120+ minutes'];
  availabilityOptions = ['This Week', 'Next Week', 'This Month', 'Any Time'];
  
  private destroy$ = new Subject<void>();
  private allOfferingsSubject = new BehaviorSubject<Offering[]>([]);
  private sortBySubject = new BehaviorSubject<string>('relevance');
  private currentPageSubject = new BehaviorSubject<number>(1);

  constructor(
    private authService: AuthService,
    private router: Router,
    private exploreService: ExploreService,
    private lessonPreviewService: LessonPreviewService,
    private dialog: MatDialog,
    private chatPopup: ChatPopupService,
    private chatApi: ChatApiService
  ) {
    // Create reactive observables for live updates
    this.offerings$ = this.createReactiveOfferings();
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit() {
    this.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (!user) {
        this.router.navigate(['/']);
        return;
      }
      
      if (user.userType !== 'student') {
        this.router.navigate(['/']);
        return;
      }
    });
    
    this.loadOfferings();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createReactiveOfferings(): Observable<Offering[]> {
    return combineLatest([
      this.allOfferingsSubject.asObservable(),
      this.sortBySubject.asObservable(),
      this.currentPageSubject.asObservable()
    ]).pipe(
      map(([allOfferings, sortBy, currentPage]) => {
        let filtered = [...allOfferings];
        
        // Filter out offerings where capacity is maxed out, treating 0 or null as unlimited
        filtered = filtered.filter(offering => {
          if (offering.maxStudents === null || offering.maxStudents === 0) {
            return true; // unlimited capacity
          }
          return offering.enrolledCount < offering.maxStudents;
        });
        
        // Apply sorting
        switch (sortBy) {
          case 'price-low':
            filtered.sort((a, b) => a.price - b.price);
            break;
          case 'price-high':
            filtered.sort((a, b) => b.price - a.price);
            break;
          case 'rating':
            filtered.sort((a, b) => (b.tutor.rating || 0) - (a.tutor.rating || 0));
            break;
          case 'enrolled':
            filtered.sort((a, b) => b.enrolledCount - a.enrolledCount);
            break;
          case 'relevance':
          default:
            // Keep original order for relevance
            break;
        }
        
        // Update pagination info
        this.totalPages = Math.ceil(filtered.length / this.itemsPerPage);
        
        // Remove page correction logic from here
        // Get offerings for current page
        const startIndex = (currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return filtered.slice(startIndex, endIndex);
      })
    );
  }

  loadOfferings() {
    this.isLoading = true;
    this.exploreService.searchOfferings(this.searchTerm, this.filters).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (offerings) => {
        // Update the subject immediately for reactive updates
        this.allOfferingsSubject.next(offerings || []);
        // After loading, if currentPage is out of range, reset to 1
        setTimeout(() => {
          const totalPages = Math.ceil((offerings?.filter(o => {
            if (o.maxStudents === null || o.maxStudents === 0) return true;
            return o.enrolledCount < o.maxStudents;
          }).length || 0) / this.itemsPerPage);
          if (this.currentPage > totalPages && totalPages > 0) {
            this.currentPage = 1;
            this.currentPageSubject.next(1);
          }
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[ExploreComponent] Error loading offerings:', error);
        this.isLoading = false;
        this.allOfferingsSubject.next([]);
      }
    });
  }

  onSearch() {
    this.currentPage = 1; // Reset to first page when searching
    this.currentPageSubject.next(this.currentPage);
    this.loadOfferings();
  }

  onFilterChange() {
    this.currentPage = 1; // Reset to first page when filtering
    this.currentPageSubject.next(this.currentPage);
    this.loadOfferings();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.currentPageSubject.next(this.currentPage);
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      // Show all pages if total is 5 or less
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      let start = Math.max(1, this.currentPage - 2);
      let end = Math.min(this.totalPages, start + maxVisiblePages - 1);
      
      // Adjust start if we're near the end
      if (end === this.totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  setSort(sortType: string) {
    this.sortBy = sortType;
    this.showSortDropdown = false;
    this.currentPage = 1; // Reset to first page when sorting
    this.currentPageSubject.next(this.currentPage);
    this.sortBySubject.next(sortType);
  }

  getSortDisplayText(): string {
    switch (this.sortBy) {
      case 'price-low':
        return 'Price: Low to High';
      case 'price-high':
        return 'Price: High to Low';
      case 'rating':
        return 'Highest Rated';
      case 'enrolled':
        return 'Most Popular';
      case 'relevance':
      default:
        return 'Relevance';
    }
  }

  clearFilters() {
    this.filters = {
      subject: '',
      ageGroup: '',
      priceRange: '',
      duration: '',
      availability: ''
    };
    this.searchTerm = '';
    this.currentPage = 1; // Reset to first page when clearing filters
    this.currentPageSubject.next(this.currentPage);
    this.loadOfferings();
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

  onLessonNameClick(offering: Offering) {
    // Navigate to offering detail page, pass offering via router state
    this.router.navigate(['/offering', offering.id], { state: { offering } });
  }

  enrollInOffering(offering: Offering) {
    // TODO: Implement enrollment logic
    console.log('Enrolling in offering:', offering.id);
  }

  getAvailableTimesCount(offering: Offering): number {
    return offering.availableTimes?.length || 0;
  }

  getNextAvailableTime(offering: Offering): string {
    // Implementation for getting next available time
    return 'Next available time';
  }

  toggleGradesDropdown(offeringId: string, event: Event) {
    event.stopPropagation();
    this.showGradesDropdown[offeringId] = !this.showGradesDropdown[offeringId];
  }

  closeGradesDropdown(offeringId: string) {
    this.showGradesDropdown[offeringId] = false;
  }

  closeAllGradeDropdowns() {
    this.showGradesDropdown = {};
  }

  openTutorProfile(tutor: any) {
    this.selectedTutor = {
      id: tutor.id,
      name: tutor.name,
      email: tutor.email,
      userType: tutor.userType,
      education: tutor.education,
      gender: tutor.gender,
      age: tutor.age,
      bio: tutor.bio,
      timezone: tutor.timezone,
      rating: tutor.rating,
      totalSessions: tutor.totalSessions,
      profileImageUrl: tutor.profileImageUrl
    };
    this.showTutorProfilePopup = true;
  }

  closeTutorProfile() {
    this.showTutorProfilePopup = false;
    this.selectedTutor = null;
  }

  async onMessageTutor(tutor: TutorProfile) {
    this.showTutorProfilePopup = false; // Close the modal immediately
        this.chatPopup.open(tutor.id);
    // Optionally, emit or handle any additional logic here
  }

  closeMessages() {
    this.showMessages = false;
    this.selectedTutorForMessages = null;
  }

  onConversationSelected(event: any) {
    // event: { conversation, userInitiated }
    this.selectedConversation = event.conversation;
    if (event.userInitiated) {
      this.showMessages = false;
      this.selectedTutorForMessages = null;
    }
  }

  toggleDropdown(dropdownType: string) {
    if (this.activeDropdown === dropdownType) {
      this.activeDropdown = null;
    } else {
      this.activeDropdown = dropdownType;
    }
  }

  selectFilter(filterType: keyof FilterOptions, value: string) {
    this.filters[filterType] = value;
    this.activeDropdown = null;
    this.onFilterChange();
  }

  closeAllDropdowns() {
    this.activeDropdown = null;
  }
} 