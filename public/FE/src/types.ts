export interface TrackerConfig {
  apiKey: string;
  endpoint?: string;
  flushInterval?: number;
  maxQueueSize?: number;
  sessionTimeoutMinutes?: number;
  trackSessionReplay?: boolean;
  trackDevice?: boolean;
  trackLocation?: boolean;
  trackPerformance?: boolean;
  trackBattery?: boolean;
  trackOrientation?: boolean;
  trackMotion?: boolean;
  trackTimeOnPage?: boolean;
  trackPermissions?: boolean;
  trackClicks?: boolean;
  debug?: boolean;
}

export interface TrackerEvent {
  id: string;
  type: string;
  timestamp: number;
  sessionId: string;
  userId: string;
  data: any;
}

export interface UserIdentity {
  userId: string;
  createdAt: number;
  visitCount: number;
  lastSeenAt: number;
}

export interface SessionData {
  sessionId: string;
  startedAt: number;
  lastActivityAt: number;
  pageViews: number;
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
