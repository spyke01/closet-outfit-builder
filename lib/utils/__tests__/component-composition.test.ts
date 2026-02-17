import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  fetchInParallel, 
  runNonBlocking, 
  logAsync, 
  trackEventAsync 
} from '../component-composition';

describe('Component Composition Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchInParallel', () => {
    it('should fetch all promises in parallel', async () => {
      const startTime = Date.now();
      
      const promises = {
        user: new Promise(resolve => setTimeout(() => resolve({ id: '1', name: 'John' }), 50)),
        posts: new Promise(resolve => setTimeout(() => resolve([{ id: '1' }]), 50)),
        comments: new Promise(resolve => setTimeout(() => resolve([{ id: '1' }]), 50)),
      };

      const result = await fetchInParallel(promises);
      const duration = Date.now() - startTime;

      // Should complete in ~50ms (parallel) not ~150ms (sequential)
      expect(duration).toBeLessThan(100);
      expect(result.user).toEqual({ id: '1', name: 'John' });
      expect(result.posts).toEqual([{ id: '1' }]);
      expect(result.comments).toEqual([{ id: '1' }]);
    });

    it('should handle empty promises object', async () => {
      const result = await fetchInParallel({});
      expect(result).toEqual({});
    });

    it('should handle single promise', async () => {
      const result = await fetchInParallel({
        user: Promise.resolve({ id: '1', name: 'John' }),
      });

      expect(result.user).toEqual({ id: '1', name: 'John' });
    });

    it('should propagate errors', async () => {
      const promises = {
        user: Promise.resolve({ id: '1' }),
        error: Promise.reject(new Error('Failed to fetch')),
      };

      await expect(fetchInParallel(promises)).rejects.toThrow('Failed to fetch');
    });

    it('should maintain type safety', async () => {
      const result = await fetchInParallel({
        user: Promise.resolve({ id: '1', name: 'John' }),
        count: Promise.resolve(42),
        active: Promise.resolve(true),
      });

      // TypeScript should infer correct types
      expect(typeof result.user.id).toBe('string');
      expect(typeof result.count).toBe('number');
      expect(typeof result.active).toBe('boolean');
    });
  });

  describe('runNonBlocking', () => {
    it('should execute operation without blocking', async () => {
      let executed = false;
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        executed = true;
      };

      // Should return immediately
      runNonBlocking(operation);
      expect(executed).toBe(false);

      // Wait for operation to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(executed).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const operation = async () => {
        throw new Error('Operation failed');
      };

      runNonBlocking(operation);

      // Wait for error to be logged
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Non-blocking operation failed:')
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('logAsync', () => {
    it('should log message asynchronously', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      logAsync('Test message', { key: 'value' });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message')
      );

      consoleInfoSpy.mockRestore();
    });

    it('should not block execution', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const startTime = Date.now();
      logAsync('Test message');
      const duration = Date.now() - startTime;

      // Should return immediately
      expect(duration).toBeLessThan(5);

      consoleLogSpy.mockRestore();
    });
  });

  describe('trackEventAsync', () => {
    it('should track event asynchronously', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      trackEventAsync('user_signup', { userId: '123', plan: 'premium' });

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Analytics event')
      );

      consoleInfoSpy.mockRestore();
    });

    it('should not block execution', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const startTime = Date.now();
      trackEventAsync('page_view');
      const duration = Date.now() - startTime;

      // Should return immediately
      expect(duration).toBeLessThan(5);

      consoleLogSpy.mockRestore();
    });
  });

  describe('Performance patterns', () => {
    it('should demonstrate parallel vs sequential performance', async () => {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      // Sequential execution
      const sequentialStart = Date.now();
      await delay(20);
      await delay(20);
      await delay(20);
      const sequentialDuration = Date.now() - sequentialStart;

      // Parallel execution
      const parallelStart = Date.now();
      await fetchInParallel({
        task1: delay(20),
        task2: delay(20),
        task3: delay(20),
      });
      const parallelDuration = Date.now() - parallelStart;

      // Parallel should be significantly faster
      expect(parallelDuration).toBeLessThan(sequentialDuration / 2);
    });

    it('should handle mixed fast and slow operations', async () => {
      const result = await fetchInParallel({
        fast: Promise.resolve('immediate'),
        slow: new Promise(resolve => setTimeout(() => resolve('delayed'), 50)),
      });

      expect(result.fast).toBe('immediate');
      expect(result.slow).toBe('delayed');
    });
  });
});
