import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="help-container">
      <div class="help-header-row">
        <div class="help-title">Guide</div>
        <div class="help-author">
          <span class="author-name">Joshua Elkind</span>
          <img src="/me.png" alt="Joshua Elkind" class="author-img" />
        </div>
      </div>
      <div class="help-guide-text">
        <div class="guide-section">
          <p>Welcome to MyTutor! This guide will help both <b>students</b> and <b>tutors</b> get the most out of the platform.</p>

          <b>For Students:</b>
          <ol>
            <li><b>Sign Up / Log In:</b> Create an account or log in to access all features.</li>
            <li><b>Explore Offerings:</b> Browse available lessons and tutors on the Explore page. Use filters and search to find what fits you best.</li>
            <li><b>Book a Lesson:</b> Click on a lesson to view details and schedule a session with a tutor.</li>
            <li><b>Join Sessions:</b> Access your upcoming sessions from the Sessions page or calendar. Click 'Join' to enter a video call at the scheduled time.</li>
            <li><b>Session History:</b> View your past lessons and feedback in the Session History page. Click on a lesson to see all your sessions and feedback.</li>
            <li><b>Resources:</b> Download worksheets, quizzes, and learning materials from the Resources page.</li>
            <li><b>Get Help:</b> Use this Help page for guidance, or contact support if you have issues.</li>
          </ol>

          <b>For Tutors:</b>
          <ol>
            <li><b>Sign Up / Log In:</b> Register as a tutor to create and manage your offerings.</li>
            <li><b>Create Offerings:</b> Go to the Offerings page to add new lessons, set prices, and manage your schedule.</li>
            <li><b>Manage Bookings:</b> View and approve student bookings. See your upcoming sessions in the Sessions or Calendar page.</li>
            <li><b>Host Sessions:</b> Start video calls with students at the scheduled time. Share resources and guide students through the lesson.</li>
            <li><b>Session History:</b> Review your past sessions with each student. Click on a lesson, then a student, to see their session history and feedback.</li>
            <li><b>Upload Resources:</b> Add worksheets, quizzes, and materials for your students in the Resources section.</li>
            <li><b>Get Help:</b> Refer to this guide or reach out to support for assistance.</li>
          </ol>

          <b>General Tips:</b>
          <ul>
            <li>Use the search bars and filters to quickly find lessons, resources, or sessions.</li>
            <li>Check your notifications for updates on bookings and messages.</li>
            <li>Keep your profile up to date for a better experience.</li>
            <li>Respect community guidelines and be courteous in all interactions.</li>
          </ul>

          <p>If you have any questions or need further help, don't hesitate to reach out!</p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./help.component.scss']
})
export class HelpComponent {} 