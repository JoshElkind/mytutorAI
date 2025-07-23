import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { gql } from 'apollo-angular';
import { Lesson } from './lesson.interface';

const GET_LESSONS = gql`
  query GetLessons {
    currentUser {
      id
      userType
      lessons {
        id
        name
        subject
        ageGroup
        grades
        studentCap
        description
        materials
        createdAt
      }
    }
  }
`;

const ADD_LESSON = gql`
  mutation AddLesson(
    $name: String!
    $subject: String!
    $ageGroup: String!
    $grades: [String!]!
    $studentCap: String
    $description: String
    $materials: [String!]
  ) {
    addLesson(
      name: $name
      subject: $subject
      ageGroup: $ageGroup
      grades: $grades
      studentCap: $studentCap
      description: $description
      materials: $materials
    ) {
      lesson {
        id
        name
        subject
        ageGroup
        grades
        studentCap
        description
        materials
        createdAt
      }
      errors
    }
  }
`;

const UPDATE_LESSON = gql`
  mutation UpdateLesson(
    $lessonIndex: Int!
    $name: String!
    $subject: String!
    $ageGroup: String!
    $grades: [String!]!
    $studentCap: String
    $description: String
    $materials: [String!]
  ) {
    updateLesson(
      lessonIndex: $lessonIndex
      name: $name
      subject: $subject
      age_group: $ageGroup
      grades: $grades
      student_cap: $studentCap
      description: $description
      materials: $materials
    ) {
      lesson {
        id
        name
        subject
        ageGroup
        grades
        studentCap
        description
        materials
        createdAt
      }
      errors
    }
  }
`;

const DELETE_LESSON = gql`
  mutation DeleteLesson($lessonId: String!) {
    deleteLesson(lessonId: $lessonId) {
      success
      errors
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class LessonsService {
  constructor(private apollo: Apollo) {}

  getLessons(): Observable<Lesson[]> {
    return this.apollo.watchQuery<any>({
      query: GET_LESSONS,
      fetchPolicy: 'network-only'
    }).valueChanges.pipe(
      map(result => {
        const lessons = result.data?.currentUser?.lessons || [];
        return lessons;
      })
    );
  }

  addLesson(lessonData: Omit<Lesson, 'id' | 'createdAt'>): Observable<any> {
    return this.apollo.mutate<any>({
      mutation: ADD_LESSON,
      variables: lessonData,
      refetchQueries: [{ query: GET_LESSONS }]
    });
  }

  updateLesson(lessonIndex: number, lessonData: Omit<Lesson, 'id' | 'createdAt'>): Observable<any> {
    return this.apollo.mutate<any>({
      mutation: UPDATE_LESSON,
      variables: { lessonIndex, ...lessonData },
      refetchQueries: [{ query: GET_LESSONS }]
    });
  }

  deleteLesson(lessonId: string): Observable<any> {
    return this.apollo.mutate<any>({
      mutation: DELETE_LESSON,
      variables: { lessonId },
      refetchQueries: [{ query: GET_LESSONS }]
    });
  }


} 