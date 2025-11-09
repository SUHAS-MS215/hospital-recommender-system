import { LocationData } from "./location";

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  isStreaming?: boolean;
  advice?: {
    severity: string;
    precautions: string;
    otc_medications: string;
    facilities: Array<{
      name: string;
      address: string;
      rating: number;
      url?: string;
      reviews?: string;
      hours?: string;
    }>;
  };
}

export interface StoredSession {
  sessionId: string;
  messages: Message[];
  locationData: LocationData;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_PREFIX = "medical-chat-";

/**
 * Save a session to localStorage
 */
export function saveSession(
  sessionId: string,
  messages: Message[],
  locationData: LocationData
): void {
  try {
    const session: StoredSession = {
      sessionId,
      messages,
      locationData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Check if session exists and preserve createdAt
    const existing = loadSession(sessionId);
    if (existing) {
      session.createdAt = existing.createdAt;
    }

    localStorage.setItem(
      `${STORAGE_PREFIX}${sessionId}`,
      JSON.stringify(session)
    );
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}

/**
 * Load a session from localStorage
 */
export function loadSession(sessionId: string): StoredSession | null {
  try {
    const data = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
    if (!data) return null;

    return JSON.parse(data) as StoredSession;
  } catch (error) {
    console.error("Failed to load session:", error);
    return null;
  }
}

/**
 * Get all sessions sorted by updated time (most recent first)
 */
export function getAllSessions(): StoredSession[] {
  try {
    const sessions: StoredSession[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            sessions.push(JSON.parse(data) as StoredSession);
          } catch (e) {
            console.error("Failed to parse session:", e);
          }
        }
      }
    }

    // Sort by updatedAt descending
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error("Failed to get all sessions:", error);
    return [];
  }
}

/**
 * Delete a session from localStorage
 */
export function deleteSession(sessionId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
  } catch (error) {
    console.error("Failed to delete session:", error);
  }
}

/**
 * Check if a session exists
 */
export function sessionExists(sessionId: string): boolean {
  return localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`) !== null;
}

