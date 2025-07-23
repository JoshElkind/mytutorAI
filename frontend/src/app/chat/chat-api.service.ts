import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';

export interface Conversation {
  userId: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline: boolean;
}

export interface UserBrief {
  id: string;
  name: string;
  profileImageUrl?: string;
}

export interface Message {
  id: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender: UserBrief;
  receiver: UserBrief;
}

@Injectable({ providedIn: 'root' })
export class ChatApiService {
  constructor(private apollo: Apollo) {}

  /**
   * Fetches all conversations for the current user.
   */
  getConversations(): Observable<Conversation[]> {
    const GET_CONVERSATIONS = gql`
      query GetConversations {
        getConversations {
          userId
          name
          email
          profileImageUrl
          lastMessage
          lastMessageTime
          unreadCount
          isOnline
        }
      }
    `;

    return this.apollo
      .query<{ getConversations: Conversation[] }>({
        query: GET_CONVERSATIONS,
        fetchPolicy: 'network-only'
      })
      .pipe(
        map((result) => {
          if (!result.data?.getConversations) {
            throw new Error('No conversations data received');
          }
          return result.data.getConversations;
        }),
        catchError((error) => {
          console.error('Error fetching conversations:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Returns message history between the current user and `otherUserId`.
   */
  getMessages(otherUserId: string, limit = 50): Observable<Message[]> {
    const GET_MESSAGES = gql`
      query GetMessages($otherUserId: ID!, $limit: Int) {
        getMessages(otherUserId: $otherUserId, limit: $limit) {
          id
          content
          read
          createdAt
          sender {
            id
            name
          }
          receiver {
            id
            name
          }
        }
      }
    `;

    return this.apollo
      .query<{ getMessages: Message[] }>({
        query: GET_MESSAGES,
        variables: { otherUserId, limit },
        fetchPolicy: 'network-only'
      })
      .pipe(
        map((res) => {
          if (!res.data?.getMessages) {
            throw new Error('No messages data received');
          }
          return res.data.getMessages;
        }),
        catchError((error) => {
          console.error('Error fetching messages:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Sends a new message to `receiverId`.
   */
  sendMessage(receiverId: string, content: string): Observable<Message> {
    const SEND_MESSAGE = gql`
      mutation SendMessage($receiverId: ID!, $content: String!) {
        sendMessage(receiverId: $receiverId, content: $content) {
          success
          errors
          message {
            id
            content
            read
            createdAt
            sender {
              id
              name
            }
            receiver {
              id
              name
            }
          }
        }
      }
    `;

    return this.apollo
      .mutate<{ sendMessage: { success: boolean; errors: string[]; message: Message } }>({
        mutation: SEND_MESSAGE,
        variables: { receiverId, content }
      })
      .pipe(
        map((res) => {
          if (!res.data?.sendMessage) {
            throw new Error('No message data received');
          }
          if (!res.data.sendMessage.success) {
            throw new Error(res.data.sendMessage.errors?.join(', ') || 'Failed to send message');
          }
          if (!res.data.sendMessage.message) {
            throw new Error('No message returned from server');
          }
          return res.data.sendMessage.message;
        }),
        catchError((error) => {
          console.error('Error sending message:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Creates a conversation/contact with another user if it doesn't exist.
   */
  createConversation(otherUserId: string): Observable<Conversation> {
    const CREATE_CONVERSATION = gql`
      mutation CreateConversation($otherUserId: ID!) {
        createConversation(otherUserId: $otherUserId) {
          success
          errors
          conversation {
            userId
            name
            email
            profileImageUrl
            lastMessage
            lastMessageTime
            unreadCount
            isOnline
          }
        }
      }
    `;

    return this.apollo
      .mutate<{ createConversation: { success: boolean; errors: string[]; conversation: Conversation } }>({
        mutation: CREATE_CONVERSATION,
        variables: { otherUserId }
      })
      .pipe(
        map((res) => {
          if (!res.data?.createConversation) {
            throw new Error('No conversation data received');
          }
          if (!res.data.createConversation.success) {
            throw new Error(res.data.createConversation.errors?.join(', ') || 'Failed to create conversation');
          }
          if (!res.data.createConversation.conversation) {
            throw new Error('No conversation returned from server');
          }
          return res.data.createConversation.conversation;
        }),
        catchError((error) => {
          console.error('Error creating conversation:', error);
          return throwError(() => error);
        })
      );
  }
} 