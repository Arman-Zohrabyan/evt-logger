export interface VisibilityEvent {
  type: 'visibility' | 'focus' | 'blur';
  state?: string;
  timestamp: number;
}

export class VisibilityCollector {
  private callback: (event: VisibilityEvent) => void;

  constructor(callback: (event: VisibilityEvent) => void) {
    this.callback = callback;
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
  }

  private handleVisibilityChange = (): void => {
    this.callback({
      type: 'visibility',
      state: document.visibilityState,
      timestamp: Date.now()
    });
  };

  private handleFocus = (): void => {
    this.callback({
      type: 'focus',
      timestamp: Date.now()
    });
  };

  private handleBlur = (): void => {
    this.callback({
      type: 'blur',
      timestamp: Date.now()
    });
  };
}
