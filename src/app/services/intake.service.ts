import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Standard JSON envelope per PROJECT_CONFIG.md response conventions.
 * All backend responses use: { success, data, message, errors }
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  errors: unknown[];
}

/** POST /intake/sessions */
export interface CreateSessionData {
  sessionId: string;
  welcomeData: { clinicName: string };
}

/** POST /intake/sessions/:id/identify */
export interface IdentifyPatientData {
  result: 'recognised' | 'unrecognised' | 'ambiguous';
  patientType: 'new' | 'returning';
}

/** GET /intake/sessions/:id/history */
export interface PatientHistoryData {
  allergies: string[];
  conditions: string[];
  medications: string[];
  hasHistory: boolean;
}

/** POST /intake/sessions/:id/message */
export interface SendMessageData {
  aiResponse: string;
  isComplete: boolean;
  isEmergency: boolean;
}

/** GET /clinician/queue */
export interface QueueItem {
  sessionId: string;
  patientType: 'new' | 'returning';
  urgencyLevel: 'emergency' | 'urgent' | 'routine' | null;
  queueStatus: string;
  chiefComplaint: string;
  createdAt: string;
  patientName?: string;
}

/** GET /clinician/sessions/:id/note */
export interface PatientNoteData {
  structuredNote: {
    chiefComplaint: string;
    historyOfPresentIllness: string;
    relevantHistory: string;
    redFlagsFound: string;
    urgencyRationale: string;
  };
  urgencyLevel: 'emergency' | 'urgent' | 'routine' | null;
  transcripts: unknown[];
  redFlagDetected: boolean;
}

/**
 * IntakeService — handles ALL intake and clinician API calls.
 *
 * Follows the same pattern as AuthService:
 * - Inject HttpClient; all calls use environment.apiUrl
 * - PHI hard stop: Never log identity values, symptom content, or history values.
 *   Log only session IDs and event types.
 * - All callers receive the raw Observable<ApiResponse<T>>; error handling
 *   is the caller's responsibility.
 */
@Injectable({ providedIn: 'root' })
export class IntakeService {
  constructor(private http: HttpClient) {}

  /**
   * Create a new intake session.
   * POST /intake/sessions
   * PHI: entryMode is not patient data; safe to include.
   */
  createSession(entryMode: string): Observable<ApiResponse<CreateSessionData>> {
    return this.http.post<ApiResponse<CreateSessionData>>(
      `${environment.apiUrl}/intake/sessions`,
      { entryMode }
    );
  }

  /**
   * Identify/verify patient identity.
   * POST /intake/sessions/:id/identify
   * PHI hard stop: inputs (dateOfBirth, identifier) are NEVER logged.
   */
  identifyPatient(
    sessionId: string,
    inputs: { dateOfBirth: string; identifierType: string; identifier: string }
  ): Observable<ApiResponse<IdentifyPatientData>> {
    return this.http.post<ApiResponse<IdentifyPatientData>>(
      `${environment.apiUrl}/intake/sessions/${sessionId}/identify`,
      inputs
    );
  }

  /**
   * Get patient history on file.
   * GET /intake/sessions/:id/history
   */
  getHistory(sessionId: string): Observable<ApiResponse<PatientHistoryData>> {
    return this.http.get<ApiResponse<PatientHistoryData>>(
      `${environment.apiUrl}/intake/sessions/${sessionId}/history`
    );
  }

  /**
   * Update patient history (confirmed or edited).
   * PATCH /intake/sessions/:id/history
   * PHI hard stop: updates content is patient data — not logged.
   */
  updateHistory(
    sessionId: string,
    updates: Partial<{ allergies: string[]; conditions: string[]; medications: string[] }>
  ): Observable<ApiResponse<Record<string, never>>> {
    return this.http.patch<ApiResponse<Record<string, never>>>(
      `${environment.apiUrl}/intake/sessions/${sessionId}/history`,
      updates
    );
  }

  /**
   * Send a patient chat message to the AI.
   * POST /intake/sessions/:id/message
   * PHI hard stop: symptom text is patient data — not logged.
   */
  sendMessage(sessionId: string, text: string): Observable<ApiResponse<SendMessageData>> {
    return this.http.post<ApiResponse<SendMessageData>>(
      `${environment.apiUrl}/intake/sessions/${sessionId}/message`,
      { text }
    );
  }

  /**
   * Mark session as complete.
   * POST /intake/sessions/:id/complete
   */
  completeSession(sessionId: string): Observable<ApiResponse<Record<string, never>>> {
    return this.http.post<ApiResponse<Record<string, never>>>(
      `${environment.apiUrl}/intake/sessions/${sessionId}/complete`,
      {}
    );
  }

  /**
   * Get the clinician queue.
   * GET /clinician/queue
   */
  getClinicianQueue(): Observable<ApiResponse<QueueItem[]>> {
    return this.http.get<ApiResponse<QueueItem[]>>(
      `${environment.apiUrl}/clinician/queue`
    );
  }

  /**
   * Get the structured patient note for a session.
   * GET /clinician/sessions/:id/note
   */
  getPatientNote(sessionId: string): Observable<ApiResponse<PatientNoteData>> {
    return this.http.get<ApiResponse<PatientNoteData>>(
      `${environment.apiUrl}/clinician/sessions/${sessionId}/note`
    );
  }
}
