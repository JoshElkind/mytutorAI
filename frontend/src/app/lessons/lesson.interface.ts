export interface Lesson {
  id: string;
  name: string;
  subject: string;
  ageGroup: string;
  grades: string[];
  studentCap?: string;
  description?: string;
  materials?: string[];
  createdAt: string;
  currentStudentCount?: number;
}

export interface Subject {
  name: string;
  emoji: string;
}

export interface AgeGroup {
  name: string;
  grades: string[];
}

export const SUBJECTS: Subject[] = [
  { name: 'Mathematics', emoji: '📐' },
  { name: 'Science', emoji: '🔬' },
  { name: 'Chemistry', emoji: '🧪' },
  { name: 'Physics', emoji: '⚡' },
  { name: 'Biology', emoji: '🧬' },
  { name: 'English', emoji: '📚' },
  { name: 'Literature', emoji: '📖' },
  { name: 'History', emoji: '📜' },
  { name: 'Geography', emoji: '🌍' },
  { name: 'Archeology', emoji: '🏺' },
  { name: 'Computer Science', emoji: '💻' },
  { name: 'Programming', emoji: '⌨️' },
  { name: 'Art', emoji: '🎨' },
  { name: 'Music', emoji: '🎵' },
  { name: 'Economics', emoji: '💰' },
  { name: 'Psychology', emoji: '🧠' },
  { name: 'Philosophy', emoji: '🤔' },
  { name: 'Astronomy', emoji: '🔭' },
  { name: 'Environmental Science', emoji: '🌱' },
  { name: 'Law', emoji: '⚖️' }
];

export const AGE_GROUPS: AgeGroup[] = [
  {
    name: 'Elementary School',
    grades: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8']
  },
  {
    name: 'High School',
    grades: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
  },
  {
    name: 'College',
    grades: ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate']
  },
  {
    name: 'Adult',
    grades: ['Adult Learner']
  }
]; 