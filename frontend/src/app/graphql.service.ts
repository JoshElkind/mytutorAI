import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GraphqlService {

  constructor(private apollo: Apollo) { }

  // Example query - you can modify this based on your needs
  getTestData(): Observable<any> {
    const TEST_QUERY = gql`
      query {
        testField
      }
    `;
    
    return this.apollo.watchQuery({
      query: TEST_QUERY
    }).valueChanges;
  }

  // Example mutation - you can modify this based on your needs
  createTestData(data: any): Observable<any> {
    const CREATE_MUTATION = gql`
      mutation CreateTest($input: CreateTestInput!) {
        createTest(input: $input) {
          id
          name
        }
      }
    `;
    
    return this.apollo.mutate({
      mutation: CREATE_MUTATION,
      variables: {
        input: data
      }
    });
  }
} 