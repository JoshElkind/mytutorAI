import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthResponse } from '../auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-modal.html',
  styleUrl: './login-modal.scss'
})
export class LoginModalComponent {
  @Output() closeModal = new EventEmitter<void>();
  @Output() switchToSignup = new EventEmitter<void>();

  email: string = '';
  otp: string = '';
  otpDigits: string[] = ['', '', '', ''];
  isLoading: boolean = false;
  isSendingCode: boolean = false;
  isVerifying: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  showOTPInput: boolean = false;
  countdown: number = 0;
  countdownInterval: any;

  constructor(private authService: AuthService, private cdr: ChangeDetectorRef) {}

  // Request OTP for login
  requestOTP(): void {
    if (!this.email) {
      this.errorMessage = 'Please enter your email address';
      return;
    }

    this.isLoading = true;
    this.isSendingCode = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Do NOT show OTP input or success message yet
    // Only show after backend confirms account exists

    this.authService.requestLoginOtp(this.email).subscribe({
      next: (response: AuthResponse) => {
        this.isLoading = false;
        this.isSendingCode = false;
        
        if (response.success) {
          // Show OTP input only if account exists and code was sent
          this.showOTPInput = true;
          this.successMessage = 'A 4-digit login code has been sent to your email. Please check your inbox (it may take a couple of minutes).';
          this.startCountdown();
        } else {
          // Show error message if account doesn't exist
          this.errorMessage = response.message || 'Failed to generate code';
          this.showOTPInput = false; // Don't show OTP input
          this.successMessage = ''; // Clear any success message
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.isSendingCode = false;
        this.errorMessage = 'Failed to generate code. Please try again.';
        this.showOTPInput = false; // Don't show OTP input
        this.successMessage = ''; // Clear any success message
      }
    });
  }

  // Handle OTP digit input
  onOtpInput(index: number, event: any, currentInput: HTMLInputElement, nextInput: HTMLInputElement | null): void {
    const value = event.target.value;
    
    // Only allow numbers
    if (!/^\d*$/.test(value)) {
      event.target.value = '';
      return;
    }
    
    this.otpDigits[index] = value;
    
    // Auto-focus next input
    if (value && nextInput) {
      nextInput.focus();
    }
    
    // Always update the combined OTP string
    this.otp = this.otpDigits.join('');
  }

  // Handle backspace in OTP inputs
  onOtpKeydown(event: KeyboardEvent, index: number, currentInput: HTMLInputElement, prevInput: HTMLInputElement | null): void {
    if (event.key === 'Backspace' && !currentInput.value && prevInput) {
      prevInput.focus();
    }
  }

  // Verify OTP and login
  verifyOTP(): void {
    if (this.isVerifying) return;
    this.isLoading = true;
    this.isVerifying = true;
    if (!this.otp || this.otp.length !== 4) {
      this.errorMessage = 'Please enter the complete 4-digit code';
      this.isLoading = false;
      this.isVerifying = false;
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.verifyOtpAndLogin(this.email, this.otp).subscribe({
      next: (response: AuthResponse) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message || 'Login successful!';
          this.errorMessage = '';
          setTimeout(() => {
            this.closeModal.emit();
          }, 1500);
        } else {
          this.errorMessage = response.message || 'Invalid OTP. Please try again.';
          this.otpDigits = ['', '', '', ''];
          this.otp = '';
          this.isVerifying = false;
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.isVerifying = false;
        this.errorMessage = 'Login failed. Please try again.';
      }
    });
  }

  // Switch to signup modal
  onSwitchToSignup(): void {
    this.switchToSignup.emit();
  }

  // Close modal
  onClose(): void {
    this.closeModal.emit();
  }

  // Start countdown for resend OTP
  private startCountdown(): void {
    this.countdown = 60;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      this.cdr.markForCheck();
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
      }
    }, 1000);
  }

  // Resend OTP
  resendOTP(): void {
    if (this.countdown > 0) return;
    this.requestOTP();
  }

  // Validate email format
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Cleanup on destroy
  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
}
