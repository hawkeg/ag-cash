import { openDB, IDBPDatabase } from 'idb';

// IndexedDB stores:
//  - queue: pending API mutations (POST/PUT/DELETE) to replay when back online
//  - cache: last successful GET responses so lists work offline

const DB_NAME = 'agcash-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'qid', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
      },
    });
  }
  return dbPromise;
};

export interface QueuedRequest {
  qid?: number;
  method: string;
  url: string;
  data?: any;
  ts: number;
}

export const offlineDb = {
  async enqueue(entry: Omit<QueuedRequest, 'qid'>) {
    const db = await getDb();
    await db.add('queue', entry);
    window.dispatchEvent(new Event('offline-queue-changed'));
  },

  async getQueue(): Promise<QueuedRequest[]> {
    const db = await getDb();
    return db.getAll('queue');
  },

  async dequeue(qid: number) {
    const db = await getDb();
    await db.delete('queue', qid);
    window.dispatchEvent(new Event('offline-queue-changed'));
  },

  async pendingCount(): Promise<number> {
    const db = await getDb();
    return db.count('queue');
  },

  async setCache(key: string, data: any) {
    const db = await getDb();
    await db.put('cache', { data, ts: Date.now() }, key);
  },

  async getCache(key: string): Promise<any | undefined> {
    const db = await getDb();
    const row = await db.get('cache', key);
    return row?.data;
  },
};
