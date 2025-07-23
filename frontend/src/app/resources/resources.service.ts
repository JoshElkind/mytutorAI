import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, map } from 'rxjs';
import { gql } from 'apollo-angular';
import { Resource, Material } from './resource.interface';
import { HttpClient } from '@angular/common/http';

const GET_MY_RESOURCES = gql`
  query GetMyResources {
    myResources {
      id
      name
      resourceType
      fileUrl
      fileName
      contentType
      fileSize
      createdAt
      pdfPreviewUrl
    }
  }
`;

const GET_MY_MATERIALS = gql`
  query GetMyMaterials {
    myMaterials {
      id
      name
      description
      resourceIds
      resources {
        id
        name
        resourceType
        fileUrl
        fileName
        contentType
        fileSize
        createdAt
      }
      createdAt
    }
  }
`;

const UPLOAD_RESOURCE = gql`
  mutation UploadResource(
    $name: String!
    $resourceType: String!
    $fileBase64: String!
    $fileName: String!
    $contentType: String!
  ) {
    uploadResource(
      name: $name
      resourceType: $resourceType
      fileBase64: $fileBase64
      fileName: $fileName
      contentType: $contentType
    ) {
      resource {
        id
        name
        resourceType
        fileUrl
        fileName
        contentType
        fileSize
        createdAt
        pdfPreviewUrl
      }
      errors
    }
  }
`;

const DELETE_RESOURCE = gql`
  mutation DeleteResource($id: ID!) {
    deleteResource(id: $id) {
      success
      errors
    }
  }
`;

const CREATE_MATERIAL = gql`
  mutation CreateMaterial($name: String!, $description: String, $resourceIds: [ID!]!) {
    createMaterial(name: $name, description: $description, resourceIds: $resourceIds) {
      material {
        id
        name
        description
        resourceIds
        resources {
          id
          name
          resourceType
          fileUrl
          fileName
          contentType
          fileSize
          createdAt
          pdfPreviewUrl
        }
        createdAt
      }
      errors
    }
  }
`;

const UPDATE_MATERIAL = gql`
  mutation UpdateMaterial($id: ID!, $name: String!, $description: String, $resourceIds: [ID!]!) {
    updateMaterial(id: $id, name: $name, description: $description, resourceIds: $resourceIds) {
      material {
        id
        name
        description
        resourceIds
        resources {
          id
          name
          resourceType
          fileUrl
          fileName
          contentType
          fileSize
          createdAt
          pdfPreviewUrl
        }
        createdAt
      }
      errors
    }
  }
`;

const DELETE_MATERIAL = gql`
  mutation DeleteMaterial($id: ID!) {
    deleteMaterial(id: $id) {
      success
      errors
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class ResourcesService {
  constructor(private apollo: Apollo, private http: HttpClient) {}

  /**
   * Returns an observable of Resource[] for the current user.
   * The observable emits an array directly, but the raw Apollo response can be handled by the consumer if needed.
   */
  getMyResources(): Observable<Resource[]> {
    console.log('[SERVICE] Fetching resources from GraphQL...');
    return this.apollo.watchQuery<any>({
      query: GET_MY_RESOURCES,
      fetchPolicy: 'network-only'
    }).valueChanges.pipe(
      map(result => {
        console.log('[SERVICE] Resources query result:', result);
        return result?.data?.myResources || [];
      })
    );
  }

  /**
   * Returns an observable of Material[] for the current user.
   * The observable emits an array directly, but the raw Apollo response can be handled by the consumer if needed.
   */
  getMyMaterials(): Observable<Material[]> {
    return this.apollo.watchQuery<any>({
      query: GET_MY_MATERIALS,
      fetchPolicy: 'network-only'
    }).valueChanges.pipe(
      map(result => result?.data?.myMaterials || [])
    );
  }

  uploadResource(
    name: string,
    resourceType: string,
    fileBase64: string,
    fileName: string,
    contentType: string
  ): Observable<any> {
    console.log('[SERVICE] Uploading resource via GraphQL...');
    console.log('[SERVICE] Resource details:', { name, resourceType, fileName, contentType });
    console.log('[SERVICE] Base64 data length:', fileBase64.length);
    
    return this.apollo.mutate<any>({
      mutation: UPLOAD_RESOURCE,
      variables: {
        name,
        resourceType,
        fileBase64,
        fileName,
        contentType
      },
      refetchQueries: [
        { query: GET_MY_RESOURCES },
        { query: GET_MY_MATERIALS }
      ]
    });
  }

  deleteResource(id: string): Observable<any> {
    return this.apollo.mutate<any>({
      mutation: DELETE_RESOURCE,
      variables: { id },
      refetchQueries: [
        { query: GET_MY_RESOURCES },
        { query: GET_MY_MATERIALS }
      ]
    });
  }

  createMaterial(name: string, description: string, resourceIds: string[]): Observable<any> {
    return this.apollo.mutate<any>({
      mutation: CREATE_MATERIAL,
      variables: {
        name,
        description,
        resourceIds
      },
      refetchQueries: [
        { query: GET_MY_MATERIALS }
      ]
    });
  }

  updateMaterial(id: string, name: string, description: string, resourceIds: string[]): Observable<any> {
    return this.apollo.mutate<any>({
      mutation: UPDATE_MATERIAL,
      variables: {
        id,
        name,
        description,
        resourceIds
      },
      refetchQueries: [
        { query: GET_MY_MATERIALS }
      ]
    });
  }

  deleteMaterial(id: string): Observable<any> {
    return this.apollo.mutate<any>({
      mutation: DELETE_MATERIAL,
      variables: { id },
      refetchQueries: [
        { query: GET_MY_MATERIALS }
      ]
    });
  }

  generateQuizFromResource(fileUrl: string, qtype: string, n: number) {
    console.log('[SERVICE] Generating quiz from resource...');
    console.log('[SERVICE] File URL:', fileUrl);
    console.log('[SERVICE] Question type:', qtype);
    console.log('[SERVICE] Number of questions:', n);
    
    // Call the Python API to generate questions from the resource file URL
    return this.http.post<any>('http://127.0.0.1:8000/generate_from_url', {
      file_url: fileUrl,
      qtype,
      n
    });
  }
} 