/**
 * Unit tests for offline sync functionality
 * 
 * Tests:
 * - Cached data access when offline
 * - Mutation queueing
 * - Conflict detection
 * - Sync when connection restored
 * 
 * Requirements: 10.4, 12.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getOfflineQueue,
  queueMutation,
  removeMutationFromQueue,
  clearOfflineQueue,
  getSyncStatus,
  updateSyncStatus,
  detectConflict,
  createConflict,
  isOnline,
  setupOnlineListeners,
  type QueuedMutation,
  type SyncStatus,
} from '@/lib/utils/offline-sync';

describe('Offline Sync Utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Queue Management', () => {
    it('should start with an empty queue', () => {
      const queue = getOfflineQueue();
      expect(queue).toEqual([]);
    });

    it('should add mutations to the queue', () => {
      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Test Category' },
        userId: 'user-123',
      });

      const queue = getOfflineQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        type: 'create',
        entity: 'category',
        data: { name: 'Test Category' },
        userId: 'user-123',
      });
      expect(queue[0].id).toBeDefined();
      expect(queue[0].timestamp).toBeDefined();
    });

    it('should add multiple mutations to the queue', () => {
      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Category 1' },
        userId: 'user-123',
      });

      queueMutation({
        type: 'update',
        entity: 'standard_size',
        data: { primary_size: 'M' },
        userId: 'user-123',
      });

      const queue = getOfflineQueue();
      expect(queue).toHaveLength(2);
    });

    it('should remove a mutation from the queue', () => {
      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Test Category' },
        userId: 'user-123',
      });

      const queue = getOfflineQueue();
      const mutationId = queue[0].id;

      removeMutationFromQueue(mutationId);

      const updatedQueue = getOfflineQueue();
      expect(updatedQueue).toHaveLength(0);
    });

    it('should clear the entire queue', () => {
      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Category 1' },
        userId: 'user-123',
      });

      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Category 2' },
        userId: 'user-123',
      });

      clearOfflineQueue();

      const queue = getOfflineQueue();
      expect(queue).toHaveLength(0);
    });

    it('should update sync status when queueing mutations', () => {
      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Test Category' },
        userId: 'user-123',
      });

      const status = getSyncStatus();
      expect(status.hasQueuedMutations).toBe(true);
      expect(status.lastQueuedAt).toBeDefined();
    });

    it('should update sync status when clearing queue', () => {
      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Test Category' },
        userId: 'user-123',
      });

      clearOfflineQueue();

      const status = getSyncStatus();
      expect(status.hasQueuedMutations).toBe(false);
    });
  });

  describe('Sync Status', () => {
    it('should start with default sync status', () => {
      const status = getSyncStatus();
      expect(status).toEqual({
        hasQueuedMutations: false,
        isSyncing: false,
      });
    });

    it('should update sync status', () => {
      updateSyncStatus({
        hasQueuedMutations: true,
        lastQueuedAt: Date.now(),
        isSyncing: false,
      });

      const status = getSyncStatus();
      expect(status.hasQueuedMutations).toBe(true);
      expect(status.lastQueuedAt).toBeDefined();
      expect(status.isSyncing).toBe(false);
    });

    it('should track syncing state', () => {
      updateSyncStatus({ isSyncing: true });

      const status = getSyncStatus();
      expect(status.isSyncing).toBe(true);
    });

    it('should track sync errors', () => {
      updateSyncStatus({
        isSyncing: false,
        syncError: 'Network error',
      });

      const status = getSyncStatus();
      expect(status.syncError).toBe('Network error');
    });

    it('should track last synced timestamp', () => {
      const now = Date.now();
      updateSyncStatus({
        lastSyncedAt: now,
      });

      const status = getSyncStatus();
      expect(status.lastSyncedAt).toBe(now);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflict when server data is newer', () => {
      const localData = {
        id: 'cat-1',
        name: 'Local Category',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const serverData = {
        id: 'cat-1',
        name: 'Server Category',
        updated_at: '2024-01-01T11:00:00Z', // 1 hour later
      };

      const hasConflict = detectConflict(localData, serverData);
      expect(hasConflict).toBe(true);
    });

    it('should not detect conflict when local data is newer', () => {
      const localData = {
        id: 'cat-1',
        name: 'Local Category',
        updated_at: '2024-01-01T11:00:00Z',
      };

      const serverData = {
        id: 'cat-1',
        name: 'Server Category',
        updated_at: '2024-01-01T10:00:00Z', // 1 hour earlier
      };

      const hasConflict = detectConflict(localData, serverData);
      expect(hasConflict).toBe(false);
    });

    it('should not detect conflict when timestamps are equal', () => {
      const timestamp = '2024-01-01T10:00:00Z';
      const localData = {
        id: 'cat-1',
        name: 'Local Category',
        updated_at: timestamp,
      };

      const serverData = {
        id: 'cat-1',
        name: 'Server Category',
        updated_at: timestamp,
      };

      const hasConflict = detectConflict(localData, serverData);
      expect(hasConflict).toBe(false);
    });

    it('should create conflict object with correct structure', () => {
      const localData = {
        id: 'cat-1',
        name: 'Local Category',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const serverData = {
        id: 'cat-1',
        name: 'Server Category',
        updated_at: '2024-01-01T11:00:00Z',
      };

      const conflict = createConflict('category', localData, serverData);

      expect(conflict).toMatchObject({
        id: 'cat-1',
        entity: 'category',
        localData,
        serverData,
      });
      expect(conflict.localTimestamp).toBeDefined();
      expect(conflict.serverTimestamp).toBeDefined();
      expect(conflict.serverTimestamp).toBeGreaterThan(conflict.localTimestamp);
    });
  });

  describe('Online/Offline Detection', () => {
    it('should detect online status', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      expect(isOnline()).toBe(true);
    });

    it('should detect offline status', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      expect(isOnline()).toBe(false);
    });

    it('should set up online/offline event listeners', () => {
      const onOnline = vi.fn();
      const onOffline = vi.fn();

      const cleanup = setupOnlineListeners(onOnline, onOffline);

      // Simulate going offline
      window.dispatchEvent(new Event('offline'));
      expect(onOffline).toHaveBeenCalledTimes(1);

      // Simulate going online
      window.dispatchEvent(new Event('online'));
      expect(onOnline).toHaveBeenCalledTimes(1);

      // Cleanup
      cleanup();

      // Events should no longer trigger callbacks
      window.dispatchEvent(new Event('offline'));
      expect(onOffline).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('Cached Data Access When Offline', () => {
    it('should allow reading queued mutations when offline', () => {
      // Queue some mutations while online
      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Test Category' },
        userId: 'user-123',
      });

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Should still be able to read the queue
      const queue = getOfflineQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].data.name).toBe('Test Category');
    });

    it('should allow queueing mutations when offline', () => {
      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Queue a mutation while offline
      queueMutation({
        type: 'update',
        entity: 'standard_size',
        data: { primary_size: 'L' },
        userId: 'user-123',
      });

      // Should be in the queue
      const queue = getOfflineQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].data.primary_size).toBe('L');
    });

    it('should preserve queue across page reloads (localStorage)', () => {
      // Queue mutations
      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Category 1' },
        userId: 'user-123',
      });

      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Category 2' },
        userId: 'user-123',
      });

      // Simulate page reload by getting fresh queue from localStorage
      const queue = getOfflineQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].data.name).toBe('Category 1');
      expect(queue[1].data.name).toBe('Category 2');
    });
  });

  describe('Mutation Queueing', () => {
    it('should queue create mutations', () => {
      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'New Category' },
        userId: 'user-123',
      });

      const queue = getOfflineQueue();
      expect(queue[0].type).toBe('create');
      expect(queue[0].entity).toBe('category');
    });

    it('should queue update mutations', () => {
      queueMutation({
        type: 'update',
        entity: 'standard_size',
        data: { id: 'size-1', primary_size: 'XL' },
        userId: 'user-123',
      });

      const queue = getOfflineQueue();
      expect(queue[0].type).toBe('update');
      expect(queue[0].entity).toBe('standard_size');
    });

    it('should queue delete mutations', () => {
      queueMutation({
        type: 'delete',
        entity: 'brand_size',
        data: { id: 'brand-1' },
        userId: 'user-123',
      });

      const queue = getOfflineQueue();
      expect(queue[0].type).toBe('delete');
      expect(queue[0].entity).toBe('brand_size');
    });

    it('should maintain queue order (FIFO)', () => {
      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'First' },
        userId: 'user-123',
      });

      // Small delay to ensure different timestamps
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      queueMutation({
        type: 'update',
        entity: 'category',
        data: { name: 'Second' },
        userId: 'user-123',
      });

      queueMutation({
        type: 'delete',
        entity: 'category',
        data: { id: 'cat-1' },
        userId: 'user-123',
      });

      const queue = getOfflineQueue();
      expect(queue).toHaveLength(3);
      expect(queue[0].data.name).toBe('First');
      expect(queue[1].data.name).toBe('Second');
      expect(queue[2].type).toBe('delete');
    });

    it('should include user ID in queued mutations', () => {
      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Test' },
        userId: 'user-456',
      });

      const queue = getOfflineQueue();
      expect(queue[0].userId).toBe('user-456');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queue gracefully', () => {
      const queue = getOfflineQueue();
      expect(queue).toEqual([]);
      
      // Should not throw when removing from empty queue
      expect(() => removeMutationFromQueue('non-existent')).not.toThrow();
    });

    it('should handle invalid localStorage data', () => {
      // Corrupt the localStorage data
      localStorage.setItem('my-sizes-offline-queue', 'invalid json');

      // Should return empty array instead of throwing
      const queue = getOfflineQueue();
      expect(queue).toEqual([]);
    });

    it('should handle missing data gracefully in conflict detection', () => {
      expect(detectConflict(null, null)).toBe(false);
      expect(detectConflict({ updated_at: '2024-01-01T10:00:00Z' }, null)).toBe(false);
      expect(detectConflict(null, { updated_at: '2024-01-01T10:00:00Z' })).toBe(false);
    });

    it('should generate unique IDs for queued mutations', () => {
      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Test 1' },
        userId: 'user-123',
      });

      queueMutation({
        type: 'create',
        entity: 'category',
        data: { name: 'Test 2' },
        userId: 'user-123',
      });

      const queue = getOfflineQueue();
      expect(queue[0].id).not.toBe(queue[1].id);
    });
  });
});
