import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../auth/auth.service';
import { LoginModalComponent } from '../auth/login-modal/login-modal';
import { SignupModalComponent } from '../auth/signup-modal/signup-modal';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LoginModalComponent, SignupModalComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit {
  currentUser: User | null = null;
  isLoggedIn: boolean = false;
  
  // Modal states
  showLoginModal: boolean = false;
  showSignupModal: boolean = false;
  
  // GraphQL test
  graphqlResult: string = '';
  graphqlError: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private apollo: Apollo
  ) {}

  ngOnInit(): void {
    // Subscribe to auth state changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
    });
  }

  // Modal methods
  openLoginModal(): void {
    this.showLoginModal = true;
  }

  closeLoginModal(): void {
    this.showLoginModal = false;
  }

  openSignupModal(): void {
    this.showSignupModal = true;
  }

  closeSignupModal(): void {
    this.showSignupModal = false;
  }

  switchToSignup(): void {
    this.showLoginModal = false;
    this.showSignupModal = true;
  }

  switchToLogin(): void {
    this.showSignupModal = false;
    this.showLoginModal = true;
  }

  // Logout
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logged out successfully');
        // Navigate to home page after logout
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Navigate to home page even if logout fails
        this.router.navigate(['/']);
      }
    });
  }

  // GraphQL connection test
  testGraphQLConnection(): void {
    this.graphqlResult = '';
    this.graphqlError = '';
    
    const TEST_QUERY = gql`
      query TestConnection {
        __schema {
          types {
            name
          }
        }
      }
    `;
    
    this.apollo.query({
      query: TEST_QUERY
    }).subscribe({
      next: (result: any) => {
        this.graphqlResult = 'GraphQL connection successful!';
      },
      error: (error: any) => {
        this.graphqlError = error.message || 'GraphQL connection failed';
      }
    });
  }

  // Hero section button handlers
  onGetStarted(): void {
    if (!this.isLoggedIn) {
      this.openSignupModal();
    }
    // If user is already logged in, do nothing for now
  }

  onLearnMore(): void {
    // No action for now
  }

  onExplore(): void {
    this.router.navigate(['/explore']);
  }

  onGetHelp(): void {
    this.router.navigate(['/help']);
  }
}
