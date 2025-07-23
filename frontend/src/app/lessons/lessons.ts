import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { LessonsService } from './lessons.service';
import { Lesson, SUBJECTS, AGE_GROUPS } from './lesson.interface';
import { MatIconModule } from '@angular/material/icon';
import { NgZone } from '@angular/core';
import { ResourcesService } from '../resources/resources.service';
import { Material } from '../resources/resource.interface';
import { Apollo } from 'apollo-angular';
import { LessonPreviewService } from './lesson-preview.service';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-lessons',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './lessons.html',
  styleUrl: './lessons.scss'
})
export class LessonsComponent implements OnInit {
  lessons$: Observable<Lesson[]>;
  currentUser$: Observable<any>;
  showAddModal = false;
  showDescriptionModal = false;
  showDeleteModal = false;
  selectedLesson: Lesson | null = null;
  selectedDescription = '';
  lessonToDelete: Lesson | null = null;
  allLessons: Lesson[] = []; // Store the original lessons array
  isDeletingLesson = false;

  // Form data for adding/editing lessons
  lessonForm = {
    name: '',
    subject: '',
    ageGroup: '',
    grades: [] as string[],
    capacity: '',
    customCapacity: '',
    description: '',
    materials: [] as string[]
  };

  // New properties for modern UI
  showAgeGroupDropdown = false;
  showSubjectDropdown = false;
  showMaterialsDropdown = false;
  showCapacityDropdown = false;
  subjectSearch = '';
  materialsSearch = '';
  filteredSubjects = [...SUBJECTS];
  filteredMaterials: string[] = [];
  materials: Material[] = [];
  showErrors = false;
  showGradesDropdown = false;
  lessonSearch: string = '';
  sortBy: string = 'studentCount';
  filteredLessons: Lesson[] = [];
  showSortDropdown = false;
  // submitted = false; // Removed

  // Update capacities array
  gradeOptions = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];
  capacities = ['No Cap', 'Specify Cap'];
  capacity: string = '';
  customCapacity: string = '';

  subjects = SUBJECTS;
  ageGroups = [
    {
      name: 'Grade School',
      grades: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8']
    },
    {
      name: 'High School',
      grades: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
    },
    {
      name: 'College',
      grades: ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate']
    },
    {
      name: 'Adult',
      grades: ['Adult Learner']
    }
  ];

  getSampleMaterials(): string[] {
    return [];
  }

  constructor(
    private authService: AuthService,
    private apollo: Apollo,
    private router: Router,
    private lessonsService: LessonsService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private resourcesService: ResourcesService,
    private lessonPreviewService: LessonPreviewService
  ) {
    this.lessons$ = this.lessonsService.getLessons();
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit() {
    this.currentUser$.subscribe(user => {
      if (!user) {
        this.router.navigate(['/']);
        return;
      }
      
      if (user.userType !== 'tutor') {
        this.router.navigate(['/']);
        return;
      }
    });
    
    // Load materials from database
    this.loadMaterials();
    
    // Ensure lessons are loaded and displayed immediately
    this.lessons$.subscribe(lessons => {
      this.allLessons = lessons; // Store the original lessons array
      this.applyFiltersAndSort(lessons);
      this.cdr.detectChanges();
    });

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('click', (event) => {
        this.ngZone.run(() => {
          const target = event.target as Element;

          // Always close grades dropdown if click is outside popover/grade-box
          const isGradesPopover = target.closest('.grades-popover');
          const isGradeBox = target.closest('.grade-box');
          if (this.showGradesDropdown && !isGradesPopover && !isGradeBox) {
            this.showGradesDropdown = false;
          }

          // Now handle other dropdowns/modal close as before
          const isInsidePopup = target.closest('.popup-container');
          if (!isInsidePopup) {
            this.showAgeGroupDropdown = false;
            this.showSubjectDropdown = false;
            this.showMaterialsDropdown = false;
            this.showCapacityDropdown = false;
            return;
          }
          
          // Only keep grades popover and grade box in the 'don't close' list
          const isDropdownTrigger = target.closest('.dropdown-trigger');
          const isDropdownMenu = target.closest('.dropdown-menu');
          const isSearchInput = target.closest('.search-input');
          const isDropdownOption = target.closest('.dropdown-option');
          const isMaterialsTag = target.closest('.material-tag');
          const isCheckbox = target.closest('input[type="checkbox"]');
          
          if (!isDropdownTrigger && !isDropdownMenu && !isSearchInput && !isDropdownOption && !isMaterialsTag && !isCheckbox) {
            this.showAgeGroupDropdown = false;
            this.showSubjectDropdown = false;
            this.showMaterialsDropdown = false;
            this.showCapacityDropdown = false;
          }
        });
      });
    });

    // Listen for lesson preview requests from other components
    this.lessonPreviewService.previewData$.subscribe(previewData => {
      if (previewData) {
        // Create a mock lesson object for the preview
        const mockLesson: Lesson = {
          id: previewData.lessonId,
          name: previewData.lessonName,
          description: previewData.description,
          subject: '',
          ageGroup: '',
          grades: [],
          studentCap: '',
          materials: [],
          createdAt: new Date().toISOString(),
          currentStudentCount: 0
        };
        this.openDescriptionModal(mockLesson);
        // Clear the preview data after opening
        this.lessonPreviewService.clearPreviewData();
      }
    });
  }

  loadMaterials() {
    this.resourcesService.getMyMaterials().subscribe({
      next: (materials: Material[]) => {
        this.materials = materials;
        this.filteredMaterials = materials.map(material => material.name);
      },
      error: (error) => {
        console.error('[LessonsComponent] Error loading materials:', error);
        this.materials = [];
        this.filteredMaterials = [];
      }
    });
  }

  getSubjectEmoji(subjectName: string): string {
    const subject = this.subjects.find(s => s.name === subjectName);
    return subject?.emoji || '📚';
  }

  getAgeGroupGrades(ageGroupName: string): string[] {
    if (ageGroupName === 'Grade School') {
      return this.gradeOptions;
    }
    const ageGroup = this.ageGroups.find(ag => ag.name === ageGroupName);
    return ageGroup?.grades || [];
  }

  onGradesChange(grade: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.lessonForm.grades.push(grade);
    } else {
      this.lessonForm.grades = this.lessonForm.grades.filter(g => g !== grade);
    }
  }

  toggleGrade(grade: string) {
    if (this.lessonForm.grades.includes(grade)) {
      this.lessonForm.grades = this.lessonForm.grades.filter(g => g !== grade);
    } else {
      this.lessonForm.grades.push(grade);
    }
  }

  openAddModal() {
    this.resetForm();
    this.showAddModal = true;
    // Prevent page scrolling when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeAddModal() {
    this.showAddModal = false;
    this.resetForm();
    // submitted = false; // Removed
    // Restore page scrolling when modal is closed
    document.body.style.overflow = '';
  }

  openDescriptionModal(lesson: Lesson) {
    this.selectedLesson = lesson;
    this.selectedDescription = lesson.description && lesson.description.trim() !== ''
      ? lesson.description
      : '<em>Lesson doesn\'t have description.</em>';
    this.showDescriptionModal = true;
  }

  closeDescriptionModal() {
    this.showDescriptionModal = false;
    this.selectedLesson = null;
    this.selectedDescription = '';
  }

  resetForm() {
    this.lessonForm = {
      name: '',
      subject: '',
      ageGroup: '',
      grades: [],
      capacity: '',
      customCapacity: '',
      description: '',
      materials: []
    };
    this.capacity = '';
    this.customCapacity = '';
    this.subjectSearch = '';
    this.materialsSearch = '';
    this.filteredSubjects = [...SUBJECTS];
    this.filteredMaterials = this.materials.map(material => material.name);
    this.showAgeGroupDropdown = false;
    this.showSubjectDropdown = false;
    this.showMaterialsDropdown = false;
    this.showCapacityDropdown = false;
    this.showErrors = false;
    // submitted = false; // Removed
  }

  addLesson() {
    this.showErrors = true;
    // Check required fields
    if (!this.lessonForm.name || !this.lessonForm.name.trim()) {
      return;
    }
    if (!this.lessonForm.subject) {
      return;
    }
    if (!this.lessonForm.capacity) {
      return;
    }
    // If "Specify Cap" is selected, custom capacity must be provided and valid
    if (this.lessonForm.capacity === 'Specify Cap') {
      if (!this.lessonForm.customCapacity || this.lessonForm.customCapacity.toString().trim() === '') {
        return;
      }
      const capacityNum = parseInt(this.lessonForm.customCapacity.toString(), 10);
      if (isNaN(capacityNum) || capacityNum < 1) {
        return;
      }
    }
    // Only close modal if form is valid and backend call is made
    this.lessonsService.addLesson(this.lessonForm).subscribe({
      next: (result) => {
        if (result.data?.addLesson?.errors?.length > 0) {
          console.error('[AddLesson] Backend errors:', result.data.addLesson.errors);
          alert('Error adding lesson: ' + result.data.addLesson.errors.join(', '));
        } else {
          console.log('[AddLesson] Lesson added successfully!');
          this.closeAddModal();
          this.resetForm();
          this.reloadLessons();
        }
      },
      error: (err) => {
        console.error('[AddLesson] Network/GraphQL error:', err);
        alert('Error adding lesson');
      }
    });
  }

  selectCapacity(cap: string) {
    this.lessonForm.capacity = cap;
    this.showCapacityDropdown = false;
    this.showErrors = false; // Remove red outline when option changes
    if (cap !== 'Specify Cap') {
      this.lessonForm.customCapacity = '';
    }
  }
  onCustomCapacityChange() {
    // Ensure only numeric input and validate range
    if (this.lessonForm.customCapacity) {
      const value = this.lessonForm.customCapacity.toString();
      // Remove any non-numeric characters
      const numericValue = value.replace(/[^0-9]/g, '');
      
      if (numericValue !== value) {
        this.lessonForm.customCapacity = numericValue;
      }
      
      // Ensure the value is within the valid range (1-21)
      const numValue = parseInt(numericValue);
      if (numValue > 21) {
        this.lessonForm.customCapacity = '21';
      }
    }
  }

  openDeleteModal(lesson: Lesson, lessonIndex: number) {
    this.lessonToDelete = lesson;
    this.showDeleteModal = true;
    // Prevent page scrolling when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.lessonToDelete = null;
    // Restore page scrolling when modal is closed
    document.body.style.overflow = '';
  }

  deleteLesson() {
    if (this.isDeletingLesson) return;
    this.isDeletingLesson = true;
    if (this.lessonToDelete) {
      const lessonId = this.lessonToDelete.id;
      // Close the modal only after we have the ID
      this.closeDeleteModal();
      this.lessonsService.deleteLesson(lessonId)
        .pipe(
          catchError((err) => {
            console.error('[Delete] Apollo observable error:', err);
            throw err;
          })
        )
        .subscribe({
          next: (result) => {
            if (result.data?.deleteLesson?.errors?.length > 0) {
              console.error('Error deleting lesson:', result.data.deleteLesson.errors);
            } else {
              console.log('Lesson deleted successfully');
            }
            // In either case, reload the lessons list so the UI stays in sync
            this.reloadLessons();
            this.isDeletingLesson = false;
          },
          error: (error) => {
            console.error('[Delete] Error deleting lesson:', error);
            this.reloadLessons();
            this.isDeletingLesson = false;
          }
        });
    } else {
      // No lesson selected – just reset the flag
      this.closeDeleteModal();
      this.isDeletingLesson = false;
    }
  }

  // New methods for modern UI
  toggleAgeGroupDropdown() {
    this.showAgeGroupDropdown = !this.showAgeGroupDropdown;
    if (this.showAgeGroupDropdown) {
      this.showSubjectDropdown = false;
    }
  }

  selectAgeGroup(ageGroup: string) {
    this.lessonForm.ageGroup = ageGroup;
    this.lessonForm.grades = [];
    this.showAgeGroupDropdown = false;
    // Do not open grades popover automatically
    this.showGradesDropdown = false;
    this.showErrors = false;
  }

  filterSubjects() {
    if (!this.subjectSearch.trim()) {
      this.filteredSubjects = [...SUBJECTS];
    } else {
      this.filteredSubjects = SUBJECTS.filter(subject =>
        subject.name.toLowerCase().includes(this.subjectSearch.toLowerCase())
      );
    }
  }

  selectSubject(subjectName: string) {
    this.lessonForm.subject = subjectName;
    this.showSubjectDropdown = false;
  }

  getWordCount(text: string): number {
    if (!text || text.trim() === '') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  onDescriptionInput(event: any) {
    const text = event.target.value;
    const wordCount = this.getWordCount(text);
    
    if (wordCount > 500) {
      // Prevent additional words beyond 500
      const words = text.trim().split(/\s+/);
      const limitedWords = words.slice(0, 500);
      this.lessonForm.description = limitedWords.join(' ');
      event.target.value = this.lessonForm.description;
    }
  }

  onDescriptionKeydown(event: KeyboardEvent) {
    const text = (event.target as HTMLTextAreaElement).value;
    const wordCount = this.getWordCount(text);
    
    // Prevent typing if at word limit (unless it's a backspace or delete)
    if (wordCount >= 500 && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
    }
  }

  filterMaterials() {
    if (!this.materialsSearch.trim()) {
      this.filteredMaterials = this.materials.map(material => material.name);
    } else {
      this.filteredMaterials = this.materials
        .map(material => material.name)
        .filter(material => 
          material.toLowerCase().includes(this.materialsSearch.toLowerCase())
        );
    }
  }

  toggleMaterial(material: string) {
    
    if (this.lessonForm.materials.includes(material)) {
      this.lessonForm.materials = this.lessonForm.materials.filter(m => m !== material);
    } else {
      this.lessonForm.materials.push(material);
    }
  }

  closeGradesDropdown() {
    this.showGradesDropdown = false;
  }

  blockNonNumeric(event: KeyboardEvent) {
    if (!/\d/.test(event.key) && event.key !== 'Backspace' && event.key !== 'Delete' && event.key !== 'Tab' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      event.preventDefault();
    }
  }

  // Materials display methods
  getDisplayedMaterials(): string[] {
    const maxDisplayed = 4; // Show first 4 materials
    return this.lessonForm.materials.slice(0, maxDisplayed);
  }

  getHiddenMaterialsCount(): number {
    const maxDisplayed = 4;
    const hiddenCount = this.lessonForm.materials.length - maxDisplayed;
    return hiddenCount > 0 ? hiddenCount : 0;
  }

  removeMaterial(material: string) {
    this.lessonForm.materials = this.lessonForm.materials.filter(m => m !== material);
  }

  onPopupContentClick(event: Event) {
    const target = event.target as Element;
    
    // Check if the click is on a form field or input
    const isInput = target.closest('input');
    const isTextarea = target.closest('textarea');
    const isField = target.closest('.field');
    const isLabel = target.closest('.field-label');
    
    // If clicking on form elements (but not dropdown elements), close dropdowns
    if ((isInput || isTextarea || isField || isLabel) && 
        !target.closest('.dropdown-container') && 
        !target.closest('.dropdown-menu') && 
        !target.closest('.dropdown-trigger') &&
        !target.closest('.dropdown-option') &&
        !target.closest('.search-input') &&
        !target.closest('.grades-popover') &&
        !target.closest('.grade-box') &&
        !target.closest('.grades-actions')) {
      
      this.showAgeGroupDropdown = false;
      this.showSubjectDropdown = false;
      this.showMaterialsDropdown = false;
      this.showCapacityDropdown = false;
      // Don't close grades dropdown from this method
    }
  }

  getGradeCount(): number {
    if (!this.lessonForm.ageGroup) {
      return 0;
    }
    
    if (this.lessonForm.ageGroup === 'Grade School') {
      return this.lessonForm.grades.length;
    } else {
      // For High School, College, Adult - return 1 since they don't have multiple grade selections
      return 1;
    }
  }

  // Add selectAllGrades method
  selectAllGrades() {
    if (this.lessonForm.grades.length === this.gradeOptions.length) {
      // If all are selected, deselect all
      this.lessonForm.grades = [];
    } else {
      // If not all are selected, select all
      this.lessonForm.grades = [...this.gradeOptions];
    }
  }

  openGradesPopover() {
    if (this.showGradesDropdown) {
      // If already open, close it
      this.showGradesDropdown = false;
    } else {
      // If closed, open it
      this.showGradesDropdown = true;
    }
  }

  isCustomCapacityInvalid(): boolean {
    // If "Specify Cap" is not selected, no validation needed
    if (this.lessonForm.capacity !== 'Specify Cap') {
      return false;
    }
    
    // If "Specify Cap" is selected but no value is entered, it's invalid
    if (!this.lessonForm.customCapacity || this.lessonForm.customCapacity.toString().trim() === '') {
      return true;
    }
    
    // Check if the value is a valid positive integer between 1 and 21
    const capacityNum = parseInt(this.lessonForm.customCapacity.toString());
    return isNaN(capacityNum) || capacityNum <= 0 || capacityNum > 21;
  }

  onLessonSearch() {
    this.lessons$.subscribe(lessons => {
      this.applyFiltersAndSort(lessons);
    });
  }

  onSortChange() {
    this.lessons$.subscribe(lessons => {
      this.applyFiltersAndSort(lessons);
    });
  }

  getSortLabel(sortBy: string): string {
    switch (sortBy) {
      case 'studentCountAsc': return 'Current Students ↑';
      case 'studentCountDesc': return 'Current Students ↓';
      case 'nameAsc': return 'By Name ↑';
      case 'nameDesc': return 'By Name ↓';
      default: return 'Sort';
    }
  }

  setSort(sort: string) {
    this.sortBy = sort;
    this.showSortDropdown = false;
    this.lessons$.subscribe(lessons => {
      this.applyFiltersAndSort(lessons);
    });
  }

  applyFiltersAndSort(lessons: Lesson[]) {
    let filtered = lessons;
    if (this.lessonSearch && this.lessonSearch.trim()) {
      const search = this.lessonSearch.trim().toLowerCase();
      filtered = filtered.filter(l => l.name.toLowerCase().includes(search));
    }
    if (this.sortBy === 'studentCountAsc') {
      filtered = filtered.slice().sort((a, b) => (a.currentStudentCount || 0) - (b.currentStudentCount || 0));
    } else if (this.sortBy === 'studentCountDesc') {
      filtered = filtered.slice().sort((a, b) => (b.currentStudentCount || 0) - (a.currentStudentCount || 0));
    } else if (this.sortBy === 'nameAsc') {
      filtered = filtered.slice().sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy === 'nameDesc') {
      filtered = filtered.slice().sort((a, b) => b.name.localeCompare(a.name));
    }
    this.filteredLessons = filtered;
  }

  navigateToResources() {
    this.router.navigate(['/resources']);
  }

  reloadLessons() {
    this.lessonsService.getLessons().subscribe(lessons => {
      this.applyFiltersAndSort(lessons);
      this.cdr.detectChanges();
    });
  }
}
