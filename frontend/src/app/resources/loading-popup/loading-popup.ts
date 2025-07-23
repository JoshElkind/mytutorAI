import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-popup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-overlay" *ngIf="isVisible">
      <div class="loading-modal">
        <div class="loading-content">
          <div class="spinner"></div>
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="displayProgress"></div>
          </div>
          <div class="progress-text">{{ displayProgress }}%</div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./loading-popup.scss']
})
export class LoadingPopupComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isVisible: boolean = false;
  @Input() title: string = 'Generating Quiz...';
  @Input() message: string = 'Please wait while we create your quiz questions.';
  @Input() progress: number = 0;
  
  displayProgress: number = 0;
  private progressInterval: any;
  private autoProgress: number = 0;
  private lastActualProgress: number = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.startAutoProgress();
  }

  ngOnDestroy() {
    this.stopAutoProgress();
  }

  ngOnChanges(changes: SimpleChanges) {
    
    if (changes['isVisible']) {
      if (this.isVisible) {
        // Reset when modal becomes visible
        this.autoProgress = 0;
        this.displayProgress = 0;
        this.lastActualProgress = 0;
        this.startAutoProgress();
      } else {
        // Stop when modal becomes invisible
        this.stopAutoProgress();
      }
    }
    
    if (changes['progress'] && changes['progress'].currentValue !== undefined) {
      // Store the actual progress but don't override display immediately
      this.lastActualProgress = changes['progress'].currentValue;
    }
  }

  private startAutoProgress() {
    this.stopAutoProgress(); // Clear any existing interval
    
    this.progressInterval = setInterval(() => {
      if (this.isVisible) {
        // Auto-progress from 0 to 90% gradually
        if (this.autoProgress < 90) {
          this.autoProgress += Math.random() * 2; // Random increment between 0-2%
          this.autoProgress = Math.min(this.autoProgress, 90); // Cap at 90%
        }
        
        // Use the higher of auto-progress or actual progress
        const currentProgress = Math.max(this.autoProgress, this.lastActualProgress);
        this.displayProgress = Math.round(currentProgress); // Round to whole number
        
        this.cdr.detectChanges();
      }
    }, 200); // Update every 200ms for smooth animation
  }

  private stopAutoProgress() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }
} 