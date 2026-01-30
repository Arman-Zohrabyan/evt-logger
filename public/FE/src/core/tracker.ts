import { TrackerConfig, TrackerEvent } from '../types';
import { EventQueue } from './queue';
import { Storage } from './storage';
import { generateId } from '../utils/helpers';
import { DeviceCollector } from '../collectors/device';
import { ConnectionCollector } from '../collectors/connection';
import { LocationCollector } from '../collectors/location';
import { PerformanceCollector } from '../collectors/performance';
import { VisibilityCollector } from '../collectors/visibility';
import { BatteryCollector } from '../collectors/battery';
import { OrientationCollector } from '../collectors/orientation';
import { MotionCollector } from '../collectors/motion';
import { TimeOnPageCollector } from '../collectors/timeOnPage';
import { PermissionsCollector } from '../collectors/permissions';
import { SessionReplayCollector } from '../collectors/sessionReplay';

export class Tracker {
  private config: Required<TrackerConfig>;
  private queue: EventQueue;
  private sessionId: string;
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  private deviceCollector: DeviceCollector;
  private connectionCollector: ConnectionCollector;
  private locationCollector: LocationCollector;
  private performanceCollector: PerformanceCollector;
  private visibilityCollector?: VisibilityCollector;
  private batteryCollector?: BatteryCollector;
  private orientationCollector?: OrientationCollector;
  private motionCollector?: MotionCollector;
  private timeOnPageCollector?: TimeOnPageCollector;
  private permissionsCollector: PermissionsCollector;
  private sessionReplayCollector?: SessionReplayCollector;

  constructor(config: TrackerConfig) {
    this.config = {
      endpoint: '/events',
      flushInterval: 3000,
      maxQueueSize: 1000,
      trackSessionReplay: true,
      trackDevice: true,
      trackLocation: false,
      trackPerformance: true,
      trackBattery: true,
      trackOrientation: true,
      trackMotion: false,
      trackTimeOnPage: true,
      trackPermissions: false,
      debug: false,
      ...config
    };

    this.sessionId = generateId();
    Storage.setSessionId(this.sessionId);

    this.queue = new EventQueue(this.sessionId, this.config.maxQueueSize);

    this.deviceCollector = new DeviceCollector();
    this.connectionCollector = new ConnectionCollector();
    this.locationCollector = new LocationCollector();
    this.performanceCollector = new PerformanceCollector();
    this.permissionsCollector = new PermissionsCollector();

    this.init();
  }

  private init(): void {
    this.recoverEvents();
    this.collectInitialData();
    this.startCollectors();
    this.flushInterval = setInterval(() => this.flush(), this.config.flushInterval);
    this.setupUnloadHandlers();

    this.log('Tracker initialized', this.config);
  }

  private recoverEvents(): void {
    const pendingEvents = Storage.getEvents();
    if (pendingEvents.length > 0) {
      this.log(`Recovering ${pendingEvents.length} events from storage`);
      this.queue.addRaw(pendingEvents);
      Storage.clearEvents();
    }
  }

  private collectInitialData(): void {
    if (this.config.trackDevice) {
      const deviceInfo = this.deviceCollector.collect();
      this.queue.add('device', deviceInfo);
    }

    const connectionInfo = this.connectionCollector.collect();
    if (connectionInfo) {
      this.queue.add('connection', connectionInfo);
    }

    this.queue.add('pageview', {
      url: window.location.href,
      referrer: document.referrer,
      title: document.title
    });

    if (this.config.trackPerformance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = this.performanceCollector.collect();
          if (perfData) {
            this.queue.add('performance', perfData);
          }
        }, 0);
      });
    }

    if (this.config.trackLocation) {
      this.collectLocation();
    }

    if (this.config.trackBattery) {
      this.collectBattery();
    }

    if (this.config.trackPermissions) {
      this.collectPermissions();
    }
  }

  private async collectLocation(): Promise<void> {
    const gpsLocation = await this.locationCollector.getGPSLocation();
    if (gpsLocation) {
      this.queue.add('location', gpsLocation);
      return;
    }

    const ipLocation = await this.locationCollector.getIPLocation();
    if (ipLocation) {
      this.queue.add('location', ipLocation);
    }
  }

  private async collectBattery(): Promise<void> {
    this.batteryCollector = new BatteryCollector((event) => {
      this.queue.add('battery', event);
    });
    const batteryData = await this.batteryCollector.collect();
    if (batteryData) {
      this.queue.add('battery', batteryData);
      this.batteryCollector.start();
    }
  }

  private async collectPermissions(): Promise<void> {
    const permData = await this.permissionsCollector.collect();
    if (permData) {
      this.queue.add('permissions', permData);
    }
  }

  private startCollectors(): void {
    if (this.config.trackSessionReplay) {
      this.sessionReplayCollector = new SessionReplayCollector(
        (event, isCheckout) => {
          const eventType = isCheckout ? 'rrweb_checkout' : 'rrweb';
          this.queue.add(eventType, event);
        },
        {
          checkoutEveryNth: 200,
          maskAllInputs: true
        }
      );
      this.sessionReplayCollector.start();
    }

    this.visibilityCollector = new VisibilityCollector((event) => {
      this.queue.add('visibility', event);
    });
    this.visibilityCollector.start();

    if (this.config.trackOrientation) {
      this.orientationCollector = new OrientationCollector((event) => {
        this.queue.add('orientation', event);
      });
      this.orientationCollector.start();
    }

    if (this.config.trackMotion) {
      this.motionCollector = new MotionCollector((event) => {
        this.queue.add('motion', event);
      });
      this.motionCollector.start();
    }

    if (this.config.trackTimeOnPage) {
      this.timeOnPageCollector = new TimeOnPageCollector((event) => {
        this.queue.add('time_on_page', event);
      });
      this.timeOnPageCollector.start();
    }
  }

  private setupUnloadHandlers(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.captureTimeOnPage();
        this.persist();
        this.flush(true);
      }
    });

    window.addEventListener('beforeunload', () => {
      this.captureTimeOnPage();
      this.persist();
      this.flush(true);
    });

    window.addEventListener('pagehide', () => {
      this.captureTimeOnPage();
      this.persist();
      this.flush(true);
    });
  }

  private captureTimeOnPage(): void {
    if (this.timeOnPageCollector) {
      this.queue.add('time_on_page', this.timeOnPageCollector.collect());
    }
  }

  private persist(): void {
    if (!this.queue.isEmpty()) {
      Storage.saveEvents(this.queue.getAll());
    }
  }

  private flush(isUnload = false): void {
    if (this.queue.isEmpty()) return;

    const events = this.queue.flush();
    this.send(events, isUnload);
  }

  private send(events: TrackerEvent[], isUnload = false): void {
    const payload = {
      apiKey: this.config.apiKey,
      sessionId: this.sessionId,
      events
    };

    this.log(`Flushing ${events.length} events`, payload);

    const body = JSON.stringify(payload);

    if (isUnload && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(this.config.endpoint, new Blob([body], { type: 'application/json' }));
      Storage.clearEvents();
      return;
    }

    fetch(this.config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    })
      .then((res) => {
        if (!res.ok) {
          this.log(`Failed to send events: ${res.status}`);
          Storage.saveEvents(events);
          return;
        }
        Storage.clearEvents();
        this.log(`Successfully sent ${events.length} events`);
      })
      .catch((err) => {
        this.log('Network error, persisting events for retry', err);
        Storage.saveEvents(events);
      });
  }

  track(eventName: string, data?: any): void {
    this.queue.add(eventName, data);
  }

  identify(userId: string, traits?: Record<string, any>): void {
    this.queue.add('identify', { userId, traits });
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.sessionReplayCollector?.stop();
    this.visibilityCollector?.stop();
    this.batteryCollector?.stop();
    this.orientationCollector?.stop();
    this.motionCollector?.stop();

    if (this.timeOnPageCollector) {
      this.queue.add('time_on_page', this.timeOnPageCollector.collect());
      this.timeOnPageCollector.stop();
    }

    this.flush();
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[Tracker]', ...args);
    }
  }
}
