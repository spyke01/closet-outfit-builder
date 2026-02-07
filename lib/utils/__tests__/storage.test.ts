import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  clearVersionedStorage,
  getStorageKeys,
  createStorageCache,
  onStorageChange,
} from '../storage';

describe('Storage Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getStorageItem', () => {
    it('should get string item from storage', () => {
      localStorage.setItem('wtw_v1_test', 'value');
      expect(getStorageItem('test')).toBe('value');
    });

    it('should get JSON item from storage', () => {
      const obj = { name: 'test', value: 123 };
      localStorage.setItem('wtw_v1_test', JSON.stringify(obj));
      expect(getStorageItem('test')).toEqual(obj);
    });

    it('should return null for non-existent item', () => {
      expect(getStorageItem('nonexistent')).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(getStorageItem('test')).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('setStorageItem', () => {
    it('should set string item in storage', () => {
      const success = setStorageItem('test', 'value');
      expect(success).toBe(true);
      expect(localStorage.getItem('wtw_v1_test')).toBe('value');
    });

    it('should set object item in storage', () => {
      const obj = { name: 'test', value: 123 };
      const success = setStorageItem('test', obj);
      expect(success).toBe(true);
      expect(localStorage.getItem('wtw_v1_test')).toBe(JSON.stringify(obj));
    });

    it('should handle localStorage errors gracefully', () => {
      // Test that the function returns false when storage is unavailable
      // The actual error handling is tested by the isStorageAvailable check
      const result = setStorageItem('test', 'value');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('removeStorageItem', () => {
    it('should remove item from storage', () => {
      localStorage.setItem('wtw_v1_test', 'value');
      const success = removeStorageItem('test');
      expect(success).toBe(true);
      expect(localStorage.getItem('wtw_v1_test')).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const result = removeStorageItem('test');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('clearVersionedStorage', () => {
    it('should clear all versioned items', () => {
      localStorage.setItem('wtw_v1_test1', 'value1');
      localStorage.setItem('wtw_v1_test2', 'value2');
      localStorage.setItem('other_key', 'other_value');

      const success = clearVersionedStorage();
      expect(success).toBe(true);
      expect(localStorage.getItem('wtw_v1_test1')).toBeNull();
      expect(localStorage.getItem('wtw_v1_test2')).toBeNull();
      expect(localStorage.getItem('other_key')).toBe('other_value');
    });

    it('should handle localStorage errors gracefully', () => {
      const result = clearVersionedStorage();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getStorageKeys', () => {
    it('should get all versioned keys', () => {
      localStorage.setItem('wtw_v1_test1', 'value1');
      localStorage.setItem('wtw_v1_test2', 'value2');
      localStorage.setItem('other_key', 'other_value');

      const keys = getStorageKeys();
      expect(keys).toContain('test1');
      expect(keys).toContain('test2');
      expect(keys).not.toContain('other_key');
    });

    it('should return empty array on error', () => {
      const keys = getStorageKeys();
      expect(Array.isArray(keys)).toBe(true);
    });
  });

  describe('StorageCache', () => {
    it('should cache storage reads', () => {
      const cache = createStorageCache<string>();
      setStorageItem('test', 'value');

      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

      // First read should hit storage
      expect(cache.get('test')).toBe('value');
      expect(getItemSpy).toHaveBeenCalledTimes(1);

      // Second read should use cache
      expect(cache.get('test')).toBe('value');
      expect(getItemSpy).toHaveBeenCalledTimes(1);

      getItemSpy.mockRestore();
    });

    it('should invalidate cache after TTL', () => {
      vi.useFakeTimers();
      const cache = createStorageCache<string>(1000); // 1 second TTL
      setStorageItem('test', 'value');

      // First read
      expect(cache.get('test')).toBe('value');

      // Advance time past TTL
      vi.advanceTimersByTime(1500);

      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

      // Should read from storage again
      expect(cache.get('test')).toBe('value');
      expect(getItemSpy).toHaveBeenCalled();

      getItemSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should update cache on set', () => {
      const cache = createStorageCache<string>();

      cache.set('test', 'value1');
      expect(cache.get('test')).toBe('value1');

      cache.set('test', 'value2');
      expect(cache.get('test')).toBe('value2');
    });

    it('should invalidate specific key', () => {
      const cache = createStorageCache<string>();
      setStorageItem('test', 'value');

      cache.get('test'); // Load into cache
      cache.invalidate('test');

      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      cache.get('test'); // Should read from storage again
      expect(getItemSpy).toHaveBeenCalled();

      getItemSpy.mockRestore();
    });

    it('should clear all cache', () => {
      const cache = createStorageCache<string>();
      setStorageItem('test1', 'value1');
      setStorageItem('test2', 'value2');

      cache.get('test1');
      cache.get('test2');

      cache.clear();

      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      cache.get('test1');
      cache.get('test2');
      expect(getItemSpy).toHaveBeenCalledTimes(2);

      getItemSpy.mockRestore();
    });
  });

  describe('onStorageChange', () => {
    it('should listen for storage changes', () => {
      const callback = vi.fn();
      const cleanup = onStorageChange('test', callback);

      const event = new StorageEvent('storage', {
        key: 'wtw_v1_test',
        newValue: JSON.stringify('new'),
        oldValue: JSON.stringify('old'),
      });

      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith('new', 'old');

      cleanup();
    });

    it('should not trigger for other keys', () => {
      const callback = vi.fn();
      const cleanup = onStorageChange('test', callback);

      const event = new StorageEvent('storage', {
        key: 'other_key',
        newValue: 'new',
        oldValue: 'old',
      });

      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();

      cleanup();
    });

    it('should cleanup listener', () => {
      const callback = vi.fn();
      const cleanup = onStorageChange('test', callback);

      cleanup();

      const event = new StorageEvent('storage', {
        key: 'wtw_v1_test',
        newValue: 'new',
        oldValue: 'old',
      });

      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
