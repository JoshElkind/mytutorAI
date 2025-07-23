import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Apollo } from 'apollo-angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import gql from 'graphql-tag';

const REQUEST_LOGIN_OTP = gql`
  mutation RequestLoginOtp($email: String!) {
    requestLoginOtp(input: { email: $email }) {
      success
      message
      code
    }
  }
`;

const VERIFY_OTP_AND_LOGIN = gql`
  mutation VerifyOtpAndLogin($email: String!, $code: String!) {
    verifyOtpAndLogin(input: { email: $email, code: $code }) {
      success
      message
      user {
        id
        email
        name
        userType
        education
        gender
        age
        bio
        profileImageUrl
        timezone
      }
    }
  }
`;

const SIGNUP = gql`
  mutation Signup($email: String!, $name: String!, $userType: String!) {
    signup(input: { email: $email, name: $name, userType: $userType }) {
      success
      message
      code
    }
  }
`;

const VERIFY_SIGNUP_CODE = gql`
  mutation VerifySignupCode($email: String!, $code: String!) {
    verifySignupCode(input: { email: $email, code: $code }) {
      success
      message
      user {
        id
        email
        name
        userType
        education
        gender
        age
        bio
        profileImageUrl
        timezone
      }
    }
  }
`;

const LOGOUT = gql`
  mutation Logout {
    logout(input: {}) {
      success
    }
  }
`;

const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    currentUser {
      id
      email
      name
      userType
      education
      gender
      age
      bio
      profileImageUrl
      timezone
      pastSessions
    }
  }
`;

export interface User {
  id: string;
  email: string;
  name: string;
  userType: string;
  education: string;
  gender: string;
  age: number | null;
  bio: string;
  profileImageUrl: string;
  timezone: string;
  pastSessions?: any[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  code?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null | undefined>(undefined);
  // Emits true when auth is loaded
  public isAuthLoaded$ = this.currentUserSubject.pipe(map(user => user !== undefined));
  // Emits only User | null (never undefined)
  public currentUser$ = this.currentUserSubject.pipe(
    filter((user): user is User | null => user !== undefined)
  );

  constructor(private apollo: Apollo, @Inject(PLATFORM_ID) private platformId: Object) {
    // Only check current user in the browser, not during SSR
    if (isPlatformBrowser(this.platformId)) {
      this.checkCurrentUser();
    }
    // Log current user and cookies on service init
    setTimeout(() => {
      if (typeof document !== 'undefined') {
      }
    }, 1000);
  }

  requestLoginOtp(email: string): Observable<AuthResponse> {
    return this.apollo.mutate<{ requestLoginOtp: AuthResponse }>({
      mutation: REQUEST_LOGIN_OTP,
      variables: { email }
    }).pipe(
      map(result => {
        return result.data?.requestLoginOtp || { success: false, message: 'Failed to request OTP' };
      })
    );
  }

  verifyOtpAndLogin(email: string, code: string): Observable<AuthResponse> {
    return this.apollo.mutate<{ verifyOtpAndLogin: AuthResponse }>({
      mutation: VERIFY_OTP_AND_LOGIN,
      variables: { email, code }
    }).pipe(
      map(result => {
        const response = result.data?.verifyOtpAndLogin || { success: false, message: 'Failed to verify OTP' };
        if (response.success && response.user) {
          const user = response.user;
          this.currentUserSubject.next({
            id: user.id,
            email: user.email,
            name: user.name,
            userType: user.userType,
            education: user.education || '',
            gender: user.gender || '',
            age: user.age ?? null,
            bio: user.bio || '',
            profileImageUrl: user.profileImageUrl || '',
            timezone: user.timezone || ''
          });
        }
        return response;
      })
    );
  }

  signup(email: string, name: string, userType: string): Observable<AuthResponse> {
    return this.apollo.mutate<{ signup: AuthResponse }>({
      mutation: SIGNUP,
      variables: { email, name, userType }
    }).pipe(
      map(result => {
        if (result.errors && result.errors.length > 0) {
          return { success: false, message: result.errors[0].message };
        }
        
        const response = result.data?.signup;
        
        if (!response) {
          return { success: false, message: 'No response from server' };
        }
        
        return response;
      })
    );
  }

  verifySignupCode(email: string, code: string): Observable<AuthResponse> {
    return this.apollo.mutate<{ verifySignupCode: AuthResponse }>({
      mutation: VERIFY_SIGNUP_CODE,
      variables: { email, code }
    }).pipe(
      map(result => {
        const response = result.data?.verifySignupCode || { success: false, message: 'Failed to verify signup code' };
        if (response.success && response.user) {
          const user = response.user;
          this.currentUserSubject.next({
            id: user.id,
            email: user.email,
            name: user.name,
            userType: user.userType,
            education: user.education || '',
            gender: user.gender || '',
            age: user.age ?? null,
            bio: user.bio || '',
            profileImageUrl: user.profileImageUrl || '',
            timezone: user.timezone || ''
          });
        }
        return response;
      })
    );
  }

  logout(): Observable<AuthResponse> {
    return this.apollo.mutate<{ logout: AuthResponse }>({
      mutation: LOGOUT
    }).pipe(
      map(result => {
        const response = result.data?.logout || { success: false, message: 'Failed to logout' };
        if (response.success) {
          this.currentUserSubject.next(null);
        }
        return response;
      })
    );
  }

  private checkCurrentUser(): void {
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    this.apollo.query<{ currentUser: User }>({
      query: GET_CURRENT_USER
    }).subscribe({
      next: (result) => {
        if (isBrowser && result.data?.currentUser) {
          // Ensure all fields are mapped
          const user = result.data.currentUser;
          this.currentUserSubject.next({
            id: user.id,
            email: user.email,
            name: user.name,
            userType: user.userType,
            education: user.education || '',
            gender: user.gender || '',
            age: user.age ?? null,
            bio: user.bio || '',
            profileImageUrl: user.profileImageUrl || '',
            timezone: user.timezone || '',
            pastSessions: user.pastSessions || [] // Assuming pastSessions is an array of session objects
          });
        } else {
          this.currentUserSubject.next(null);
        }
      },
      error: (error) => {
        this.currentUserSubject.next(null);
      }
    });
  }

  // Manual trigger for debugging
  public manualCheckCurrentUser(): void {
    this.checkCurrentUser();
  }

  getCurrentUser(): User | null {
    const user = this.currentUserSubject.value;
    return user === undefined ? null : user;
  }

  // Update current user state (used after profile updates)
  updateCurrentUser(updatedUser: User): void {
    this.currentUserSubject.next(updatedUser);
  }

  // Test method to verify Apollo Client is working
  testConnection(): Observable<any> {
    const TEST_QUERY = gql`
      query TestConnection {
        __schema {
          types {
            name
          }
        }
      }
    `;
    
    return this.apollo.query({
      query: TEST_QUERY
    }).pipe(
      map(result => {
        return result;
      })
    );
  }
} 