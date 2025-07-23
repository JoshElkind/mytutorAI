import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="footer">
      <span class="footer-je-absolute">A JE Production</span>
      <div class="footer-right-absolute">
        <a href="https://github.com/JoshElkind" target="_blank" rel="noopener noreferrer" class="footer-link">
          <svg class="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.48 2.87 8.28 6.84 9.63.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85.004 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12.26C22 6.58 17.52 2 12 2z"/></svg>
          GitHub
        </a>
        <a href="https://www.linkedin.com/in/joshua-elkind-565014345/" target="_blank" rel="noopener noreferrer" class="footer-link">
          <svg class="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
          LinkedIn
        </a>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: rgba(243, 244, 246, 0.95);
      border-top: 1px solid rgba(209, 213, 219, 0.5);
      backdrop-filter: blur(4px);
      width: 100%;
      height: 64px;
      margin-top: auto;
    }
    .footer-je-absolute {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 64px;
      display: flex;
      align-items: center;
      padding-left: 1.5rem;
      color: #374151;
      font-family: 'Permanent Marker', cursive, sans-serif;
      font-size: 0.95rem;
      letter-spacing: 0.05em;
      opacity: 0.85;
      pointer-events: none;
      user-select: none;
    }
    .footer-right-absolute {
      position: absolute;
      right: 0;
      bottom: 0;
      height: 64px;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding-right: 1.5rem;
    }
    .footer-link {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: #374151;
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 500;
      opacity: 0.85;
      transition: color 0.2s, opacity 0.2s;
    }
    .footer-link:hover {
      color: #1f2937;
      opacity: 1;
    }
    .footer-icon {
      width: 1.1em;
      height: 1.1em;
      vertical-align: middle;
      margin-bottom: 1px;
    }
    @media (max-width: 600px) {
      .footer-right-absolute {
        gap: 1rem;
        padding-right: 0.5rem;
      }
      .footer-je-absolute {
        padding-left: 0.5rem;
        font-size: 0.9rem;
      }
    }
  `]
})
export class FooterComponent {} 