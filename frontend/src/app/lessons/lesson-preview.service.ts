import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LessonPreviewData {
  lessonId: string;
  lessonName: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class LessonPreviewService {
  private previewDataSubject = new BehaviorSubject<LessonPreviewData | null>(null);
  public previewData$ = this.previewDataSubject.asObservable();

  openLessonPreview(lessonId: string, lessonName: string, description: string) {
    const previewData: LessonPreviewData = {
      lessonId,
      lessonName,
      description
    };
    this.previewDataSubject.next(previewData);
  }

  clearPreviewData() {
    this.previewDataSubject.next(null);
  }
} 