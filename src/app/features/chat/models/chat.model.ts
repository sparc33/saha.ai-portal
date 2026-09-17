export type ChatRole = 'user' | 'assistant' | 'system-notice';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: number;
}

/**
 * Optional returning-patient context. Only honored by the backend when it is
 * sent alongside session creation (i.e. the first `/api/chat/message` call for
 * a conversation, or an explicit `/api/chat/session` call) — once a session
 * exists it is cached server-side and later submissions are ignored.
 */
export interface PatientHistory {
  allergies?: string[];
  chronicConditions?: string[];
  medications?: string[];
  notes?: string;
}

export interface CreateSessionRequest {
  patientHistory?: PatientHistory;
}

export interface CreateSessionResponse {
  sessionId: string;
}

export interface SendMessageRequest {
  sessionId?: string;
  message: string;
  patientHistory?: PatientHistory;
}

export interface SendMessageResponse {
  sessionId: string;
  reply: string;
}
