import { openDB, DBSchema } from "idb";

interface PosDB extends DBSchema {
  cache: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
  };
  offlineOrders: {
    key: string;
    value: {
      id: string;
      createdAt: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: any;
    };
    indexes: { "by-date": number };
  };
}

export async function initDB() {
  return openDB<PosDB>("pos-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache");
      }
      if (!db.objectStoreNames.contains("offlineOrders")) {
        const orderStore = db.createObjectStore("offlineOrders", {
          keyPath: "id",
        });
        orderStore.createIndex("by-date", "createdAt");
      }
    },
  });
}

// Cache Management
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveToCache(key: string, data: any) {
  const db = await initDB();
  await db.put("cache", data, key);
}

export async function getFromCache(key: string) {
  const db = await initDB();
  return db.get("cache", key);
}

export async function clearCache() {
  const db = await initDB();
  await db.clear("cache");
}

// Offline Orders Management
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addOfflineOrder(payload: any) {
  const db = await initDB();
  const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const order = {
    id,
    createdAt: Date.now(),
    payload,
  };
  await db.put("offlineOrders", order);
  return order;
}

export async function getOfflineOrders() {
  const db = await initDB();
  return db.getAllFromIndex("offlineOrders", "by-date");
}

export async function deleteOfflineOrder(id: string) {
  const db = await initDB();
  await db.delete("offlineOrders", id);
}

export async function clearOfflineOrders() {
  const db = await initDB();
  await db.clear("offlineOrders");
}
