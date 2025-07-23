import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-session-warning-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-warning-popup.html',
  styleUrl: './session-warning-popup.scss'
})
export class SessionWarningPopupComponent implements OnInit, OnDestroy {
  @Input() message: string = '';
  @Output() closed = new EventEmitter<void>();
  visible = false;
  private autoCloseTimeout: any;

  ngOnInit() {
    // Start visible and trigger animation
    setTimeout(() => {
      this.visible = true;
    }, 100);
    
    // Auto close after 10 seconds
    this.autoCloseTimeout = setTimeout(() => this.close(), 10000);
  }

  ngOnDestroy() {
    if (this.autoCloseTimeout) {
      clearTimeout(this.autoCloseTimeout);
    }
  }

  close() {
    this.visible = false;
    setTimeout(() => this.closed.emit(), 300); // allow animation to finish
  }
} 