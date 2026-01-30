import { throttle } from '../utils/helpers';

export interface MotionEvent {
  type: 'motion';
  acceleration: {
    x: number | null;
    y: number | null;
    z: number | null;
  } | null;
  accelerationIncludingGravity: {
    x: number | null;
    y: number | null;
    z: number | null;
  } | null;
  rotationRate: {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
  } | null;
  interval: number;
  timestamp: number;
}

export class MotionCollector {
  private callback: (event: MotionEvent) => void;
  private throttledHandler: (e: DeviceMotionEvent) => void;

  constructor(callback: (event: MotionEvent) => void) {
    this.callback = callback;
    this.throttledHandler = throttle(this.handleMotion.bind(this), 200);
  }

  start(): void {
    window.addEventListener('devicemotion', this.throttledHandler);
  }

  stop(): void {
    window.removeEventListener('devicemotion', this.throttledHandler);
  }

  private handleMotion = (e: DeviceMotionEvent): void => {
    this.callback({
      type: 'motion',
      acceleration: e.acceleration ? {
        x: e.acceleration.x,
        y: e.acceleration.y,
        z: e.acceleration.z
      } : null,
      accelerationIncludingGravity: e.accelerationIncludingGravity ? {
        x: e.accelerationIncludingGravity.x,
        y: e.accelerationIncludingGravity.y,
        z: e.accelerationIncludingGravity.z
      } : null,
      rotationRate: e.rotationRate ? {
        alpha: e.rotationRate.alpha,
        beta: e.rotationRate.beta,
        gamma: e.rotationRate.gamma
      } : null,
      interval: e.interval,
      timestamp: Date.now()
    });
  };
}
