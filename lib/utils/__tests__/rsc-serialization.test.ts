import { describe, it, expect } from 'vitest';
import { pickFields, pickFieldsFromArray, prepareForClient } from '../rsc-serialization';

describe('RSC Serialization Utilities', () => {
  describe('pickFields', () => {
    it('should pick only specified fields', () => {
      const user = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret',
        internal_notes: 'VIP customer',
        created_at: '2024-01-01',
      };

      const result = pickFields(user, ['id', 'name', 'email']);

      expect(result).toEqual({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('internal_notes');
    });

    it('should handle missing fields gracefully', () => {
      const user = {
        id: '123',
        name: 'John Doe',
      };

      const result = pickFields(user, ['id', 'name', 'email' as never]);

      expect(result).toEqual({
        id: '123',
        name: 'John Doe',
      });
    });
  });

  describe('pickFieldsFromArray', () => {
    it('should pick fields from array of objects', () => {
      const items = [
        { id: '1', name: 'Item 1', description: 'Long description', price: 100 },
        { id: '2', name: 'Item 2', description: 'Another long description', price: 200 },
      ];

      const result = pickFieldsFromArray(items, ['id', 'name']);

      expect(result).toEqual([
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ]);
      expect(result[0]).not.toHaveProperty('description');
      expect(result[0]).not.toHaveProperty('price');
    });

    it('should handle empty arrays', () => {
      const result = pickFieldsFromArray([], ['id', 'name']);
      expect(result).toEqual([]);
    });
  });

  describe('prepareForClient', () => {
    it('should remove sensitive server-only fields', () => {
      const data = {
        id: '123',
        name: 'John Doe',
        password: 'secret',
        password_hash: 'hashed',
        internal_notes: 'VIP',
      };

      const result = prepareForClient(data);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('internal_notes');
    });

    it('should handle non-object data', () => {
      expect(prepareForClient('string')).toBe('string');
      expect(prepareForClient(123)).toBe(123);
      expect(prepareForClient(null)).toBe(null);
    });
  });

  describe('RSC optimization patterns', () => {
    it('should demonstrate minimal serialization', () => {
      // Simulate a large user object with many fields
      const fullUser = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
        bio: 'Long bio text...',
        preferences: { theme: 'dark', language: 'en' },
        metadata: { lastLogin: '2024-01-01', loginCount: 42 },
        internalData: { notes: 'VIP', tags: ['premium'] },
      };

      // Only pass what's needed for the UI
      const minimalUser = pickFields(fullUser, ['id', 'name', 'avatar']);

      // Verify we're only serializing what's needed
      expect(Object.keys(minimalUser)).toHaveLength(3);
      expect(minimalUser).toEqual({
        id: '123',
        name: 'John Doe',
        avatar: 'https://example.com/avatar.jpg',
      });
    });

    it('should demonstrate ID-only pattern', () => {
      const items = [
        { id: '1', name: 'Item 1', data: 'large data blob' },
        { id: '2', name: 'Item 2', data: 'another large data blob' },
      ];

      // Pass only IDs, let client fetch full data
      const itemIds = items.map(item => item.id);

      expect(itemIds).toEqual(['1', '2']);
      expect(itemIds).toHaveLength(2);
    });
  });
});
