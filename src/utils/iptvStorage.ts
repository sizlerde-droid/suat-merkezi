import { IPTVChannel } from '../types';

const DB_NAME = 'suat_iptv_db';
const DB_VERSION = 1;
const STORE_CHANNELS = 'channels';
const STORE_META = 'metadata';

const LOCAL_STORAGE_KEY = 'suat_iptv_channels_backup';
const FAVORITES_STORAGE_KEY = 'suat_iptv_favorites';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_CHANNELS)) {
        db.createObjectStore(STORE_CHANNELS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save channel list securely to both localStorage (instant sync) and IndexedDB (durable)
 */
export async function saveChannelsToStorage(channels: IPTVChannel[]): Promise<void> {
  // 1. Immediately save to localStorage for fast synchronous reload on page refresh
  try {
    const slice = channels.slice(0, 2000); // cap to avoid quota error on massive lists
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(slice));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }

  // 2. Persist full list to IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_CHANNELS, STORE_META], 'readwrite');
    const channelStore = tx.objectStore(STORE_CHANNELS);
    const metaStore = tx.objectStore(STORE_META);

    // Clear existing
    channelStore.clear();

    // Insert all channels
    for (const channel of channels) {
      channelStore.put(channel);
    }

    // Save metadata
    metaStore.put({
      key: 'playlist_info',
      count: channels.length,
      updatedAt: new Date().toISOString(),
    });

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed:', err);
  }
}

/**
 * Synchronously load channels from localStorage for instant initial render
 */
export function loadChannelsSync(): IPTVChannel[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed: IPTVChannel[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const favorites = getFavoritesFromStorage();
        return parsed.map((c, idx) => ({
          ...c,
          number: c.number || idx + 1,
          isFavorite: favorites.has(c.id) || !!c.isFavorite,
        }));
      }
    }
  } catch (e) {
    console.warn('Failed to load channels synchronously:', e);
  }
  return [];
}

/**
 * Load channels from storage (IndexedDB preferred, with localStorage fallback)
 */
export async function loadChannelsFromStorage(): Promise<IPTVChannel[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CHANNELS, 'readonly');
    const store = tx.objectStore(STORE_CHANNELS);
    const req = store.getAll();

    const channels = await new Promise<IPTVChannel[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (channels && channels.length > 0) {
      // Re-apply favorites
      const favorites = getFavoritesFromStorage();
      return channels.map((c, idx) => ({
        ...c,
        number: c.number || idx + 1,
        isFavorite: favorites.has(c.id) || !!c.isFavorite,
      }));
    }
  } catch (err) {
    console.warn('IndexedDB read failed, trying localStorage:', err);
  }

  // LocalStorage fallback
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed: IPTVChannel[] = JSON.parse(raw);
      const favorites = getFavoritesFromStorage();
      return parsed.map((c, idx) => ({
        ...c,
        number: c.number || idx + 1,
        isFavorite: favorites.has(c.id) || !!c.isFavorite,
      }));
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Clear all stored channels
 */
export async function clearChannelsStorage(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_CHANNELS, STORE_META], 'readwrite');
    tx.objectStore(STORE_CHANNELS).clear();
    tx.objectStore(STORE_META).clear();
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Favorites persistence in localStorage
 */
export function getFavoritesFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      const arr: string[] = JSON.parse(raw);
      return new Set(arr);
    }
  } catch {
    // ignore
  }
  return new Set();
}

export function saveFavoritesToStorage(favorites: Set<string>): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favorites)));
  } catch {
    // ignore
  }
}
