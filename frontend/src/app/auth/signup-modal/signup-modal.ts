import { Component, EventEmitter, Output, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-signup-modal',
  templateUrl: './signup-modal.component.html',
  styleUrls: ['./signup-modal.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SignupModalComponent {
  @Output() closeModal = new EventEmitter<void>();
  @Output() switchToLogin = new EventEmitter<void>();

  email: string = '';
  name: string = '';
  userType: string = 'student';
  code: string = '';
  codeDigits: string[] = ['', '', '', ''];
  isLoading: boolean = false;
  isSendingCode: boolean = false;
  message: string = '';
  showCodeStep: boolean = false;
  generatedCode: string = '';
  resendCountdown: number = 0;
  resendInterval: any;

  cdr = inject(ChangeDetectorRef);

  constructor(private authService: AuthService) {}

  onSignup(): void {
    if (!this.email || !this.name) {
      this.message = 'Please fill in all fields';
      return;
    }

    this.isLoading = true;
    this.isSendingCode = true;
    this.message = '';

    this.authService.signup(this.email, this.name, this.userType).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isSendingCode = false;
        
        if (response.success) {
          this.showCodeStep = true;
          this.startResendCountdown();
          this.cdr.detectChanges();
        } else {
          // Show error immediately if user already exists
          if (response.message && response.message.includes('already exists')) {
            this.message = 'User with this email already exists.';
            this.isLoading = false;
            this.isSendingCode = false;
            this.cdr.detectChanges();
          } else {
            this.message = response.message || 'Failed to generate code';
            this.isLoading = false;
            this.isSendingCode = false;
            this.cdr.detectChanges();
          }
          this.email = '';
          this.name = '';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.isSendingCode = false;
        this.message = 'An error occurred during signup. Please try again.';
        this.codeDigits = ['', '', '', ''];
        this.code = '';
      }
    });
  }

  startResendCountdown(): void {
    this.resendCountdown = 60;
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
    this.resendInterval = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        clearInterval(this.resendInterval);
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  onResendCode(): void {
    if (this.resendCountdown > 0) return;
    this.onSignup();
  }

  // Handle code digit input
  onCodeInput(index: number, event: any, currentInput: HTMLInputElement, nextInput: HTMLInputElement | null): void {
    const value = event.target.value;
    
    // Only allow numbers
    if (!/^\d*$/.test(value)) {
      event.target.value = '';
      return;
    }
    
    this.codeDigits[index] = value;
    
    // Auto-focus next input
    if (value && nextInput) {
      nextInput.focus();
    }
    
    // Always update the combined code string
    this.code = this.codeDigits.join('');
  }

  // Handle backspace in code inputs
  onCodeKeydown(event: KeyboardEvent, index: number, currentInput: HTMLInputElement, prevInput: HTMLInputElement | null): void {
    if (event.key === 'Backspace' && !currentInput.value && prevInput) {
      prevInput.focus();
    }
  }

  onVerifyCode(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    if (!this.code || this.code.length !== 4) {
      this.message = 'Please enter the complete 4-digit code';
      this.isLoading = false;
      return;
    }
    this.message = '';
    this.authService.verifySignupCode(this.email, this.code).subscribe({
      next: (response) => {
        if (response.success && response.user) {
          // Always use the backend user object for name/email after signup
          // (the AuthService already sets currentUser to response.user)
          this.isLoading = false;
          setTimeout(() => {
            this.closeModal.emit();
          }, 1500);
        } else {
          this.isLoading = false;
          this.message = response.message || 'Invalid code. Please try again.';
          this.codeDigits = ['', '', '', ''];
          this.code = '';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.message = 'An error occurred during verification. Please try again.';
        this.codeDigits = ['', '', '', ''];
        this.code = '';
      }
    });
  }

  onBackToSignup(): void {
    this.showCodeStep = false;
    this.code = '';
    this.message = '';
  }

  onClose(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
    // Reset form
    this.email = '';
    this.name = '';
    this.userType = 'student';
    this.code = '';
    this.message = '';
    this.showCodeStep = false;
    this.generatedCode = '';
    this.closeModal.emit();
  }

  onSwitchToLogin(): void {
    this.switchToLogin.emit();
  }
}
