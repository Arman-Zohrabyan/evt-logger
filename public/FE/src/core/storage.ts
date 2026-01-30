const STORAGE_KEY = 'tracker_pending_events';
const SESSION_KEY = 'tracker_session_id';
const MAX_STORAGE_BYTES = 4 * 1024 * 1024;

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

  static getSessionId(): string | null {
    try {
      return sessionStorage.getItem(SESSION_KEY);
    } catch (e) {
      return null;
    }
  }

  static setSessionId(id: string): void {
    try {
      sessionStorage.setItem(SESSION_KEY, id);
    } catch (e) {}
  }
}
