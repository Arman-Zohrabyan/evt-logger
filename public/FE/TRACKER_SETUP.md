# Web Analytics Tracker - Setup Guide

A lightweight, modular tracking script that collects user behavior data from websites.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Configuration Files](#configuration-files)
4. [Source Code](#source-code)
5. [Building](#building)
6. [Usage](#usage)
7. [Features](#features)
8. [Backend Requirements](#backend-requirements)

---

## Quick Start

### 1. Create Project

```bash
# Create and enter project directory
mkdir tracker
cd tracker

# Initialize npm project
npm init -y

# Install dependencies
npm install --save-dev rollup @rollup/plugin-typescript @rollup/plugin-terser typescript tslib

# Create folder structure
mkdir -p src/core src/collectors src/utils dist
```

### 2. Create Configuration Files

Create the following files in your project root:

#### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2018", "DOM"]
  },
  "include": ["src/**/*"]
}
```

#### rollup.config.js

```javascript
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/tracker.min.js',
    format: 'iife',
    name: 'TrackerBundle'
  },
  plugins: [
    typescript(),
    terser()
  ]
};
```

#### package.json (update scripts section)

```json
{
  "name": "tracker",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w"
  },
  "devDependencies": {
    "@rollup/plugin-terser": "^0.4.0",
    "@rollup/plugin-typescript": "^11.1.0",
    "rollup": "^4.0.0",
    "tslib": "^2.6.0",
    "typescript": "^5.0.0"
  }
}
```

---

## Project Structure

```
tracker/
├── src/
│   ├── index.ts                 # Entry point
│   ├── types.ts                 # TypeScript interfaces
│   ├── core/
│   │   ├── tracker.ts           # Main tracker class
│   │   ├── queue.ts             # Event batching
│   │   └── storage.ts           # localStorage/IndexedDB persistence
│   ├── collectors/
│   │   ├── mouse.ts             # Mouse movements & clicks
│   │   ├── scroll.ts            # Scroll behavior
│   │   ├── keyboard.ts          # Keyboard events
│   │   ├── device.ts            # Device & browser info
│   │   ├── location.ts          # GPS & IP location
│   │   ├── performance.ts       # Page load metrics
│   │   ├── visibility.ts        # Page visibility & focus
│   │   └── connection.ts        # Network information
│   └── utils/
│       ├── helpers.ts           # Utility functions
│       └── fingerprint.ts       # Browser fingerprinting
├── dist/
│   └── tracker.min.js           # Bundled output
├── package.json
├── tsconfig.json
└── rollup.config.js
```

---

## Source Code

### src/types.ts

```typescript
export interface TrackerConfig {
  apiKey: string;
  endpoint?: string;
  flushInterval?: number;
  maxQueueSize?: number;
  trackMouse?: boolean;
  trackScroll?: boolean;
  trackKeyboard?: boolean;
  trackDevice?: boolean;
  trackLocation?: boolean;
  trackPerformance?: boolean;
  debug?: boolean;
}

export interface TrackerEvent {
  id: string;
  type: string;
  timestamp: number;
  sessionId: string;
  data: any;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  languages: string[];
  cookieEnabled: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  screenWidth: number;
  screenHeight: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelRatio: number;
  touchSupport: boolean;
  maxTouchPoints: number;
}

export interface ConnectionInfo {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface MouseEvent {
  type: 'mousemove' | 'click' | 'dblclick' | 'contextmenu';
  x: number;
  y: number;
  target?: string;
  targetId?: string;
  targetClass?: string;
  button?: number;
}

export interface ScrollEvent {
  type: 'scroll';
  scrollX: number;
  scrollY: number;
  scrollPercentage: number;
  direction: 'up' | 'down';
}

export interface KeyboardEvent {
  type: 'keydown' | 'keyup';
  key: string;
  code: string;
  targetType?: string;
}
```

### src/utils/helpers.ts

```typescript
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export function getTimestamp(): number {
  return Date.now();
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  } as T;
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  } as T;
}

export function getElementSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  if (el.className) return `${el.tagName.toLowerCase()}.${el.className.split(' ').join('.')}`;
  return el.tagName.toLowerCase();
}
```

### src/core/queue.ts

```typescript
import { TrackerEvent } from '../types';
import { getTimestamp, generateId } from '../utils/helpers';

export class EventQueue {
  private queue: TrackerEvent[] = [];
  private sessionId: string;
  private maxSize: number;

  constructor(sessionId: string, maxSize: number = 100) {
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

    // Prevent memory issues
    if (this.queue.length > this.maxSize) {
      this.queue.shift();
    }
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
```

### src/core/storage.ts

```typescript
const STORAGE_KEY = 'tracker_pending_events';
const SESSION_KEY = 'tracker_session_id';

export class Storage {
  static saveEvents(events: any[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        events,
        timestamp: Date.now()
      }));
    } catch (e) {
      // localStorage might be full or disabled
    }
  }

  static getEvents(): any[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const { events, timestamp } = JSON.parse(stored);
      
      // Only return events less than 24 hours old
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
```

### src/collectors/mouse.ts

```typescript
import { MouseEvent as TrackerMouseEvent } from '../types';
import { throttle, getElementSelector } from '../utils/helpers';

export class MouseCollector {
  private callback: (event: TrackerMouseEvent) => void;
  private throttledMove: (e: MouseEvent) => void;

  constructor(callback: (event: TrackerMouseEvent) => void) {
    this.callback = callback;
    // Throttle mousemove to every 100ms to avoid flooding
    this.throttledMove = throttle(this.handleMove.bind(this), 100);
  }

  start(): void {
    document.addEventListener('mousemove', this.throttledMove);
    document.addEventListener('click', this.handleClick);
    document.addEventListener('dblclick', this.handleDblClick);
    document.addEventListener('contextmenu', this.handleContextMenu);
  }

  stop(): void {
    document.removeEventListener('mousemove', this.throttledMove);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('dblclick', this.handleDblClick);
    document.removeEventListener('contextmenu', this.handleContextMenu);
  }

  private handleMove = (e: MouseEvent): void => {
    this.callback({
      type: 'mousemove',
      x: e.clientX,
      y: e.clientY
    });
  };

  private handleClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    this.callback({
      type: 'click',
      x: e.clientX,
      y: e.clientY,
      target: getElementSelector(target),
      targetId: target.id || undefined,
      targetClass: target.className || undefined,
      button: e.button
    });
  };

  private handleDblClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    this.callback({
      type: 'dblclick',
      x: e.clientX,
      y: e.clientY,
      target: getElementSelector(target)
    });
  };

  private handleContextMenu = (e: MouseEvent): void => {
    this.callback({
      type: 'contextmenu',
      x: e.clientX,
      y: e.clientY
    });
  };
}
```

### src/collectors/scroll.ts

```typescript
import { ScrollEvent } from '../types';
import { throttle } from '../utils/helpers';

export class ScrollCollector {
  private callback: (event: ScrollEvent) => void;
  private lastScrollY: number = 0;
  private throttledScroll: () => void;

  constructor(callback: (event: ScrollEvent) => void) {
    this.callback = callback;
    this.throttledScroll = throttle(this.handleScroll.bind(this), 150);
  }

  start(): void {
    this.lastScrollY = window.scrollY;
    window.addEventListener('scroll', this.throttledScroll);
  }

  stop(): void {
    window.removeEventListener('scroll', this.throttledScroll);
  }

  private handleScroll = (): void => {
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercentage = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
    const direction = scrollY > this.lastScrollY ? 'down' : 'up';

    this.callback({
      type: 'scroll',
      scrollX,
      scrollY,
      scrollPercentage: Math.round(scrollPercentage),
      direction
    });

    this.lastScrollY = scrollY;
  };
}
```

### src/collectors/keyboard.ts

```typescript
import { KeyboardEvent as TrackerKeyboardEvent } from '../types';

export class KeyboardCollector {
  private callback: (event: TrackerKeyboardEvent) => void;
  private sensitiveInputTypes = ['password', 'email', 'tel', 'credit-card'];

  constructor(callback: (event: TrackerKeyboardEvent) => void) {
    this.callback = callback;
  }

  start(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  stop(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  private isSensitiveInput(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLInputElement)) return false;
    return this.sensitiveInputTypes.includes(target.type);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Don't track actual key values in sensitive inputs
    if (this.isSensitiveInput(e.target)) return;

    const target = e.target as HTMLElement;
    this.callback({
      type: 'keydown',
      key: e.key,
      code: e.code,
      targetType: target.tagName.toLowerCase()
    });
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (this.isSensitiveInput(e.target)) return;

    this.callback({
      type: 'keyup',
      key: e.key,
      code: e.code
    });
  };
}
```

### src/collectors/device.ts

```typescript
import { DeviceInfo } from '../types';

export class DeviceCollector {
  collect(): DeviceInfo {
    const nav = navigator as any;

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: Array.from(navigator.languages || []),
      cookieEnabled: navigator.cookieEnabled,
      deviceMemory: nav.deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      screenWidth: screen.width,
      screenHeight: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      touchSupport: 'ontouchstart' in window,
      maxTouchPoints: navigator.maxTouchPoints || 0
    };
  }
}
```

### src/collectors/connection.ts

```typescript
import { ConnectionInfo } from '../types';

export class ConnectionCollector {
  collect(): ConnectionInfo | null {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (!connection) return null;

    return {
      type: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  onChange(callback: (info: ConnectionInfo) => void): void {
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (connection) {
      connection.addEventListener('change', () => {
        const info = this.collect();
        if (info) callback(info);
      });
    }
  }
}
```

### src/collectors/location.ts

```typescript
export interface LocationData {
  type: 'gps' | 'ip';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  country?: string;
  city?: string;
  ip?: string;
}

export class LocationCollector {
  private ipEndpoint: string;

  constructor(ipEndpoint: string = 'https://ipapi.co/json/') {
    this.ipEndpoint = ipEndpoint;
  }

  async getGPSLocation(): Promise<LocationData | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            type: 'gps',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        () => resolve(null),
        { timeout: 10000 }
      );
    });
  }

  async getIPLocation(): Promise<LocationData | null> {
    try {
      const response = await fetch(this.ipEndpoint);
      const data = await response.json();

      return {
        type: 'ip',
        latitude: data.latitude,
        longitude: data.longitude,
        country: data.country_name,
        city: data.city,
        ip: data.ip
      };
    } catch (e) {
      return null;
    }
  }
}
```

### src/collectors/performance.ts

```typescript
export interface PerformanceData {
  loadTime: number;
  domContentLoaded: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
}

export class PerformanceCollector {
  collect(): PerformanceData | null {
    if (!window.performance) return null;

    const timing = performance.timing;
    const data: PerformanceData = {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart
    };

    // Get paint metrics
    const paintEntries = performance.getEntriesByType('paint');
    for (const entry of paintEntries) {
      if (entry.name === 'first-paint') {
        data.firstPaint = entry.startTime;
      }
      if (entry.name === 'first-contentful-paint') {
        data.firstContentfulPaint = entry.startTime;
      }
    }

    return data;
  }

  observeLCP(callback: (lcp: number) => void): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      callback(lastEntry.startTime);
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  }
}
```

### src/collectors/visibility.ts

```typescript
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
```

### src/core/tracker.ts

```typescript
import { TrackerConfig, TrackerEvent } from '../types';
import { EventQueue } from './queue';
import { Storage } from './storage';
import { generateId } from '../utils/helpers';
import { MouseCollector } from '../collectors/mouse';
import { ScrollCollector } from '../collectors/scroll';
import { KeyboardCollector } from '../collectors/keyboard';
import { DeviceCollector } from '../collectors/device';
import { ConnectionCollector } from '../collectors/connection';
import { LocationCollector } from '../collectors/location';
import { PerformanceCollector } from '../collectors/performance';
import { VisibilityCollector } from '../collectors/visibility';

export class Tracker {
  private config: Required<TrackerConfig>;
  private queue: EventQueue;
  private sessionId: string;
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  // Collectors
  private mouseCollector?: MouseCollector;
  private scrollCollector?: ScrollCollector;
  private keyboardCollector?: KeyboardCollector;
  private deviceCollector: DeviceCollector;
  private connectionCollector: ConnectionCollector;
  private locationCollector: LocationCollector;
  private performanceCollector: PerformanceCollector;
  private visibilityCollector?: VisibilityCollector;

  constructor(config: TrackerConfig) {
    this.config = {
      endpoint: 'https://api.yourservice.com/track',
      flushInterval: 3000,
      maxQueueSize: 100,
      trackMouse: true,
      trackScroll: true,
      trackKeyboard: false,
      trackDevice: true,
      trackLocation: false,
      trackPerformance: true,
      debug: false,
      ...config
    };

    // Get or create session ID
    this.sessionId = Storage.getSessionId() || generateId();
    Storage.setSessionId(this.sessionId);

    // Initialize queue
    this.queue = new EventQueue(this.sessionId, this.config.maxQueueSize);

    // Initialize collectors
    this.deviceCollector = new DeviceCollector();
    this.connectionCollector = new ConnectionCollector();
    this.locationCollector = new LocationCollector();
    this.performanceCollector = new PerformanceCollector();

    this.init();
  }

  private init(): void {
    // Recover any lost events from previous session
    this.recoverEvents();

    // Collect initial data
    this.collectInitialData();

    // Start collectors based on config
    this.startCollectors();

    // Set up flush interval
    this.flushInterval = setInterval(() => this.flush(), this.config.flushInterval);

    // Handle page unload
    this.setupUnloadHandlers();

    this.log('Tracker initialized', this.config);
  }

  private recoverEvents(): void {
    const pendingEvents = Storage.getEvents();
    if (pendingEvents.length > 0) {
      this.log(`Recovering ${pendingEvents.length} events from storage`);
      // Send recovered events immediately
      this.send(pendingEvents);
      Storage.clearEvents();
    }
  }

  private collectInitialData(): void {
    // Device info
    if (this.config.trackDevice) {
      const deviceInfo = this.deviceCollector.collect();
      this.queue.add('device', deviceInfo);
    }

    // Connection info
    const connectionInfo = this.connectionCollector.collect();
    if (connectionInfo) {
      this.queue.add('connection', connectionInfo);
    }

    // Page info
    this.queue.add('pageview', {
      url: window.location.href,
      referrer: document.referrer,
      title: document.title
    });

    // Performance (after load)
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

    // Location (async)
    if (this.config.trackLocation) {
      this.collectLocation();
    }
  }

  private async collectLocation(): Promise<void> {
    // Try GPS first
    const gpsLocation = await this.locationCollector.getGPSLocation();
    if (gpsLocation) {
      this.queue.add('location', gpsLocation);
      return;
    }

    // Fallback to IP
    const ipLocation = await this.locationCollector.getIPLocation();
    if (ipLocation) {
      this.queue.add('location', ipLocation);
    }
  }

  private startCollectors(): void {
    if (this.config.trackMouse) {
      this.mouseCollector = new MouseCollector((event) => {
        this.queue.add('mouse', event);
      });
      this.mouseCollector.start();
    }

    if (this.config.trackScroll) {
      this.scrollCollector = new ScrollCollector((event) => {
        this.queue.add('scroll', event);
      });
      this.scrollCollector.start();
    }

    if (this.config.trackKeyboard) {
      this.keyboardCollector = new KeyboardCollector((event) => {
        this.queue.add('keyboard', event);
      });
      this.keyboardCollector.start();
    }

    this.visibilityCollector = new VisibilityCollector((event) => {
      this.queue.add('visibility', event);
    });
    this.visibilityCollector.start();
  }

  private setupUnloadHandlers(): void {
    // Primary: visibilitychange (most reliable)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.persist();
        this.flush(true);
      }
    });

    // Backup: beforeunload
    window.addEventListener('beforeunload', () => {
      this.persist();
      this.flush(true);
    });

    // Backup: pagehide (for mobile)
    window.addEventListener('pagehide', () => {
      this.persist();
      this.flush(true);
    });
  }

  private persist(): void {
    if (!this.queue.isEmpty()) {
      Storage.saveEvents(this.queue.getAll());
    }
  }

  private flush(useBeacon = false): void {
    if (this.queue.isEmpty()) return;

    const events = this.queue.flush();
    this.send(events, useBeacon);
  }

  private send(events: TrackerEvent[], useBeacon = false): void {
    const payload = JSON.stringify({
      apiKey: this.config.apiKey,
      sessionId: this.sessionId,
      events
    });

    this.log(`Sending ${events.length} events`, useBeacon ? '(beacon)' : '(fetch)');

    if (useBeacon) {
      navigator.sendBeacon(this.config.endpoint, payload);
    } else {
      fetch(this.config.endpoint, {
        method: 'POST',
        body: payload,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' }
      }).then(() => {
        Storage.clearEvents();
      }).catch((err) => {
        this.log('Send failed', err);
      });
    }
  }

  // Public API
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

    this.mouseCollector?.stop();
    this.scrollCollector?.stop();
    this.keyboardCollector?.stop();
    this.visibilityCollector?.stop();

    this.flush(true);
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[Tracker]', ...args);
    }
  }
}
```

### src/index.ts

```typescript
import { Tracker } from './core/tracker';
import { TrackerConfig } from './types';

// Expose to window for script tag usage
declare global {
  interface Window {
    Tracker: {
      init: (config: TrackerConfig) => Tracker;
      getInstance: () => Tracker | null;
    };
  }
}

let instance: Tracker | null = null;

window.Tracker = {
  init: (config: TrackerConfig) => {
    if (instance) {
      console.warn('[Tracker] Already initialized');
      return instance;
    }
    instance = new Tracker(config);
    return instance;
  },
  getInstance: () => instance
};

export { Tracker };
export type { TrackerConfig };
```

---

## Building

### Development (watch mode)

```bash
npm run dev
```

### Production build

```bash
npm run build
```

Output will be at `dist/tracker.min.js`

---

## Usage

### Basic Usage

```html
<script src="https://cdn.yourservice.com/tracker.min.js"></script>
<script>
  Tracker.init({
    apiKey: 'your-api-key'
  });
</script>
```

### With Options

```html
<script src="https://cdn.yourservice.com/tracker.min.js"></script>
<script>
  Tracker.init({
    apiKey: 'your-api-key',
    endpoint: 'https://your-api.com/track',
    flushInterval: 5000,
    trackMouse: true,
    trackScroll: true,
    trackKeyboard: false,
    trackDevice: true,
    trackLocation: true,
    trackPerformance: true,
    debug: true
  });
</script>
```

### Custom Events

```javascript
const tracker = Tracker.getInstance();

// Track custom events
tracker.track('button_click', { buttonId: 'signup-btn' });
tracker.track('purchase', { productId: '123', price: 99.99 });

// Identify users
tracker.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium'
});
```

---

## Features

| Feature | Description | Default |
|---------|-------------|---------|
| Mouse tracking | Movements, clicks, double-clicks | Enabled |
| Scroll tracking | Scroll position, direction, percentage | Enabled |
| Keyboard tracking | Key events (excludes sensitive inputs) | Disabled |
| Device info | Browser, OS, screen, memory, CPU | Enabled |
| Location | GPS (with permission) or IP-based | Disabled |
| Performance | Load times, paint metrics | Enabled |
| Page visibility | Tab focus/blur, visibility changes | Enabled |
| Connection info | Network type, speed | Enabled |

---

## Backend Requirements

Your backend should accept POST requests with this payload:

```json
{
  "apiKey": "string",
  "sessionId": "string",
  "events": [
    {
      "id": "string",
      "type": "string",
      "timestamp": 1234567890,
      "sessionId": "string",
      "data": {}
    }
  ]
}
```

### Recommended Backend Stack

- **API**: Node.js + Express/Fastify or Go
- **Queue**: Redis or Kafka for high-volume ingestion
- **Database**: ClickHouse or TimescaleDB for analytics
- **Cache**: Redis for real-time session data

---

## Privacy Considerations

1. **GDPR/CCPA Compliance**: Get user consent before tracking
2. **Data Minimization**: Only collect what you need
3. **Sensitive Data**: Never track passwords or payment info
4. **IP Anonymization**: Consider truncating IP addresses
5. **Data Retention**: Define and enforce retention policies
6. **User Rights**: Provide data export and deletion options

---

## License

MIT
