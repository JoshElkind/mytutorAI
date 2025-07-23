import { Component, ViewChild, HostListener, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { RouterOutlet, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from './auth/auth.service';
import { Observable, Subject } from 'rxjs';
import { LoginModalComponent } from './auth/login-modal/login-modal';
import { SignupModalComponent } from './auth/signup-modal/signup-modal';
import { FooterComponent } from './footer.component';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { map, takeUntil } from 'rxjs/operators';
import { SessionWarningPopupComponent } from './session-warning-popup/session-warning-popup';
import { ChatPopupComponent } from './chat/chat-popup.component';
import { ChatPopupService } from './chat/chat-popup.service';

export interface Session {
  id: string;
  tutorName: string;
  tutorEmail: string;
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
`;

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterModule,
    CommonModule,
    LoginModalComponent,
    SignupModalComponent,
    FooterComponent,
    SessionWarningPopupComponent,
    ChatPopupComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnDestroy {
  protected title = 'frontend';
  protected currentUser$: Observable<User | null>;
  protected showLoginModal = false;
  protected showSignupModal = false;
  protected showDropdown = false;
  public isAuthLoaded$: Observable<boolean>;
  public sessions: Session[] = [];
  public now: Date = new Date();
  private timer: any;
  public sessionWarningMessage: string | null = null;
  public showSessionWarning: boolean = false;
  private sessionWarningTimeout: any;
  private isDestroyed = false;
  private destroy$ = new Subject<void>();
  private sessionsSubscription: any;

  @ViewChild(LoginModalComponent) loginModal!: LoginModalComponent;
  @ViewChild(SignupModalComponent) signupModal!: SignupModalComponent;

  constructor(
    private authService: AuthService, 
    public router: Router, 
    private apollo: Apollo, 
    private cdr: ChangeDetectorRef, 
    private ngZone: NgZone,
    private chatPopup: ChatPopupService
  ) {
    this.isAuthLoaded$ = this.authService.isAuthLoaded$;
    this.currentUser$ = this.authService.currentUser$;
    // Fetch sessions
    this.fetchSessions();
    
    // Run timer outside Angular zone to avoid change detection issues
    this.ngZone.runOutsideAngular(() => {
      this.timer = setInterval(() => {
        if (this.isDestroyed) return;
        
        this.ngZone.run(() => {
          this.now = new Date();
          this.fetchSessions();
          this.checkSessionWarnings();
        });
      }, 10000); // update every 10 seconds
    });
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.sessionWarningTimeout) {
      clearTimeout(this.sessionWarningTimeout);
    }
    if (this.sessionsSubscription) {
      this.sessionsSubscription.unsubscribe();
    }
  }

  private fetchSessions() {
    if (this.isDestroyed) return;
    
    // Unsubscribe from previous subscription if it exists
    if (this.sessionsSubscription) {
      this.sessionsSubscription.unsubscribe();
    }
    
    this.sessionsSubscription = this.apollo.watchQuery<{ myUpcomingSessions: Session[] }>({
      query: GET_MY_UPCOMING_SESSIONS,
      fetchPolicy: 'network-only'
    }).valueChanges.pipe(
      map(result => (result.data && result.data.myUpcomingSessions) ? result.data.myUpcomingSessions : []),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (sessions) => {
        if (!this.isDestroyed) {
          this.sessions = sessions;
        }
      },
      error: (error) => {
        if (!this.isDestroyed) {
          console.error('[SessionWarning] Error fetching sessions:', error);
        }
      }
    });
  }

  public hasOngoingSession(): boolean {
    const user = this.authService.getCurrentUser();
    if (!this.sessions || !user) return false;
    return this.sessions.some(s => {
      const now = this.now.getTime();
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      return now >= start && now < end && (
        (user.userType === 'tutor' && s.tutorEmail === user.email) ||
        (user.userType === 'student' && s.studentEmail === user.email)
      );
    });
  }

  protected joinSession(): void {
    const user = this.authService.getCurrentUser();
    if (!this.sessions || !user) return;

    const ongoing = this.sessions.find(s => {
      const now = this.now.getTime();
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      return now >= start && now < end && (
        (user.userType === 'tutor' && s.tutorEmail === user.email) ||
        (user.userType === 'student' && s.studentEmail === user.email)
      );
    });

    if (ongoing) {
      // Navigate to video call page with session ID
      this.router.navigate(['/call', ongoing.id], { state: { session: ongoing } });
    } else {
      console.warn('[JoinSession] No ongoing session found.');
    }
  }

  protected toggleDropdown(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.showDropdown = !this.showDropdown;
    } else {
      this.openLoginModal();
    }
  }

  protected signOut(): void {
    this.authService.logout().subscribe({
      next: (response) => {
        console.log('Logout successful:', response);
        this.showDropdown = false;
        // Navigate to home page after logout
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.showDropdown = false;
        // Navigate to home page even if logout fails
        this.router.navigate(['/']);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-section')) {
      this.showDropdown = false;
    }
  }

  protected openLoginModal(): void {
    this.showLoginModal = true;
    this.showSignupModal = false;
    this.showDropdown = false;
  }

  protected openSignupModal(): void {
    this.showSignupModal = true;
    this.showLoginModal = false;
    this.showDropdown = false;
  }

  protected closeLoginModal(): void {
    this.showLoginModal = false;
  }

  protected closeSignupModal(): void {
    this.showSignupModal = false;
  }

  protected switchToSignup(): void {
    this.showLoginModal = false;
    this.showSignupModal = true;
  }

  protected switchToLogin(): void {
    this.showSignupModal = false;
    this.showLoginModal = true;
  }

  protected onUserButtonClick(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.toggleDropdown();
    } else {
      this.openLoginModal();
    }
  }

  protected openChat(): void {
    this.chatPopup.open();
  }

  private checkSessionWarnings() {
    if (this.isDestroyed) return;
    
    const user = this.authService.getCurrentUser();
    if (!this.sessions || !user) {
      return;
    }
    
    const now = this.now.getTime();
    for (const s of this.sessions) {
      const start = new Date(s.startTime).getTime();
      const diff = Math.floor((start - now) / 60000); // minutes until start
      
      if ((diff === 15 || diff === 5) && (
        (user.userType === 'tutor' && s.tutorEmail === user.email) ||
        (user.userType === 'student' && s.studentEmail === user.email)
      )) {
        if (this.sessionWarningMessage !== `Session starting in ${diff} minutes.`) {
          // Use setTimeout to defer to next change detection cycle
          setTimeout(() => {
            if (!this.isDestroyed) {
              this.sessionWarningMessage = `Session starting in ${diff} minutes.`;
              this.showSessionWarning = true;
              this.cdr.detectChanges();
              clearTimeout(this.sessionWarningTimeout);
              this.sessionWarningTimeout = setTimeout(() => this.closeSessionWarning(), 10000);
            }
          }, 0);
        }
        return;
      }
    }
    // If no warning needed, hide
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.closeSessionWarning();
      }
    }, 0);
  }

  public closeSessionWarning() {
    if (this.isDestroyed) return;
    
    this.showSessionWarning = false;
    setTimeout(() => {
      if (!this.isDestroyed && !this.showSessionWarning) {
        this.sessionWarningMessage = null;
        this.cdr.detectChanges();
      }
    }, 300);
  }
}
