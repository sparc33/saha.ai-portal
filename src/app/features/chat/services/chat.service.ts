import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateSessionRequest,
  CreateSessionResponse,
  PatientHistory,
  SendMessageRequest,
  SendMessageResponse
} from '../models/chat.model';

const SESSION_STORAGE_KEY = 'chatbot.sessionId';

/**
 * Dedicated data-access service for the chat feature.
 * All HTTP calls to the chatbot-BE API go through here — never call HttpClient
 * directly from a component.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  createSession(patientHistory?: PatientHistory): Observable<CreateSessionResponse> {
    const body: CreateSessionRequest = {};
    if (patientHistory) {
      body.patientHistory = patientHistory;
    }
    return this.http.post<CreateSessionResponse>(`${this.baseUrl}/api/chat/session`, body);
  }

  sendMessage(
    message: string,
    sessionId: string | null,
    patientHistory?: PatientHistory
  ): Observable<SendMessageResponse> {
    const body: SendMessageRequest = { message };
    if (sessionId) {
      body.sessionId = sessionId;
    }
    if (patientHistory) {
      body.patientHistory = patientHistory;
    }
    return this.http.post<SendMessageResponse>(`${this.baseUrl}/api/chat/message`, body);
  }

  getStoredSessionId(): string | null {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  }

  setStoredSessionId(sessionId: string): void {
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }

  clearStoredSessionId(): void {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}
