import { throttle } from '../utils/helpers';

export interface OrientationEvent {
  type: 'orientation';
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute: boolean;
  timestamp: number;
}

export class OrientationCollector {
  private callback: (event: OrientationEvent) => void;
  private throttledHandler: (e: DeviceOrientationEvent) => void;

  constructor(callback: (event: OrientationEvent) => void) {
    this.callback = callback;
    this.throttledHandler = throttle(this.handleOrientation.bind(this), 200);
  }

  start(): void {
    window.addEventListener('deviceorientation', this.throttledHandler);
  }

  stop(): void {
    window.removeEventListener('deviceorientation', this.throttledHandler);
  }

  private handleOrientation = (e: DeviceOrientationEvent): void => {
    this.callback({
      type: 'orientation',
      alpha: e.alpha,
      beta: e.beta,
      gamma: e.gamma,
      absolute: e.absolute,
      timestamp: Date.now()
    });
  };
}
