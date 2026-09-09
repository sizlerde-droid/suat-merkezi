// IndexedDB storage for user-uploaded music tracks (blobs & metadata)

export interface UserMusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  fileName: string;
  fileType: string;
  fileSize: number;
  addedAt: number;
  isFavorite: boolean;
  blob?: Blob;
  objectUrl?: string; // created at runtime
}

const DB_NAME = 'suat_music_db';
const DB_VERSION = 1;
const STORE_NAME = 'music_tracks';
const LOCAL_META_KEY = 'suat_music_meta_v1';
const LOCAL_FAVS_KEY = 'suat_music_favs_v1';

function openMusicDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('addedAt', 'addedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('artist', 'artist', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get favorite track IDs from localStorage
 */
export function getStoredFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_FAVS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {
    console.warn('Failed to parse favorites:', e);
  }
  return new Set();
}

/**
 * Save favorite track IDs to localStorage
 */
export function saveStoredFavorites(favs: Set<string>): void {
  try {
    localStorage.setItem(LOCAL_FAVS_KEY, JSON.stringify(Array.from(favs)));
  } catch (e) {
    console.warn('Failed to save favorites:', e);
  }
}

/**
 * Save a batch of music tracks to IndexedDB and update localStorage metadata cache
 */
export async function saveTracksToStorage(tracks: UserMusicTrack[]): Promise<void> {
  try {
    const db = await openMusicDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const track of tracks) {
      // Omit temporary objectUrl when persisting
      const record = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        fileName: track.fileName,
        fileType: track.fileType,
        fileSize: track.fileSize,
        addedAt: track.addedAt,
        isFavorite: track.isFavorite,
        blob: track.blob,
      };
      store.put(record);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    // Cache metadata in localStorage for quick stats
    const metaList = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      duration: t.duration,
      fileName: t.fileName,
      fileType: t.fileType,
      fileSize: t.fileSize,
      addedAt: t.addedAt,
      isFavorite: t.isFavorite,
    }));
    try {
      localStorage.setItem(LOCAL_META_KEY, JSON.stringify(metaList));
    } catch {
      // quota might be tight, ignore
    }
  } catch (err) {
    console.error('Failed to save tracks to IndexedDB:', err);
    throw err;
  }
}

/**
 * Load all music tracks from IndexedDB, assigning runtime blob object URLs
 */
export async function loadTracksFromStorage(): Promise<UserMusicTrack[]> {
  try {
    const db = await openMusicDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    const records: any[] = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const favorites = getStoredFavorites();

    const tracks: UserMusicTrack[] = records.map((rec) => {
      let objectUrl: string | undefined = undefined;
      if (rec.blob instanceof Blob) {
        try {
          objectUrl = URL.createObjectURL(rec.blob);
        } catch (e) {
          console.warn('Failed to create object URL for blob:', e);
        }
      }

      return {
        id: rec.id,
        title: rec.title || 'İsimsiz Şarkı',
        artist: rec.artist || 'Bilinmeyen Sanatçı',
        album: rec.album || 'Müziklerim',
        duration: rec.duration || 0,
        fileName: rec.fileName || '',
        fileType: rec.fileType || 'audio/mpeg',
        fileSize: rec.fileSize || 0,
        addedAt: rec.addedAt || Date.now(),
        isFavorite: favorites.has(rec.id) || !!rec.isFavorite,
        blob: rec.blob,
        objectUrl,
      };
    });

    // Sort by added date or title
    tracks.sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    return tracks;
  } catch (err) {
    console.warn('Failed to load tracks from IndexedDB:', err);
    return [];
  }
}

/**
 * Delete a single track from IndexedDB and storage
 */
export async function deleteTrackFromStorage(id: string): Promise<void> {
  try {
    const db = await openMusicDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to delete track:', e);
  }
}

/**
 * Clear all music tracks from IndexedDB and localStorage
 */
export async function clearAllTracksStorage(): Promise<void> {
  try {
    const db = await openMusicDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    localStorage.removeItem(LOCAL_META_KEY);
  } catch (e) {
    console.warn('Failed to clear tracks:', e);
  }
}

/**
 * Helper to parse artist & title from audio filename
 */
export function parseAudioFileName(fileName: string): { title: string; artist: string; album: string } {
  // Remove file extension
  const cleanName = fileName.replace(/\.[^/.]+$/, '').trim();

  // Pattern: "Artist - Title" or "Artist - Title - Album"
  if (cleanName.includes(' - ')) {
    const parts = cleanName.split(' - ').map((s) => s.trim());
    if (parts.length >= 2) {
      return {
        artist: parts[0] || 'Bilinmeyen Sanatçı',
        title: parts[1] || 'İsimsiz Şarkı',
        album: parts[2] || 'Müziklerim',
      };
    }
  }

  // Pattern: "Artist _ Title"
  if (cleanName.includes(' _ ')) {
    const parts = cleanName.split(' _ ').map((s) => s.trim());
    if (parts.length >= 2) {
      return {
        artist: parts[0] || 'Bilinmeyen Sanatçı',
        title: parts[1] || 'İsimsiz Şarkı',
        album: 'Müziklerim',
      };
    }
  }

  return {
    title: cleanName || 'İsimsiz Şarkı',
    artist: 'Bilinmeyen Sanatçı',
    album: 'Müziklerim',
  };
}

/**
 * Probe audio duration from Blob via temp Audio element
 */
export function getAudioDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'metadata';

      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
      };

      const onLoaded = () => {
        const duration = isFinite(audio.duration) ? Math.round(audio.duration) : 0;
        cleanup();
        resolve(duration);
      };

      const onError = () => {
        cleanup();
        resolve(0);
      };

      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('error', onError);
      audio.src = url;

      // Timeout fallback after 3 seconds
      setTimeout(() => {
        cleanup();
        resolve(0);
      }, 3000);
    } catch {
      resolve(0);
    }
  });
}
