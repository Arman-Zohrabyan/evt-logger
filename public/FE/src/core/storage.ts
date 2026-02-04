import { UserIdentity, SessionData } from '../types';

const STORAGE_KEY = 'tracker_pending_events';
const USER_KEY = 'tracker_user_identity';
const SESSION_KEY = 'tracker_session_data';
const MAX_STORAGE_BYTES = 4 * 1024 * 1024;
const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export class Storage {
  static saveEvents(events: any[]): void {
    try {
      const serialized = JSON.stringify({
        events,
        timestamp: Date.now()
      });

      if (serialized.length > MAX_STORAGE_BYTES) {
        let trimmed = [...events];
        let payload = serialized;
        while (payload.length > MAX_STORAGE_BYTES && trimmed.length > 1) {
          trimmed.shift();
          payload = JSON.stringify({ events: trimmed, timestamp: Date.now() });
        }
        localStorage.setItem(STORAGE_KEY, payload);
        return;
      }

      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {}
  }

  static getEvents(): any[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const { events, timestamp } = JSON.parse(stored);

      if (Date.now() - timestamp > 86400000) {
        localStorage.removeItem(STORAGE_KEY);
        return [];
      }

      return events;
    } catch (e) {
      return [];
    }
  }

  static clearEvents(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  // ========== USER IDENTITY METHODS ==========

  static getUserIdentity(): UserIdentity | null {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }

  static setUserIdentity(identity: UserIdentity): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(identity));
    } catch (e) {}
  }

  static incrementVisitCount(): void {
    const identity = this.getUserIdentity();
    if (identity) {
      identity.visitCount++;
      identity.lastSeenAt = Date.now();
      this.setUserIdentity(identity);
    }
  }

  // ========== SESSION METHODS ==========

  static getSessionData(): SessionData | null {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }

  static setSessionData(session: SessionData): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {}
  }

  static updateSessionActivity(): void {
    const session = this.getSessionData();
    if (session) {
      session.lastActivityAt = Date.now();
      this.setSessionData(session);
    }
  }

  static incrementPageViews(): void {
    const session = this.getSessionData();
    if (session) {
      session.pageViews++;
      session.lastActivityAt = Date.now();
      this.setSessionData(session);
    }
  }

  static isSessionExpired(timeoutMs: number = DEFAULT_SESSION_TIMEOUT_MS): boolean {
    const session = this.getSessionData();
    if (!session) return true;

    const elapsed = Date.now() - session.lastActivityAt;
    return elapsed > timeoutMs;
  }

  static clearSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }
}
