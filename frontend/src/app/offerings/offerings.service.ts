import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { gql } from 'apollo-angular';
import { Offering, CreateOfferingData } from './offering.interface';

const GET_MY_OFFERINGS = gql`
  query GetMyOfferings {
    myOfferings {
      id
      tutorId
      lessonId
      price
      duration
      availableTimes
      maxStudents
      enrolledCount
      createdAt
      updatedAt
      lesson {
        id
        name
        subject
        ageGroup
        description
      }
      tutor {
        id
        name
        email
        profileImageUrl
        rating
        totalSessions
      }
    }
  }
`;

const GET_ALL_OFFERINGS = gql`
  query GetAllOfferings {
    allOfferings {
      id
      tutorId
      lessonId
      price
      duration
      availableTimes
      maxStudents
      enrolledCount
      createdAt
      updatedAt
      lesson {
        id
        name
        subject
        ageGroup
        description
      }
      tutor {
        id
        name
        email
        profileImageUrl
        rating
        totalSessions
      }
    }
  }
`;

const GET_OFFERING = gql`
  query GetOffering($id: ID!) {
    offering(id: $id) {
      id
      tutorId
      lessonId
      price
      duration
      availableTimes
      maxStudents
      enrolledCount
      createdAt
      updatedAt
      lesson {
        id
        name
        subject
        ageGroup
        description
      }
      tutor {
        id
        name
        email
        profileImageUrl
        rating
        totalSessions
      }
    }
  }
`;

const CREATE_OFFERING = gql`
  mutation CreateOffering(
    $tutorId: ID!
    $lessonId: ID!
    $price: Float!
    $duration: Int!
    $availableTimes: [ISO8601DateTime!]!
    $maxStudents: Int!
  ) {
    createOffering(
      tutorId: $tutorId
      lessonId: $lessonId
      price: $price
      duration: $duration
      availableTimes: $availableTimes
      maxStudents: $maxStudents
    ) {
      offering {
        id
        tutorId
        lessonId
        price
        duration
        availableTimes
        maxStudents
        enrolledCount
        createdAt
        updatedAt
        lesson {
          id
          name
          subject
          ageGroup
          description
        }
        tutor {
          id
          name
          email
          profileImageUrl
          rating
          totalSessions
        }
      }
      errors
    }
  }
`;

const DELETE_OFFERING = gql`
  mutation DeleteOffering($id: ID!) {
    deleteOffering(id: $id) {
      success
      errors
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class OfferingsService {
  constructor(private apollo: Apollo) {}

  getMyOfferings(): Observable<Offering[]> {
    return this.apollo.watchQuery<any>({
      query: GET_MY_OFFERINGS,
      fetchPolicy: 'network-only'
    }).valueChanges.pipe(
      map(result => result.data?.myOfferings || [])
    );
  }

  getAllOfferings(): Observable<Offering[]> {
    return this.apollo.watchQuery<any>({
      query: GET_ALL_OFFERINGS,
      fetchPolicy: 'network-only'
    }).valueChanges.pipe(
      map(result => result.data?.allOfferings || [])
    );
  }

  getOfferingById(id: string): Observable<Offering | null> {
    return this.apollo.watchQuery<any>({
      query: GET_OFFERING,
      variables: { id },
      fetchPolicy: 'network-only'
    }).valueChanges.pipe(
      map(result => result.data?.offering || null)
    );
  }

  createOffering(offeringData: CreateOfferingData): Observable<any> {
    return this.apollo.mutate<any>({
      mutation: CREATE_OFFERING,
      variables: offeringData,
      refetchQueries: [{ query: GET_MY_OFFERINGS }]
    });
  }

  deleteOffering(id: string): Observable<any> {
    return this.apollo.mutate<any>({
      mutation: DELETE_OFFERING,
      variables: { id },
      refetchQueries: [{ query: GET_MY_OFFERINGS }]
    });
  }
} 