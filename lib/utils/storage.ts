import { createLogger } from './logger';

const logger = createLogger({ component: 'lib-utils-storage' });


/**
 * Optimized localStorage utilities with version prefixes and error handling
 * Follows Vercel React best practices for client-side storage
 */

const STORAGE_VERSION = 'v1';
const STORAGE_PREFIX = 'wtw'; // "my-ai-outfit" prefix

/**
 * Generate a versioned storage key
 */
function getVersionedKey(key: string): string {
  return `${STORAGE_PREFIX}_${STORAGE_VERSION}_${key}`;
}

/**
 * Check if localStorage is available
 * Handles incognito/private browsing mode gracefully
 */
function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get item from localStorage with error handling
 * Returns null if storage is unavailable or item doesn't exist
 */
export function getStorageItem<T = string>(key: string): T | null {
  if (!isStorageAvailable()) {
    return null;
  }

  try {
    const versionedKey = getVersionedKey(key);
    const item = localStorage.getItem(versionedKey);
    
    if (item === null) {
      return null;
    }

    // Try to parse as JSON, fall back to string
    try {
      return JSON.parse(item) as T;
    } catch {
      return item as T;
    }
  } catch (error) {
    logger.warn(`Failed to get storage item "${key}":`, error);
    return null;
  }
}

/**
 * Set item in localStorage with error handling
 * Automatically stringifies objects
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    const versionedKey = getVersionedKey(key);
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(versionedKey, stringValue);
    return true;
  } catch (error) {
    logger.warn(`Failed to set storage item "${key}":`, error);
    return false;
  }
}

/**
 * Remove item from localStorage with error handling
 */
export function removeStorageItem(key: string): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    const versionedKey = getVersionedKey(key);
    localStorage.removeItem(versionedKey);
    return true;
  } catch (error) {
    logger.warn(`Failed to remove storage item "${key}":`, error);
    return false;
  }
}

/**
 * Clear all versioned storage items
 * Only removes items with the current version prefix
 */
export function clearVersionedStorage(): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    const prefix = `${STORAGE_PREFIX}_${STORAGE_VERSION}_`;
    const keysToRemove: string[] = [];

    // Collect keys to remove
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    // Remove collected keys
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    return true;
  } catch (error) {
    logger.warn('Failed to clear versioned storage:', error);
    return false;
  }
}

/**
 * Get all keys for the current version
 */
export function getStorageKeys(): string[] {
  if (!isStorageAvailable()) {
    return [];
  }

  try {
    const prefix = `${STORAGE_PREFIX}_${STORAGE_VERSION}_`;
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        // Remove prefix to get original key
        keys.push(key.substring(prefix.length));
      }
    }

    return keys;
  } catch (error) {
    logger.warn('Failed to get storage keys:', error);
    return [];
  }
}

/**
 * Cache for frequently accessed storage items
 * Reduces localStorage reads for better performance
 */
class StorageCache<T> {
  private cache = new Map<string, T>();
  private timestamps = new Map<string, number>();
  private ttl: number;

  constructor(ttlMs: number = 5000) {
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);
    const timestamp = this.timestamps.get(key);

    if (cached !== undefined && timestamp !== undefined) {
      // Check if cache is still valid
      if (Date.now() - timestamp < this.ttl) {
        return cached;
      }
      // Cache expired, remove it
      this.cache.delete(key);
      this.timestamps.delete(key);
    }

    // Read from storage
    const value = getStorageItem<T>(key);
    if (value !== null) {
      this.cache.set(key, value);
      this.timestamps.set(key, Date.now());
    }

    return value;
  }

  set(key: string, value: T): boolean {
    const success = setStorageItem(key, value);
    if (success) {
      this.cache.set(key, value);
      this.timestamps.set(key, Date.now());
    }
    return success;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }
}

/**
 * Create a cached storage accessor
 * Useful for frequently accessed storage items
 */
export function createStorageCache<T>(ttlMs?: number): StorageCache<T> {
  return new StorageCache<T>(ttlMs);
}

/**
 * Listen for storage changes from other tabs/windows
 * Automatically handles cleanup
 */
export function onStorageChange(
  key: string,
  callback: (newValue: unknown, oldValue: unknown) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const versionedKey = getVersionedKey(key);

  const handler = (event: StorageEvent) => {
    if (event.key === versionedKey) {
      try {
        const newValue = event.newValue ? JSON.parse(event.newValue) : null;
        const oldValue = event.oldValue ? JSON.parse(event.oldValue) : null;
        callback(newValue, oldValue);
      } catch {
        // If parsing fails, pass raw values
        callback(event.newValue, event.oldValue);
      }
    }
  };

  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener('storage', handler);
  };
}
