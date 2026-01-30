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
