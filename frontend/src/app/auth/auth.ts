import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface User {
  id: string;
  email: string;
  name: string;
  userType: 'student' | 'tutor';
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private apollo: Apollo) {
    // On app start, always check with backend for current user
    this.checkCurrentUser();
    // Log current user and cookies on service init
    setTimeout(() => {
      console.log('[AuthService] Current user:', this.currentUserSubject.value);
      if (typeof document !== 'undefined') {
        console.log('[AuthService] Document cookies:', document.cookie);
      }
    }, 1000);
  }

  // Request OTP for login
  requestLoginOtp(email: string): Observable<any> {
    return this.apollo.mutate({
      mutation: gql`
        mutation RequestLoginOtp($email: String!) {
          requestLoginOtp(input: { email: $email }) {
            success
            message
          }
        }
      `,
      variables: { email }
    });
  }

  // Verify OTP and login
  verifyOTPAndLogin(email: string, otp: string): Observable<AuthResponse> {
    const VERIFY_OTP_LOGIN = gql`
      mutation VerifyOTPAndLogin($email: String!, $otp: String!) {
        verifyOTPAndLogin(email: $email, otp: $otp) {
          user {
            id
            email
            name
            userType
            createdAt
          }
        }
      }
    `;

    return this.apollo.mutate({
      mutation: VERIFY_OTP_LOGIN,
      variables: { email, otp }
    }).pipe(
      map((result: any) => {
        const authData = result.data.verifyOTPAndLogin;
        this.currentUserSubject.next(authData.user);
        return authData;
      })
    );
  }

  // Sign up new user
  signup(userData: { email: string; name: string; userType: 'student' | 'tutor' }): Observable<AuthResponse> {
    const SIGNUP = gql`
      mutation Signup($email: String!, $name: String!, $userType: String!) {
        signup(email: $email, name: $name, userType: $userType) {
          user {
            id
            email
            name
            userType
            createdAt
          }
          token
        }
      }
    `;

    return this.apollo.mutate({
      mutation: SIGNUP,
      variables: userData
    }).pipe(
      map((result: any) => {
        const authData = result.data.signup;
        this.currentUserSubject.next(authData.user);
        return authData;
      })
    );
  }

  // Logout
  logout(): Observable<any> {
    const LOGOUT = gql`
      mutation Logout {
        logout(input: {}) {
          success
        }
      }
    `;
    return this.apollo.mutate({
      mutation: LOGOUT
    }).pipe(
      map((result: any) => {
        if (result.data.logout.success) {
          this.currentUserSubject.next(null);
        }
        return result.data.logout;
      })
    );
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Query backend for current user on startup
  private checkCurrentUser(): void {
    const GET_CURRENT_USER = gql`
      query GetCurrentUser {
        me {
          id
          email
          name
          userType
          createdAt
        }
      }
    `;

    if (typeof document !== 'undefined') {
      console.log('[checkCurrentUser] Document cookies:', document.cookie);
    }

    this.apollo.query({
      query: GET_CURRENT_USER
    }).subscribe({
      next: (result: any) => {
        this.currentUserSubject.next(result.data.me);
      },
      error: () => {
        this.currentUserSubject.next(null);
      }
    });
  }
}
