export interface TrackerConfig {
  apiKey: string;
  endpoint?: string;
  flushInterval?: number;
  maxQueueSize?: number;
  trackSessionReplay?: boolean;
  trackDevice?: boolean;
  trackLocation?: boolean;
  trackPerformance?: boolean;
  trackBattery?: boolean;
  trackOrientation?: boolean;
  trackMotion?: boolean;
  trackTimeOnPage?: boolean;
  trackPermissions?: boolean;
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
