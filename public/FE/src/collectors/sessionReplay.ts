import { record } from 'rrweb';
import type { eventWithTime, listenerHandler, SamplingStrategy } from '@rrweb/types';

export interface SessionReplayConfig {
  checkoutEveryNth?: number;
  checkoutEveryNms?: number;
  maskAllInputs?: boolean;
  blockClass?: string;
  blockSelector?: string;
  maskTextClass?: string;
  recordCanvas?: boolean;
  sampling?: SamplingStrategy;
}

export class SessionReplayCollector {
  private callback: (event: eventWithTime, isCheckout?: boolean) => void;
  private stopFn: listenerHandler | null = null;
  private config: SessionReplayConfig;
  private replayEvents: eventWithTime[] = [];

  constructor(
    callback: (event: eventWithTime, isCheckout?: boolean) => void,
    config: SessionReplayConfig = {}
  ) {
    this.callback = callback;
    this.config = config;
  }

  getReplayEvents(): eventWithTime[] {
    return [...this.replayEvents];
  }

  start(): void {
    this.stopFn = record({
      emit: (event: eventWithTime, isCheckout?: boolean) => {
        if (isCheckout) {
          this.replayEvents = [];
        }
        this.replayEvents.push(event);
        this.callback(event, isCheckout);
      },
      checkoutEveryNth: this.config.checkoutEveryNth ?? 200,
      checkoutEveryNms: this.config.checkoutEveryNms,
      maskAllInputs: this.config.maskAllInputs ?? true,
      blockClass: this.config.blockClass ?? 'rr-block',
      blockSelector: this.config.blockSelector ?? undefined,
      maskTextClass: this.config.maskTextClass ?? 'rr-mask',
      recordCanvas: this.config.recordCanvas ?? false,
      sampling: this.config.sampling,
    }) ?? null;
  }

  stop(): void {
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }
  }
}
