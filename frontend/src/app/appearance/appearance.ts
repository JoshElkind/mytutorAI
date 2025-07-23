import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import gql from 'graphql-tag';
import { Review } from './review.interface';
import { FormsModule } from '@angular/forms';

const GET_MY_REVIEWS = gql`
  query GetMyReviews {
    myReviews {
      id
      stars
      comment
      studentName
      createdAt
    }
  }
`;

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      user {
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
      }
      errors
    }
  }
`;

const CREATE_BILLING_PORTAL_SESSION = gql`
  mutation CreateBillingPortalSession {
    createBillingPortalSession {
      url
      success
      errors
    }
  }
`;

@Component({
  selector: 'app-appearance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appearance.html',
  styleUrls: ['./appearance.scss']
})
export class AppearanceComponent {
  selectedTab: string = 'profile';
  reviews$: Observable<Review[]>;
  showSortDropdown: boolean = false;
  sortSelection: string = 'date-desc'; // 'date-desc', 'date-asc', 'stars-desc', 'stars-asc'

  // Profile edit mode
  isEditMode: boolean = false;
  originalProfileData: any = {};

  profileForm: any = {
    education: '',
    gender: '',
    age: null,
    bio: '',
    profileImage: null,
    profileImageUrl: '',
    timezone: ''
  };
  profileLoading = false;
  profileError = '';
  profileSuccess = '';
  imagePreviewUrl: string | ArrayBuffer | null = null;
  isDragOver = false;
  showGenderDropdown = false;
  showTimezoneDropdown = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private apollo: Apollo
  ) {
    this.reviews$ = this.apollo.watchQuery<{ myReviews: Review[] }>({
      query: GET_MY_REVIEWS,
      fetchPolicy: 'cache-and-network'
    }).valueChanges.pipe(
      map(result => result.data.myReviews || [])
    );
  }

  ngOnInit() {
    this.currentUser$.subscribe(user => {
      if (user) {
        this.profileForm.education = user.education || '';
        this.profileForm.gender = user.gender || '';
        this.profileForm.age = user.age || null;
        this.profileForm.bio = user.bio || '';
        this.profileForm.profileImageUrl = user.profileImageUrl || '';
        this.profileForm.timezone = user.timezone || '';
        this.imagePreviewUrl = user.profileImageUrl || null;
        
        // Store original data for cancel functionality
        this.originalProfileData = { ...this.profileForm };
      }
    });
  }

  get currentUser$() {
    return this.authService.currentUser$;
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
  }

  getSortLabel(): string {
    switch (this.sortSelection) {
      case 'date-desc': return 'Date (Newest First)';
      case 'date-asc': return 'Date (Oldest First)';
      case 'stars-desc': return 'Stars (Highest First)';
      case 'stars-asc': return 'Stars (Lowest First)';
      default: return 'Date (Newest First)';
    }
  }

  setSort(sortType: string) {
    this.sortSelection = sortType;
    this.showSortDropdown = false;
  }

  getSortedReviews(reviews: Review[]): Review[] {
    const [sortBy, sortOrder] = this.sortSelection.split('-');
    return [...reviews].sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === 'desc' ? b.stars - a.stars : a.stars - b.stars;
      }
    });
  }

  getStarsArray(stars: number): number[] {
    return Array.from({ length: stars }, (_, i) => i);
  }

  getEmptyStarsArray(stars: number): number[] {
    return Array.from({ length: 5 - stars }, (_, i) => i);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  onProfileImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.profileForm.profileImage = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviewUrl = (e.target?.result ?? null) as string | ArrayBuffer | null;
      };
      reader.readAsDataURL(file);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        this.profileForm.profileImage = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.imagePreviewUrl = (e.target?.result ?? null) as string | ArrayBuffer | null;
        };
        reader.readAsDataURL(file);
      }
    }
  }

  selectGender(gender: string) {
    this.profileForm.gender = gender;
    this.showGenderDropdown = false;
  }

  selectTimezone(timezone: string) {
    this.profileForm.timezone = timezone;
    this.showTimezoneDropdown = false;
  }

  onBioInput(event: any) {
    const text = event.target.value;
    if (this.getWordCount(text) > 400) {
      // Truncate to 400 words
      const words = text.split(' ');
      this.profileForm.bio = words.slice(0, 40).join(' ');
    }
  }

  onBioKeydown(event: KeyboardEvent) {
    const text = (event.target as HTMLTextAreaElement).value;
    if (this.getWordCount(text) >= 400 && event.key !== 'Backspace' && event.key !== 'Delete') {
      event.preventDefault();
    }
  }

  getWordCount(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
  }

  // Profile edit mode methods
  enterEditMode() {
    this.isEditMode = true;
    this.profileError = '';
    this.profileSuccess = '';
  }

  cancelEdit() {
    this.isEditMode = false;
    // Restore original values
    this.profileForm = { ...this.originalProfileData };
    this.imagePreviewUrl = this.originalProfileData.profileImageUrl || null;
    this.profileForm.profileImage = null;
    this.showGenderDropdown = false;
    this.showTimezoneDropdown = false;
    this.profileError = '';
    this.profileSuccess = '';
  }

  applyChanges() {
    this.saveProfile();
  }

  async saveProfile() {
    this.profileLoading = true;
    this.profileError = '';
    this.profileSuccess = '';
    const variables: any = {
      education: this.profileForm.education,
      gender: this.profileForm.gender,
      age: this.profileForm.age,
      bio: this.profileForm.bio,
      timezone: this.profileForm.timezone
    };
    if (this.profileForm.profileImage) {
      // Convert image to base64
      variables.profileImageBase64 = await this.fileToBase64(this.profileForm.profileImage);
    }
    console.log('[saveProfile] Sending profile update with variables:', variables);
    this.apollo.mutate({
      mutation: UPDATE_PROFILE,
      variables: { input: variables }
    }).subscribe({
      next: (result: any) => {
        this.profileLoading = false;
        console.log('[saveProfile] Update profile result:', result);
        if (!result.data || !result.data.updateProfile) {
          this.profileError = 'Failed to update profile. Please try again.';
          return;
        }
        const updateResult = result.data.updateProfile;
        console.log('[saveProfile] Update result:', updateResult);
        if (updateResult.errors && updateResult.errors.length > 0) {
          this.profileError = updateResult.errors.join(', ');
          console.error('[saveProfile] Profile update errors:', updateResult.errors);
        } else {
          this.profileSuccess = 'Profile updated successfully!';
          const user = updateResult.user;
          console.log('[saveProfile] Updated user:', user);
          if (user) {
            // Update local form data
            this.profileForm.profileImageUrl = user.profileImageUrl;
            this.imagePreviewUrl = user.profileImageUrl;
            // Update original data for future cancel operations
            this.originalProfileData = { ...this.profileForm };
            // Update global user state in AuthService
            this.authService.updateCurrentUser(user);
            // Exit edit mode and return to preview
            this.isEditMode = false;
            // Clear any error messages after a short delay
            setTimeout(() => {
              this.profileSuccess = '';
            }, 3000);
          }
        }
      },
      error: (err) => {
        this.profileLoading = false;
        console.error('[saveProfile] Update profile error:', err);
        this.profileError = err.message || 'Failed to update profile.';
      }
    });
  }

  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Payment portal
  openBillingPortal() {
    this.apollo.mutate<{ createBillingPortalSession: { url: string; success: boolean; errors: string[] } }>({
      mutation: CREATE_BILLING_PORTAL_SESSION
    }).subscribe(({ data }) => {
      if (data?.createBillingPortalSession?.success && data.createBillingPortalSession.url) {
        window.location.href = data.createBillingPortalSession.url;
      } else {
        alert(data?.createBillingPortalSession?.errors?.join(', ') || 'Failed to open billing portal');
      }
    }, (err) => {
      console.error('[Appearance] Error creating billing portal session:', err);
      alert('Failed to open billing portal.');
    });
  }
} 