export interface TimeOnPageEvent {
  type: 'time_on_page';
  totalTime: number;
  activeTime: number;
  idleTime: number;
  timestamp: number;
}

export class TimeOnPageCollector {
  private callback: (event: TimeOnPageEvent) => void;
  private pageLoadTime: number;
  private activeTime: number = 0;
  private lastActiveStart: number;
  private isActive: boolean = true;
  private reportInterval: ReturnType<typeof setInterval> | null = null;

  constructor(callback: (event: TimeOnPageEvent) => void, reportIntervalMs: number = 30000) {
    this.callback = callback;
    this.pageLoadTime = Date.now();
    this.lastActiveStart = Date.now();

    if (reportIntervalMs > 0) {
      this.reportInterval = setInterval(() => {
        this.callback(this.collect());
      }, reportIntervalMs);
    }
  }

  start(): void {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);
  }

  stop(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
  }

  collect(): TimeOnPageEvent {
    const now = Date.now();
    const currentActiveTime = this.isActive
      ? this.activeTime + (now - this.lastActiveStart)
      : this.activeTime;
    const totalTime = now - this.pageLoadTime;

    return {
      type: 'time_on_page',
      totalTime,
      activeTime: currentActiveTime,
      idleTime: totalTime - currentActiveTime,
      timestamp: now
    };
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.markIdle();
    } else {
      this.markActive();
    }
  };

  private handleFocus = (): void => {
    this.markActive();
  };

  private handleBlur = (): void => {
    this.markIdle();
  };

  private markActive(): void {
    if (!this.isActive) {
      this.isActive = true;
      this.lastActiveStart = Date.now();
    }
  }

  private markIdle(): void {
    if (this.isActive) {
      this.isActive = false;
      this.activeTime += Date.now() - this.lastActiveStart;
    }
  }
}
