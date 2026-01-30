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
}
