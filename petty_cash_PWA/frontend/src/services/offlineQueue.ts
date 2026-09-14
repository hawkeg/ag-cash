import api from './api';
import { offlineDb } from './offlineDb';

// Replay queued mutations when connectivity returns
let replaying = false;

export const replayQueue = async (): Promise<number> => {
  if (replaying) return 0;
  replaying = true;
  let done = 0;
  try {
    const queue = await offlineDb.getQueue();
    for (const item of queue.sort((a, b) => a.ts - b.ts)) {
      try {
        await api.request({ method: item.method as any, url: item.url, data: item.data, __skipOfflineQueue: true } as any);
        if (item.qid) await offlineDb.dequeue(item.qid);
        done++;
      } catch (e: any) {
        // Real server error (4xx) -> drop the entry; network error -> stop and keep queue
        if (e?.response?.status && e.response.status < 500) {
          if (item.qid) await offlineDb.dequeue(item.qid);
        } else {
          break;
        }
      }
    }
  } finally {
    replaying = false;
  }
  window.dispatchEvent(new Event('offline-queue-changed'));
  return done;
};

export const initOfflineSync = () => {
  window.addEventListener('online', () => {
    replayQueue();
    window.dispatchEvent(new Event('connectivity-changed'));
  });
  window.addEventListener('offline', () => {
    window.dispatchEvent(new Event('connectivity-changed'));
  });
};

export const isOnline = () => navigator.onLine;
