/**
 * Integration Test for Seed Categories API
 * 
 * This test verifies the API route works correctly with the database.
 * It requires a running Supabase instance with the seed_system_categories function.
 * 
 * To run: npm run test -- app/api/sizes/seed-categories/__tests__/integration.test.ts
 * 
 * Note: This test is skipped by default. Remove .skip to run with a real database.
 */

import { describe, it, expect } from 'vitest';

describe.skip('Seed Categories API Integration', () => {
  it('should seed categories via API endpoint', async () => {
    // This test requires:
    // 1. A running Supabase instance
    // 2. Valid authentication token
    // 3. The seed_system_categories function deployed
    
    const response = await fetch('http://localhost:3000/api/sizes/seed-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication header here
        // 'Authorization': 'Bearer YOUR_TOKEN'
      },
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBeGreaterThan(0);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should be idempotent when called multiple times', async () => {
    // First call
    const response1 = await fetch('http://localhost:3000/api/sizes/seed-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication header here
      },
    });

    const data1 = await response1.json();

    // Second call
    const response2 = await fetch('http://localhost:3000/api/sizes/seed-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication header here
      },
    });

    const data2 = await response2.json();

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(data1.count).toBe(data2.count);
  });

  it('should return 401 for unauthenticated requests', async () => {
    const response = await fetch('http://localhost:3000/api/sizes/seed-categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });
});
