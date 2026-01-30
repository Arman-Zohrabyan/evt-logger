import { TrackerEvent } from '../types';
import { getTimestamp, generateId } from '../utils/helpers';

export class EventQueue {
  private queue: TrackerEvent[] = [];
  private sessionId: string;
  private maxSize: number;

  constructor(sessionId: string, maxSize: number = 1000) {
    this.sessionId = sessionId;
    this.maxSize = maxSize;
  }

  add(type: string, data: any): void {
    const event: TrackerEvent = {
      id: generateId(),
      type,
      timestamp: getTimestamp(),
      sessionId: this.sessionId,
      data
    };

    this.queue.push(event);

    if (this.queue.length > this.maxSize) {
      const dropIdx = this.queue.findIndex(e => e.type !== 'rrweb_checkout');
      if (dropIdx !== -1) {
        this.queue.splice(dropIdx, 1);
      } else {
        this.queue.shift();
      }
    }
  }

  addRaw(events: TrackerEvent[]): void {
    this.queue.unshift(...events);
  }

  flush(): TrackerEvent[] {
    const events = [...this.queue];
    this.queue = [];
    return events;
  }

  getAll(): TrackerEvent[] {
    return [...this.queue];
  }

  get length(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
