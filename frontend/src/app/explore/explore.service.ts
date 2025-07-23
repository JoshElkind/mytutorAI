import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { gql } from 'apollo-angular';
import { Offering } from '../offerings/offering.interface';

const SEARCH_OFFERINGS = gql`
  query SearchOfferings($searchTerm: String, $filters: OfferingFiltersInput) {
    searchOfferings(searchTerm: $searchTerm, filters: $filters) {
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
        grades
        description
      }
      tutor {
        id
        name
        email
        userType
        rating
        totalSessions
        bio
        education
        age
        gender
        timezone
        profileImageUrl
      }
    }
  }
`;

const GET_POPULAR_OFFERINGS = gql`
  query GetPopularOfferings {
    popularOfferings {
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
        grades
        description
      }
      tutor {
        id
        name
        email
        userType
        rating
        totalSessions
        bio
        education
        age
        gender
        timezone
        profileImageUrl
      }
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class ExploreService {
  constructor(private apollo: Apollo) {}

  searchOfferings(searchTerm: string, filters: any): Observable<Offering[]> {
    return this.apollo.watchQuery<any>({
      query: SEARCH_OFFERINGS,
      variables: {
        searchTerm: searchTerm || null,
        filters: filters || null
      },
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true
    }).valueChanges.pipe(
      map(result => {
        const offerings = result.data?.searchOfferings || [];
        return offerings;
      })
    );
  }

  getPopularOfferings(): Observable<Offering[]> {
    return this.apollo.watchQuery<any>({
      query: GET_POPULAR_OFFERINGS,
      fetchPolicy: 'cache-first',
      errorPolicy: 'all'
    }).valueChanges.pipe(
      map(result => result.data?.popularOfferings || [])
    );
  }
} 