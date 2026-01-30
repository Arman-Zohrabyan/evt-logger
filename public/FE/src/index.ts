import { Tracker } from './core/tracker';
import { TrackerConfig } from './types';

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
      instance.destroy();
      instance = null;
    }
    instance = new Tracker(config);
    return instance;
  },
  getInstance: () => instance
};

export { Tracker };
export type { TrackerConfig };
