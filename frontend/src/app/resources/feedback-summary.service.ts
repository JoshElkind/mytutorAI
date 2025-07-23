import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FeedbackSummaryResponse } from './feedback-summary.interface';

@Injectable({ providedIn: 'root' })
export class FeedbackSummaryService {
  constructor(private http: HttpClient) {}

  getSummary(transcript: string): Observable<FeedbackSummaryResponse> {
    // In the future, this will call the backend endpoint
    return this.http.post<FeedbackSummaryResponse>('/api/meeting-feedback/summary', { transcript });
  }
} 