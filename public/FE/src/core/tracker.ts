import { TrackerConfig, TrackerEvent, UserIdentity, SessionData } from '../types';
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
import { ClickCollector } from '../collectors/click';

export class Tracker {
  private config: Required<TrackerConfig>;
  private queue: EventQueue;
  private sessionId: string;
  private userId: string;
  private isNewSession: boolean;
  private isNewUser: boolean;
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
  private clickCollector?: ClickCollector;

  constructor(config: TrackerConfig) {
    this.config = {
      endpoint: '/events',
      flushInterval: 3000,
      maxQueueSize: 1000,
      sessionTimeoutMinutes: 30,
      trackSessionReplay: true,
      trackDevice: true,
      trackLocation: false,
      trackPerformance: true,
      trackBattery: true,
      trackOrientation: true,
      trackMotion: false,
      trackTimeOnPage: true,
      trackPermissions: false,
      trackClicks: true,
      debug: false,
      ...config
    };

    // Initialize user identity (persistent across visits)
    const userInit = this.initializeUser();
    this.userId = userInit.userId;
    this.isNewUser = userInit.isNewUser;

    // Initialize session (with expiry check for cross-page tracking)
    const sessionInit = this.initializeSession();
    this.sessionId = sessionInit.sessionId;
    this.isNewSession = sessionInit.isNewSession;

    this.queue = new EventQueue(this.sessionId, this.userId, this.config.maxQueueSize);

    this.deviceCollector = new DeviceCollector();
    this.connectionCollector = new ConnectionCollector();
    this.locationCollector = new LocationCollector();
    this.performanceCollector = new PerformanceCollector();
    this.permissionsCollector = new PermissionsCollector();

    this.init();
  }

  private initializeUser(): { userId: string; isNewUser: boolean } {
    let identity = Storage.getUserIdentity();

    if (identity) {
      // Returning user - update last seen
      identity.lastSeenAt = Date.now();
      Storage.setUserIdentity(identity);
      this.log('Returning user detected', identity);
      return { userId: identity.userId, isNewUser: false };
    }

    // New user - create identity
    identity = {
      userId: generateId(),
      createdAt: Date.now(),
      visitCount: 1,
      lastSeenAt: Date.now()
    };
    Storage.setUserIdentity(identity);
    this.log('New user created', identity);
    return { userId: identity.userId, isNewUser: true };
  }

  private initializeSession(): { sessionId: string; isNewSession: boolean } {
    const timeoutMs = this.config.sessionTimeoutMinutes * 60 * 1000;

    // Check for existing valid session
    if (!Storage.isSessionExpired(timeoutMs)) {
      const existingSession = Storage.getSessionData()!;
      Storage.incrementPageViews();
      this.log('Continuing existing session', existingSession);
      return { sessionId: existingSession.sessionId, isNewSession: false };
    }

    // Create new session
    const sessionData: SessionData = {
      sessionId: generateId(),
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      pageViews: 1
    };
    Storage.setSessionData(sessionData);

    // Increment user's visit count for new session (only if not first visit)
    if (!this.isNewUser) {
      Storage.incrementVisitCount();
    }

    this.log('New session created', sessionData);
    return { sessionId: sessionData.sessionId, isNewSession: true };
  }

  private init(): void {
    this.recoverEvents();
    this.collectInitialData();
    this.startCollectors();
    this.setupActivityTracking();
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
      cameFrom: document.referrer,
      title: document.title,
      isNewSession: this.isNewSession,
      isNewUser: this.isNewUser,
      pageViewNumber: Storage.getSessionData()?.pageViews || 1
    });

    // Emit user_identified event for new users
    if (this.isNewUser) {
      this.queue.add('user_identified', {
        userId: this.userId,
        isFirstVisit: true,
        identifiedAt: Date.now()
      });
    }

    // Emit session_started event for new sessions
    if (this.isNewSession) {
      const identity = Storage.getUserIdentity();
      this.queue.add('session_started', {
        sessionId: this.sessionId,
        userId: this.userId,
        visitNumber: identity?.visitCount || 1,
        startedAt: Date.now()
      });
    }

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

    if (this.config.trackClicks) {
      this.clickCollector = new ClickCollector((event) => {
        this.queue.add('click', event);
      });
      this.clickCollector.start();
    }
  }

  private setupActivityTracking(): void {
    // Update session activity on user interactions to extend session timeout
    ['click', 'keydown', 'scroll', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        Storage.updateSessionActivity();
      }, { passive: true, capture: true });
    });
  }

  private setupUnloadHandlers(): void {
    const handleUnload = () => {
      this.captureTimeOnPage();
      // Send all queued events via beacon (works during page unload)
      this.flushWithBeacon();
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleUnload();
      }
    });

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
  }

  private flushWithBeacon(): void {
    if (this.queue.isEmpty()) return;

    const events = this.queue.getAll();
    const payload = {
      apiKey: this.config.apiKey,
      sessionId: this.sessionId,
      userId: this.userId,
      events
    };

    const body = JSON.stringify(payload);

    // Use sendBeacon - it's designed to work during page unload
    if (typeof navigator.sendBeacon === 'function') {
      const success = navigator.sendBeacon(
        this.config.endpoint,
        new Blob([body], { type: 'application/json' })
      );
      if (success) {
        this.queue.flush(); // Clear queue only if beacon succeeded
        Storage.clearEvents();
        this.log(`Beacon sent ${events.length} events`);
        return;
      }
    }

    // Fallback: persist to localStorage for recovery on next page
    Storage.saveEvents(events);
    this.log('Beacon failed, persisted events for recovery');
  }

  private captureTimeOnPage(): void {
    if (this.timeOnPageCollector) {
      this.queue.add('time_on_page', this.timeOnPageCollector.collect());
    }
  }

  private flush(): void {
    if (this.queue.isEmpty()) return;

    const events = this.queue.flush();
    this.send(events);
  }

  private send(events: TrackerEvent[]): void {
    const payload = {
      apiKey: this.config.apiKey,
      sessionId: this.sessionId,
      userId: this.userId,
      events
    };

    this.log(`Flushing ${events.length} events`, payload);

    const body = JSON.stringify(payload);

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
    this.clickCollector?.stop();

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
