export interface Offering {
  id: string;
  tutorId: string;
  lessonId: string;
  price: number;
  duration: number;
  availableTimes: string[];
  maxStudents: number;
  enrolledCount: number;
  createdAt: string;
  updatedAt: string;
  lesson: Lesson;
  tutor: User;
}

export interface Lesson {
  id: string;
  name: string;
  subject: string;
  ageGroup?: string;
  grades?: string[];
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  user_type: string;
  profileImageUrl?: string;
  rating?: number;
  totalSessions?: number;
}

export interface CreateOfferingData {
  tutorId: string;
  lessonId: string;
  price: number;
  duration: number;
  availableTimes: string[];
  maxStudents: number;
} 