export interface BatteryEvent {
  type: 'battery_status' | 'battery_change';
  level: number;
  charging: boolean;
  chargingTime: number | null;
  dischargingTime: number | null;
  timestamp: number;
}

export class BatteryCollector {
  private callback: (event: BatteryEvent) => void;
  private battery: any = null;

  constructor(callback: (event: BatteryEvent) => void) {
    this.callback = callback;
  }

  async collect(): Promise<BatteryEvent | null> {
    const nav = navigator as any;
    if (!nav.getBattery) return null;
    try {
      this.battery = await nav.getBattery();
      return this.buildEvent('battery_status');
    } catch {
      return null;
    }
  }

  start(): void {
    if (!this.battery) return;
    this.battery.addEventListener('chargingchange', this.handleChange);
    this.battery.addEventListener('levelchange', this.handleChange);
    this.battery.addEventListener('chargingtimechange', this.handleChange);
    this.battery.addEventListener('dischargingtimechange', this.handleChange);
  }

  stop(): void {
    if (!this.battery) return;
    this.battery.removeEventListener('chargingchange', this.handleChange);
    this.battery.removeEventListener('levelchange', this.handleChange);
    this.battery.removeEventListener('chargingtimechange', this.handleChange);
    this.battery.removeEventListener('dischargingtimechange', this.handleChange);
  }

  private handleChange = (): void => {
    this.callback(this.buildEvent('battery_change'));
  };

  private buildEvent(type: 'battery_status' | 'battery_change'): BatteryEvent {
    return {
      type,
      level: this.battery.level,
      charging: this.battery.charging,
      chargingTime: this.battery.chargingTime === Infinity ? null : this.battery.chargingTime,
      dischargingTime: this.battery.dischargingTime === Infinity ? null : this.battery.dischargingTime,
      timestamp: Date.now()
    };
  }
}
