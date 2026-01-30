export interface PerformanceData {
  loadTime: number;
  domContentLoaded: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
}

export class PerformanceCollector {
  collect(): PerformanceData | null {
    if (!window.performance) return null;

    const timing = performance.timing;
    const data: PerformanceData = {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart
    };

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
}
