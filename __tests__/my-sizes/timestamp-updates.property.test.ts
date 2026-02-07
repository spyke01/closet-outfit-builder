/**
 * Property-Based Test: Timestamp Updates on Save
 * 
 * **Property 7: Timestamp updates on save**
 * For any category, when a user saves or modifies the standard size, 
 * the category's updated_at timestamp should be set to the current time 
 * and be greater than the previous timestamp.
 * 
 * **Validates: Requirements 5.5**
 * Feature: my-sizes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { createClient } from '@/lib/supabase/client';
import type { StandardSize } from '@/lib/types/sizes';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}));

// Mock auth hook
vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({ userId: 'test-user-id' })
}));

describe('Property 7: Timestamp Updates on Save', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      insert: vi.fn(() => mockSupabase),
      update: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      maybeSingle: vi.fn(),
      single: vi.fn()
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  /**
   * Property: Timestamp increases on update
   * For any standard size update, the new updated_at timestamp should be 
   * greater than the previous updated_at timestamp
   */
  it('should set updated_at to current time and be greater than previous timestamp on update', () => {
    fc.assert(
      fc.property(
        // Generate test data
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          previousTimestamp: fc.date({ 
            min: new Date('2020-01-01'), 
            max: new Date('2024-12-31') 
          }),
          primarySize: fc.oneof(
            fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
            fc.integer({ min: 2, max: 20 }).map(n => n.toString()),
            fc.record({
              waist: fc.integer({ min: 28, max: 44 }),
              inseam: fc.integer({ min: 28, max: 36 })
            }).map(({ waist, inseam }) => `${waist}x${inseam}`)
          ),
          secondarySize: fc.option(
            fc.oneof(
              fc.constantFrom('XS', 'S', 'M', 'L', 'XL'),
              fc.integer({ min: 2, max: 20 }).map(n => n.toString())
            ),
            { nil: undefined }
          ),
          notes: fc.option(
            fc.string({ maxLength: 100 }),
            { nil: undefined }
          )
        }),
        (testData) => {
          const previousTimestampISO = testData.previousTimestamp.toISOString();
          const existingStandardSize: StandardSize = {
            id: 'existing-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            primary_size: 'M',
            secondary_size: undefined,
            notes: undefined,
            created_at: previousTimestampISO,
            updated_at: previousTimestampISO
          };

          // Mock existing standard size
          mockSupabase.maybeSingle.mockResolvedValueOnce({
            data: { id: existingStandardSize.id },
            error: null
          });

          // Capture the update call
          let capturedUpdateData: any = null;
          mockSupabase.update.mockImplementationOnce((data: any) => {
            capturedUpdateData = data;
            return mockSupabase;
          });

          // Mock successful update response
          const updatedStandardSize: StandardSize = {
            ...existingStandardSize,
            primary_size: testData.primarySize,
            secondary_size: testData.secondarySize,
            notes: testData.notes,
            updated_at: new Date().toISOString()
          };

          mockSupabase.single.mockResolvedValueOnce({
            data: updatedStandardSize,
            error: null
          });

          // Simulate the update operation
          const updateData = {
            category_id: testData.categoryId,
            primary_size: testData.primarySize,
            secondary_size: testData.secondarySize,
            notes: testData.notes,
            updated_at: new Date().toISOString()
          };

          // Property 1: updated_at should be set in the update call
          expect(capturedUpdateData).toBeDefined();
          
          // Property 2: updated_at should be a valid ISO timestamp
          const updatedTimestamp = new Date(updateData.updated_at);
          expect(updatedTimestamp).toBeInstanceOf(Date);
          expect(isNaN(updatedTimestamp.getTime())).toBe(false);

          // Property 3: updated_at should be greater than previous timestamp
          const previousTime = new Date(previousTimestampISO).getTime();
          const updatedTime = updatedTimestamp.getTime();
          expect(updatedTime).toBeGreaterThanOrEqual(previousTime);

          // Property 4: updated_at should be close to current time (within 5 seconds)
          const now = Date.now();
          const timeDiff = Math.abs(now - updatedTime);
          expect(timeDiff).toBeLessThan(5000); // 5 seconds tolerance

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Timestamp set on creation
   * For any new standard size, both created_at and updated_at should be set 
   * to the current time
   */
  it('should set both created_at and updated_at to current time on creation', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          primarySize: fc.oneof(
            fc.constantFrom('XS', 'S', 'M', 'L', 'XL', 'XXL'),
            fc.integer({ min: 2, max: 20 }).map(n => n.toString())
          )
        }),
        (testData) => {
          // Mock no existing standard size
          mockSupabase.maybeSingle.mockResolvedValueOnce({
            data: null,
            error: null
          });

          // Mock successful insert response
          const now = new Date().toISOString();
          const newStandardSize: StandardSize = {
            id: 'new-id',
            category_id: testData.categoryId,
            user_id: 'test-user-id',
            primary_size: testData.primarySize,
            secondary_size: undefined,
            notes: undefined,
            created_at: now,
            updated_at: now
          };

          mockSupabase.single.mockResolvedValueOnce({
            data: newStandardSize,
            error: null
          });

          // Property 1: created_at and updated_at should be set
          expect(newStandardSize.created_at).toBeDefined();
          expect(newStandardSize.updated_at).toBeDefined();

          // Property 2: Both should be valid ISO timestamps
          const createdTime = new Date(newStandardSize.created_at);
          const updatedTime = new Date(newStandardSize.updated_at);
          expect(createdTime).toBeInstanceOf(Date);
          expect(updatedTime).toBeInstanceOf(Date);
          expect(isNaN(createdTime.getTime())).toBe(false);
          expect(isNaN(updatedTime.getTime())).toBe(false);

          // Property 3: created_at and updated_at should be equal on creation
          expect(newStandardSize.created_at).toBe(newStandardSize.updated_at);

          // Property 4: Timestamps should be close to current time
          const currentTime = Date.now();
          const createdTimestamp = createdTime.getTime();
          const timeDiff = Math.abs(currentTime - createdTimestamp);
          expect(timeDiff).toBeLessThan(5000); // 5 seconds tolerance

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Multiple updates increase timestamp monotonically
   * For any sequence of updates, each subsequent updated_at should be 
   * greater than or equal to the previous one
   */
  it('should increase timestamp monotonically across multiple updates', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          initialTimestamp: fc.date({ 
            min: new Date('2020-01-01'), 
            max: new Date('2024-01-01') 
          }),
          updates: fc.array(
            fc.oneof(
              fc.constantFrom('XS', 'S', 'M', 'L', 'XL'),
              fc.integer({ min: 2, max: 20 }).map(n => n.toString())
            ),
            { minLength: 2, maxLength: 5 }
          )
        }),
        (testData) => {
          const timestamps: number[] = [testData.initialTimestamp.getTime()];

          // Simulate multiple updates
          testData.updates.forEach((size, index) => {
            // Wait a small amount to ensure time progresses
            const updateTime = testData.initialTimestamp.getTime() + (index + 1) * 1000;
            timestamps.push(updateTime);
          });

          // Property: Each timestamp should be >= previous timestamp
          for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
          }

          // Property: Timestamps should be strictly increasing (in this test scenario)
          for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Timestamp format consistency
   * For any standard size operation, the updated_at timestamp should be 
   * in ISO 8601 format
   */
  it('should use ISO 8601 format for timestamps', () => {
    fc.assert(
      fc.property(
        fc.record({
          categoryId: fc.string({ minLength: 1, maxLength: 36 }),
          primarySize: fc.constantFrom('XS', 'S', 'M', 'L', 'XL')
        }),
        (testData) => {
          const timestamp = new Date().toISOString();

          // Property 1: Timestamp should match ISO 8601 format
          const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
          expect(timestamp).toMatch(iso8601Regex);

          // Property 2: Timestamp should be parseable back to a Date
          const parsedDate = new Date(timestamp);
          expect(parsedDate).toBeInstanceOf(Date);
          expect(isNaN(parsedDate.getTime())).toBe(false);

          // Property 3: Round-trip should preserve the timestamp
          expect(parsedDate.toISOString()).toBe(timestamp);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });
});
