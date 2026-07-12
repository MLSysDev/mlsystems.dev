import type { PostMeta, SBlock } from '../serialize/toMdx';
import { allAssets, restoreAsset } from './assets';

export type Draft = {
  meta: PostMeta;
  blocks: SBlock[];
  tableVariants: Record<string, string>;
  savedAt: number;
};

const KEY = 'mlsys-write-draft-v1';
const DB_NAME = 'mlsys-write';
const STORE = 'assets';

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;

export function saveDraftDebounced(getDraft: () => Draft, onFail?: () => void): void {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(getDraft()));
    } catch {
      onFail?.();
    }
    void persistAssets().catch(() => onFail?.());
  }, 1000);
}

export function clearDraft(): void {
  clearTimeout(timer);
  try {
    localStorage.removeItem(KEY);
  } catch {
    return;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function persistAssets(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, 'readwrite');
    store.clear();
    for (const { name, file } of allAssets()) store.put(file, name);
    store.transaction.oncomplete = () => resolve();
    store.transaction.onerror = () => reject(store.transaction.error);
  });
  db.close();
}

export async function restoreAssets(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, 'readonly');
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();
    store.transaction.oncomplete = () => {
      const keys = keysReq.result as string[];
      const vals = valsReq.result as unknown[];
      keys.forEach((k, i) => {
        const value = vals[i];
        if (value instanceof Blob) {
          const file = value instanceof File ? value : new File([value], String(k));
          restoreAsset(String(k), file);
        }
      });
      resolve();
    };
    store.transaction.onerror = () => reject(store.transaction.error);
  });
  db.close();
}

export async function clearStoredAssets(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const store = tx(db, 'readwrite');
    store.clear();
    store.transaction.oncomplete = () => resolve();
    store.transaction.onerror = () => reject(store.transaction.error);
  });
  db.close();
}
