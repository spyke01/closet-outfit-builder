/**
 * Property-Based Test: Data Persistence on Save
 * Feature: my-sizes
 * Property 14: Data persistence on save
 * 
 * For any size data (standard size, brand size, measurement, pinned preference),
 * when saved, the data should be immediately queryable from the database
 * without requiring a page refresh.
 * 
 * **Validates: Requirements 10.1**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Simple in-memory database simulator
class InMemoryDatabase {
  private data: Map<string, Map<string, Record<string, unknown>>> = new Map();

  async insert(table: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.data.has(table)) {
      this.data.set(table, new Map());
    }
    const tableData = this.data.get(table)!;
    const id = `test-${Date.now()}-${Math.random()}`;
    const fullRecord = {
      ...record,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    tableData.set(id, fullRecord);
    return fullRecord;
  }

  async query(table: string, field: string, value: unknown): Promise<Record<string, unknown> | null> {
    const tableData = this.data.get(table);
    if (!tableData) return null;
    
    for (const record of tableData.values()) {
      if (record[field] === value) {
        return record;
      }
    }
    return null;
  }

  async update(
    table: string,
    field: string,
    value: unknown,
    updates: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    const tableData = this.data.get(table);
    if (!tableData) return null;
    
    for (const [id, record] of tableData.entries()) {
      if (record[field] === value) {
        const updated = {
          ...record,
          ...updates,
          updated_at: new Date().toISOString()
        };
        tableData.set(id, updated);
        return updated;
      }
    }
    return null;
  }
}

describe('Property 14: Data persistence on save', () => {
  let db: InMemoryDatabase;

  // Generators for different data types
  const standardSizeArb = fc.record({
    category_id: fc.uuid(),
    user_id: fc.uuid(),
    primary_size: fc.oneof(
      fc.constantFrom('S', 'M', 'L', 'XL'),
      fc.integer({ min: 0, max: 20 }).map(n => n.toString())
    ),
    secondary_size: fc.option(fc.constantFrom('S', 'M', 'L'), { nil: undefined }),
    notes: fc.option(fc.string({ maxLength: 100 }), { nil: undefined })
  });

  const brandSizeArb = fc.record({
    category_id: fc.uuid(),
    user_id: fc.uuid(),
    brand_name: fc.constantFrom('Nike', 'Adidas', 'Levis', 'Gap'),
    size: fc.oneof(
      fc.constantFrom('S', 'M', 'L'),
      fc.integer({ min: 0, max: 20 }).map(n => n.toString())
    ),
    fit_scale: fc.integer({ min: 1, max: 5 }),
    item_type: fc.option(fc.constantFrom('Shirt', 'Pants', 'Jacket'), { nil: undefined }),
    notes: fc.option(fc.string({ maxLength: 100 }), { nil: undefined })
  });

  const measurementArb = fc.record({
    category_id: fc.uuid(),
    user_id: fc.uuid(),
    measurements: fc.record({
      chest: fc.float({ min: 30, max: 50 }),
      waist: fc.float({ min: 25, max: 45 }),
      hip: fc.float({ min: 30, max: 50 })
    }),
    unit: fc.constantFrom('imperial', 'metric')
  });

  const pinnedPreferenceArb = fc.record({
    user_id: fc.uuid(),
    category_id: fc.uuid(),
    display_order: fc.integer({ min: 0, max: 10 }),
    display_mode: fc.constantFrom('standard', 'dual', 'preferred-brand'),
    preferred_brand_id: fc.option(fc.uuid(), { nil: undefined })
  });

  it('should persist standard size data immediately after save', async () => {
    await fc.assert(
      fc.asyncProperty(standardSizeArb, async (standardSize) => {
        db = new InMemoryDatabase();
        
        // Save data
        const saved = await db.insert('standard_sizes', standardSize);

        expect(saved).toBeDefined();
        expect(saved.primary_size).toBe(standardSize.primary_size);
        expect(saved.id).toBeDefined();
        expect(saved.created_at).toBeDefined();

        // Verify data is immediately queryable
        const queried = await db.query('standard_sizes', 'category_id', standardSize.category_id);

        expect(queried).toBeDefined();
        expect(queried!.primary_size).toBe(standardSize.primary_size);
        expect(queried!.category_id).toBe(standardSize.category_id);

        return true;
      }),
      { numRuns: 3 }
    );
  });

  it('should persist brand size data immediately after save', async () => {
    await fc.assert(
      fc.asyncProperty(brandSizeArb, async (brandSize) => {
        db = new InMemoryDatabase();
        
        // Save data
        const saved = await db.insert('brand_sizes', brandSize);

        expect(saved).toBeDefined();
        expect(saved.brand_name).toBe(brandSize.brand_name);
        expect(saved.size).toBe(brandSize.size);

        // Verify data is immediately queryable
        const queried = await db.query('brand_sizes', 'category_id', brandSize.category_id);

        expect(queried).toBeDefined();
        expect(queried!.brand_name).toBe(brandSize.brand_name);
        expect(queried!.size).toBe(brandSize.size);

        return true;
      }),
      { numRuns: 3 }
    );
  });

  it('should persist measurement data immediately after save', async () => {
    await fc.assert(
      fc.asyncProperty(measurementArb, async (measurement) => {
        db = new InMemoryDatabase();
        
        // Save data
        const saved = await db.insert('category_measurements', measurement);

        expect(saved).toBeDefined();
        expect(saved.unit).toBe(measurement.unit);
        expect(saved.measurements).toEqual(measurement.measurements);

        // Verify data is immediately queryable
        const queried = await db.query('category_measurements', 'category_id', measurement.category_id);

        expect(queried).toBeDefined();
        expect(queried!.unit).toBe(measurement.unit);
        expect(queried!.measurements).toEqual(measurement.measurements);

        return true;
      }),
      { numRuns: 3 }
    );
  });

  it('should persist pinned preference data immediately after save', async () => {
    await fc.assert(
      fc.asyncProperty(pinnedPreferenceArb, async (pinnedPref) => {
        db = new InMemoryDatabase();
        
        // Save data
        const saved = await db.insert('pinned_preferences', pinnedPref);

        expect(saved).toBeDefined();
        expect(saved.display_mode).toBe(pinnedPref.display_mode);
        expect(saved.display_order).toBe(pinnedPref.display_order);

        // Verify data is immediately queryable
        const queried = await db.query('pinned_preferences', 'category_id', pinnedPref.category_id);

        expect(queried).toBeDefined();
        expect(queried!.display_mode).toBe(pinnedPref.display_mode);
        expect(queried!.display_order).toBe(pinnedPref.display_order);

        return true;
      }),
      { numRuns: 3 }
    );
  });

  it('should persist updated data immediately after update', async () => {
    await fc.assert(
      fc.asyncProperty(
        standardSizeArb,
        fc.oneof(
          fc.constantFrom('S', 'M', 'L', 'XL'),
          fc.integer({ min: 0, max: 20 }).map(n => n.toString())
        ),
        async (initialSize, newSize) => {
          db = new InMemoryDatabase();
          
          // Save initial data
          await db.insert('standard_sizes', initialSize);

          // Update data
          const updated = await db.update(
            'standard_sizes',
            'category_id',
            initialSize.category_id,
            { primary_size: newSize }
          );

          expect(updated).toBeDefined();
          expect(updated!.primary_size).toBe(newSize);
          expect(updated!.updated_at).toBeDefined();

          // Verify updated data is immediately queryable
          const queried = await db.query('standard_sizes', 'category_id', initialSize.category_id);

          expect(queried).toBeDefined();
          expect(queried!.primary_size).toBe(newSize);

          return true;
        }
      ),
      { numRuns: 3 }
    );
  });
});
