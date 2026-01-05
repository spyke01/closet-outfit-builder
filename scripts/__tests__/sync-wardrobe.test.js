import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import fs from 'fs';
import path from 'path';
import { SecureLogger, DataLoader, DataValidator, DatabaseSync, ValidationError, FileSystemError, DatabaseError, ConfigurationError } from '../sync-wardrobe.js';

describe('Wardrobe Sync Script - Property Tests', () => {
  let logger;
  let dataLoader;
  let dataValidator;

  beforeEach(() => {
    // Mock console methods to capture output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    logger = new SecureLogger(false);
    dataLoader = new DataLoader(logger);
    dataValidator = new DataValidator(logger);
  });

  describe('Property 1: Data Structure Validation', () => {
    /**
     * **Feature: wardrobe-sync-script, Property 1: Data Structure Validation**
     * **Validates: Requirements 1.1, 6.4**
     * 
     * For any wardrobe item or outfit data, the validation function should correctly identify 
     * valid structures and reject invalid ones based on required fields and data types
     */
    it('should validate wardrobe data structure correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            hasItems: fc.boolean(),
            itemsIsArray: fc.boolean(),
            isObject: fc.boolean(),
            itemCount: fc.integer({ min: 0, max: 10 })
          }),
          ({ hasItems, itemsIsArray, isObject, itemCount }) => {
            // Create test data based on the property parameters
            let testData;
            
            if (!isObject) {
              testData = "not an object";
            } else if (!hasItems) {
              testData = { someOtherField: "value" };
            } else if (!itemsIsArray) {
              testData = { items: "not an array" };
            } else {
              // Valid structure
              testData = { 
                items: Array(itemCount).fill(null).map((_, i) => ({ id: `item-${i}` }))
              };
            }

            // Create temporary file with test data
            const tempFile = path.join(process.cwd(), `test-wardrobe-${Date.now()}-${Math.random()}.json`);
            
            try {
              fs.writeFileSync(tempFile, JSON.stringify(testData));
              
              if (isObject && hasItems && itemsIsArray) {
                // Should succeed for valid structure
                const result = dataLoader.loadWardrobeData(tempFile);
                expect(result).toBeDefined();
                expect(Array.isArray(result.items)).toBe(true);
                expect(result.items.length).toBe(itemCount);
              } else {
                // Should throw ValidationError for invalid structure
                expect(() => dataLoader.loadWardrobeData(tempFile)).toThrow(ValidationError);
              }
            } finally {
              // Clean up temp file
              if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should validate outfit data structure correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            hasOutfits: fc.boolean(),
            outfitsIsArray: fc.boolean(),
            isObject: fc.boolean(),
            outfitCount: fc.integer({ min: 0, max: 10 })
          }),
          ({ hasOutfits, outfitsIsArray, isObject, outfitCount }) => {
            // Create test data based on the property parameters
            let testData;
            
            if (!isObject) {
              testData = "not an object";
            } else if (!hasOutfits) {
              testData = { someOtherField: "value" };
            } else if (!outfitsIsArray) {
              testData = { outfits: "not an array" };
            } else {
              // Valid structure
              testData = { 
                outfits: Array(outfitCount).fill(null).map((_, i) => ({ id: `outfit-${i}` }))
              };
            }

            // Create temporary file with test data
            const tempFile = path.join(process.cwd(), `test-outfits-${Date.now()}-${Math.random()}.json`);
            
            try {
              fs.writeFileSync(tempFile, JSON.stringify(testData));
              
              if (isObject && hasOutfits && outfitsIsArray) {
                // Should succeed for valid structure
                const result = dataLoader.loadOutfitData(tempFile);
                expect(result).toBeDefined();
                expect(Array.isArray(result.outfits)).toBe(true);
                expect(result.outfits.length).toBe(outfitCount);
              } else {
                // Should throw ValidationError for invalid structure
                expect(() => dataLoader.loadOutfitData(tempFile)).toThrow(ValidationError);
              }
            } finally {
              // Clean up temp file
              if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle invalid JSON gracefully', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            try {
              JSON.parse(s);
              return false; // Skip valid JSON strings
            } catch {
              return true; // Keep invalid JSON strings
            }
          }),
          (invalidJson) => {
            // Create temporary file with invalid JSON
            const tempFile = path.join(process.cwd(), `test-invalid-${Date.now()}-${Math.random()}.json`);
            
            try {
              fs.writeFileSync(tempFile, invalidJson);
              
              // Should throw ValidationError for invalid JSON
              expect(() => dataLoader.loadWardrobeData(tempFile)).toThrow(ValidationError);
              expect(() => dataLoader.loadOutfitData(tempFile)).toThrow(ValidationError);
            } finally {
              // Clean up temp file
              if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle missing files correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).map(s => 
            `nonexistent-${s.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}.json`
          ),
          (nonexistentFile) => {
            // Ensure file doesn't exist
            const fullPath = path.join(process.cwd(), nonexistentFile);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
            
            // Should throw FileSystemError for missing files
            expect(() => dataLoader.loadWardrobeData(fullPath)).toThrow(FileSystemError);
            expect(() => dataLoader.loadOutfitData(fullPath)).toThrow(FileSystemError);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 3: Reference Integrity', () => {
    /**
     * **Feature: wardrobe-sync-script, Property 3: Reference Integrity**
     * **Validates: Requirements 1.3**
     * 
     * For any outfit data, all referenced wardrobe item IDs should exist in the provided 
     * wardrobe data, and invalid references should be properly identified
     */
    it('should validate outfit item references correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            validItemCount: fc.integer({ min: 1, max: 10 }),
            outfitItemCount: fc.integer({ min: 1, max: 5 }),
            includeInvalidRefs: fc.boolean(),
            invalidRefCount: fc.integer({ min: 1, max: 3 })
          }),
          ({ validItemCount, outfitItemCount, includeInvalidRefs, invalidRefCount }) => {
            // Create valid wardrobe items
            const wardrobeItems = Array(validItemCount).fill(null).map((_, i) => ({
              id: `item-${i}`,
              name: `Item ${i}`,
              category: 'Shirt'
            }));

            // Create outfit with references
            const validRefs = wardrobeItems.slice(0, Math.min(outfitItemCount, validItemCount))
              .map(item => item.id);
            
            let outfitItems = [...validRefs];
            
            if (includeInvalidRefs && invalidRefCount > 0) {
              // Add some invalid references
              const invalidRefs = Array(invalidRefCount).fill(null).map((_, i) => `invalid-${i}`);
              outfitItems = [...outfitItems, ...invalidRefs];
            }

            const outfit = {
              id: 'test-outfit',
              items: outfitItems
            };

            const result = dataValidator.validateOutfit(outfit, wardrobeItems);

            if (includeInvalidRefs && invalidRefCount > 0) {
              // Should be invalid due to invalid references
              expect(result.isValid).toBe(false);
              expect(result.errors.some(error => error.includes('non-existent items'))).toBe(true);
            } else {
              // Should be valid with all valid references
              expect(result.isValid).toBe(true);
              expect(result.errors).toHaveLength(0);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 4: Color Extraction Consistency', () => {
    /**
     * **Feature: wardrobe-sync-script, Property 4: Color Extraction Consistency**
     * **Validates: Requirements 1.4**
     * 
     * For any item name, the color extraction function should produce consistent results 
     * and handle edge cases (no color, multiple colors, special characters) appropriately
     */
    it('should extract colors consistently from item names', () => {
      fc.assert(
        fc.property(
          fc.record({
            colorName: fc.constantFrom('navy', 'black', 'white', 'grey', 'khaki', 'brown', 'tan'),
            prefix: fc.string({ maxLength: 10 }),
            suffix: fc.string({ maxLength: 10 }),
            caseVariation: fc.constantFrom('lower', 'upper', 'mixed')
          }),
          ({ colorName, prefix, suffix, caseVariation }) => {
            // Create item name with color
            let itemName = `${prefix} ${colorName} ${suffix}`.trim();
            
            // Apply case variation
            if (caseVariation === 'upper') {
              itemName = itemName.toUpperCase();
            } else if (caseVariation === 'mixed') {
              itemName = itemName.split('').map((char, i) => 
                i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
              ).join('');
            }

            const extractedColor1 = dataValidator.extractColor(itemName);
            const extractedColor2 = dataValidator.extractColor(itemName);

            // Property: Should be consistent across multiple calls
            expect(extractedColor1).toBe(extractedColor2);

            // Property: Should extract the expected color (case-insensitive)
            if (itemName.toLowerCase().includes(colorName.toLowerCase())) {
              expect(extractedColor1).toBeTruthy();
              expect(extractedColor1.toLowerCase()).toContain(colorName.toLowerCase());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases in color extraction', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant(null),
            fc.constant(undefined),
            fc.string().filter(s => !s.toLowerCase().match(/navy|black|white|grey|gray|khaki|brown|tan|blue|olive|charcoal|cream|beige/))
          ),
          (input) => {
            const result = dataValidator.extractColor(input);

            // Property: Should handle invalid inputs gracefully
            expect(() => dataValidator.extractColor(input)).not.toThrow();

            // Property: Should return null for empty/invalid inputs or strings without colors
            if (!input || typeof input !== 'string' || input.trim() === '') {
              expect(result).toBeNull();
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 5: Season Mapping Consistency', () => {
    /**
     * **Feature: wardrobe-sync-script, Property 5: Season Mapping Consistency**
     * **Validates: Requirements 1.5**
     * 
     * For any set of capsule tags, the season mapping function should produce consistent 
     * and correct seasonal classifications
     */
    it('should map seasons consistently from capsule tags', () => {
      fc.assert(
        fc.property(
          fc.record({
            capsuleTags: fc.array(
              fc.constantFrom('Refined', 'Crossover', 'Adventurer', 'Shorts', 'Winter', 'Summer', 'Spring', 'Fall'),
              { minLength: 0, maxLength: 5 }
            ),
            caseVariation: fc.boolean()
          }),
          ({ capsuleTags, caseVariation }) => {
            // Apply case variation if requested
            const tags = caseVariation 
              ? capsuleTags.map(tag => Math.random() > 0.5 ? tag.toLowerCase() : tag.toUpperCase())
              : capsuleTags;

            const seasons1 = dataValidator.mapSeason(tags);
            const seasons2 = dataValidator.mapSeason(tags);

            // Property: Should be consistent across multiple calls
            expect(seasons1).toEqual(seasons2);

            // Property: Should always return an array
            expect(Array.isArray(seasons1)).toBe(true);

            // Property: Should contain valid season names
            const validSeasons = ['Spring', 'Summer', 'Fall', 'Winter'];
            seasons1.forEach(season => {
              expect(validSeasons).toContain(season);
            });

            // Property: Should not contain duplicates
            expect(seasons1.length).toBe(new Set(seasons1).size);

            // Property: Should map specific tags correctly
            const lowerTags = tags.map(tag => tag.toLowerCase());
            if (lowerTags.includes('shorts') || lowerTags.includes('summer')) {
              expect(seasons1).toContain('Summer');
            }
            if (lowerTags.includes('winter')) {
              expect(seasons1).toContain('Winter');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle invalid inputs gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.string(),
            fc.integer(),
            fc.boolean()
          ),
          (input) => {
            const result = dataValidator.mapSeason(input);

            // Property: Should not throw errors
            expect(() => dataValidator.mapSeason(input)).not.toThrow();

            // Property: Should always return an array
            expect(Array.isArray(result)).toBe(true);

            // Property: Should return empty array for non-array inputs
            if (!Array.isArray(input)) {
              expect(result).toEqual([]);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 9: Secure Logging', () => {
    /**
     * **Feature: wardrobe-sync-script, Property 9: Secure Logging**
     * **Validates: Requirements 6.3, 7.4**
     * 
     * For any log message or error output, sensitive information (API keys, passwords, tokens) 
     * should never be exposed in the logged content
     */
    it('should sanitize known sensitive patterns', () => {
      fc.assert(
        fc.property(
          fc.record({
            prefix: fc.string(),
            suffix: fc.string(),
            sensitiveType: fc.constantFrom('email', 'uuid', 'service_key', 'password', 'token'),
            sensitiveValue: fc.string({ minLength: 10, maxLength: 50 })
          }),
          ({ prefix, suffix, sensitiveType, sensitiveValue }) => {
            let message;
            
            // Create realistic sensitive patterns
            switch (sensitiveType) {
              case 'email':
                // Create a realistic email pattern
                message = `${prefix} user@example.com ${suffix}`;
                break;
              case 'uuid':
                // Create a realistic UUID pattern
                message = `${prefix} 12345678-1234-1234-1234-123456789012 ${suffix}`;
                break;
              case 'service_key':
                // Create a realistic service key pattern
                message = `${prefix} sk_${sensitiveValue.replace(/[^a-zA-Z0-9_-]/g, 'x')} ${suffix}`;
                break;
              case 'password':
                // Create a realistic password field pattern
                message = `${prefix} "password": "${sensitiveValue.replace(/[^a-zA-Z0-9!@#$%^&*()_+-=]/g, 'x')}" ${suffix}`;
                break;
              case 'token':
                // Create a realistic token field pattern
                message = `${prefix} "token": "${sensitiveValue.replace(/[^a-zA-Z0-9_-]/g, 'x')}" ${suffix}`;
                break;
            }
            
            const sanitized = logger.sanitize(message);
            
            // Property: Should contain redaction marker
            expect(sanitized).toContain('[REDACTED]');
            
            // Property: Should not contain the original sensitive value
            if (sensitiveType === 'email') {
              expect(sanitized).not.toContain('user@example.com');
            } else if (sensitiveType === 'uuid') {
              expect(sanitized).not.toContain('12345678-1234-1234-1234-123456789012');
            }
            
            // Property: Should preserve non-sensitive parts
            if (prefix.trim() && !prefix.includes('[REDACTED]')) {
              expect(sanitized).toContain(prefix);
            }
            if (suffix.trim() && !suffix.includes('[REDACTED]')) {
              expect(sanitized).toContain(suffix);
            }
            
            // Property: Should always return a string
            expect(typeof sanitized).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle non-string inputs safely', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.object(),
            fc.array(fc.anything()),
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined)
          ),
          (input) => {
            const result = logger.sanitize(input);
            
            // Property: Should always return a string
            expect(typeof result).toBe('string');
            
            // Property: Should not throw errors
            expect(() => logger.sanitize(input)).not.toThrow();
            
            // Property: Should handle null/undefined gracefully
            if (input === null) {
              expect(result).toBe('null');
            }
            if (input === undefined) {
              expect(result).toBe('undefined');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve safe content while redacting sensitive content', () => {
      fc.assert(
        fc.property(
          fc.record({
            safeContent: fc.string().filter(s => 
              !s.includes('@') && 
              !s.includes('sk_') && 
              !s.includes('password') &&
              !s.includes('token') &&
              s.length > 0
            ),
            sensitiveContent: fc.constantFrom(
              'user@example.com',
              'sk_1234567890abcdef',
              '"password": "secret123"',
              '"token": "abc123def456"'
            )
          }),
          ({ safeContent, sensitiveContent }) => {
            const message = `${safeContent} ${sensitiveContent}`;
            const sanitized = logger.sanitize(message);
            
            // Property: Safe content should be preserved
            expect(sanitized).toContain(safeContent);
            
            // Property: Sensitive content should be redacted
            expect(sanitized).toContain('[REDACTED]');
            expect(sanitized).not.toContain(sensitiveContent);
            
            // Property: Result should be a non-empty string
            expect(sanitized.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: File System Validation', () => {
    /**
     * **Feature: wardrobe-sync-script, Property 2: File System Validation**
     * **Validates: Requirements 1.2, 5.1, 5.4**
     * 
     * For any image path referenced in wardrobe items, the validation should correctly identify 
     * existing files with supported extensions and handle missing or invalid files appropriately
     */
    it('should validate image file existence and extensions correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            itemCount: fc.integer({ min: 1, max: 10 }),
            hasValidImages: fc.boolean(),
            hasMissingImages: fc.boolean(),
            hasUnsupportedExtensions: fc.boolean(),
            validExtension: fc.constantFrom('.png', '.jpg', '.jpeg', '.webp'),
            invalidExtension: fc.constantFrom('.gif', '.bmp', '.tiff', '.svg', '.txt')
          }),
          ({ itemCount, hasValidImages, hasMissingImages, hasUnsupportedExtensions, validExtension, invalidExtension }) => {
            // Create temporary directory for test images
            const tempDir = path.join(process.cwd(), `test-images-${Date.now()}-${Math.random()}`);
            
            try {
              fs.mkdirSync(tempDir, { recursive: true });
              
              const items = [];
              let expectedValidCount = 0;
              let expectedInvalidCount = 0;
              let expectedMissingCount = 0;
              let expectedUnsupportedCount = 0;
              
              for (let i = 0; i < itemCount; i++) {
                const item = {
                  id: `item-${i}`,
                  name: `Test Item ${i}`,
                  category: 'Shirt'
                };
                
                // Assign different test cases to different items
                if (i === 0 && hasValidImages) {
                  // Create a valid image file
                  const imageName = `valid-image-${i}${validExtension}`;
                  const imagePath = path.join(tempDir, imageName);
                  fs.writeFileSync(imagePath, 'fake image content');
                  item.image = imageName;
                  expectedValidCount++;
                } else if (i === 1 && hasMissingImages) {
                  // Reference a missing image
                  item.image = `missing-image-${i}${validExtension}`;
                  expectedInvalidCount++;
                  expectedMissingCount++;
                } else if (i === 2 && hasUnsupportedExtensions) {
                  // Create a file with unsupported extension
                  const imageName = `unsupported-image-${i}${invalidExtension}`;
                  const imagePath = path.join(tempDir, imageName);
                  fs.writeFileSync(imagePath, 'fake image content');
                  item.image = imageName;
                  expectedInvalidCount++;
                  expectedUnsupportedCount++;
                } else {
                  // Item without image (should be valid)
                  expectedValidCount++;
                }
                
                items.push(item);
              }
              
              const result = dataLoader.validateImageAssets(items, tempDir);
              
              // Property: Should correctly count valid and invalid items
              expect(result.validCount).toBe(expectedValidCount);
              expect(result.invalidCount).toBe(expectedInvalidCount);
              expect(result.totalItems).toBe(itemCount);
              
              // Property: Should identify missing images
              if (hasMissingImages && itemCount > 1) {
                expect(result.missingImages.length).toBe(expectedMissingCount);
                if (expectedMissingCount > 0) {
                  expect(result.missingImages[0].itemId).toBe('item-1');
                }
              }
              
              // Property: Should identify unsupported extensions
              if (hasUnsupportedExtensions && itemCount > 2) {
                expect(result.unsupportedExtensions.length).toBe(expectedUnsupportedCount);
                if (expectedUnsupportedCount > 0) {
                  expect(result.unsupportedExtensions[0].itemId).toBe('item-2');
                  expect(result.unsupportedExtensions[0].extension).toBe(invalidExtension);
                }
              }
              
              // Property: Should include supported extensions list
              expect(Array.isArray(result.supportedExtensions)).toBe(true);
              expect(result.supportedExtensions).toContain('.png');
              expect(result.supportedExtensions).toContain('.jpg');
              expect(result.supportedExtensions).toContain('.jpeg');
              expect(result.supportedExtensions).toContain('.webp');
              
            } finally {
              // Clean up temp directory
              if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle missing images gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            itemCount: fc.integer({ min: 1, max: 5 }),
            missingImageRatio: fc.float({ min: 0, max: 1 })
          }),
          ({ itemCount, missingImageRatio }) => {
            const items = [];
            const missingCount = Math.floor(itemCount * missingImageRatio);
            
            for (let i = 0; i < itemCount; i++) {
              const item = {
                id: `item-${i}`,
                name: `Test Item ${i}`,
                category: 'Shirt'
              };
              
              if (i < missingCount) {
                item.image = `missing-${i}.png`;
              }
              
              items.push(item);
            }
            
            // Create fake validation result
            const validationResult = {
              missingImages: items.slice(0, missingCount).map(item => ({
                itemId: item.id,
                imagePath: item.image
              })),
              unsupportedExtensions: []
            };
            
            const result = dataLoader.handleMissingImages(items, validationResult);
            
            // Property: Should set image to null for missing images
            for (let i = 0; i < missingCount; i++) {
              expect(result[i].image).toBeNull();
            }
            
            // Property: Should preserve image for items without missing images
            for (let i = missingCount; i < itemCount; i++) {
              expect(result[i].image).toBe(items[i].image);
            }
            
            // Property: Should preserve all other item properties
            result.forEach((resultItem, index) => {
              expect(resultItem.id).toBe(items[index].id);
              expect(resultItem.name).toBe(items[index].name);
              expect(resultItem.category).toBe(items[index].category);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 8: Image Path Formatting', () => {
    /**
     * **Feature: wardrobe-sync-script, Property 8: Image Path Formatting**
     * **Validates: Requirements 5.3**
     * 
     * For any processed wardrobe item with an image, the image_url should be formatted 
     * as a relative path starting with "/images/wardrobe/"
     */
    it('should format image paths correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            itemCount: fc.integer({ min: 1, max: 10 }),
            pathVariation: fc.constantFrom(
              'simple', // just filename
              'relative', // ./filename or ../filename
              'absolute', // /some/path/filename
              'windows', // windows-style paths
              'already_correct' // already starts with /images/wardrobe/
            ),
            filename: fc.string({ minLength: 1, maxLength: 20 }).map(s => 
              s.replace(/[^a-zA-Z0-9.-]/g, '') + '.png'
            ).filter(s => s.length > 4) // ensure we have at least ".png"
          }),
          ({ itemCount, pathVariation, filename }) => {
            const items = [];
            
            for (let i = 0; i < itemCount; i++) {
              const item = {
                id: `item-${i}`,
                name: `Test Item ${i}`,
                category: 'Shirt'
              };
              
              // Create different path variations
              switch (pathVariation) {
                case 'simple':
                  item.image = filename;
                  break;
                case 'relative':
                  item.image = `./wardrobe/${filename}`;
                  break;
                case 'absolute':
                  item.image = `/some/path/${filename}`;
                  break;
                case 'windows':
                  item.image = `wardrobe\\${filename}`;
                  break;
                case 'already_correct':
                  item.image = `/images/wardrobe/${filename}`;
                  break;
              }
              
              items.push(item);
            }
            
            const result = dataLoader.formatImagePaths(items);
            
            // Property: All items with images should have properly formatted paths
            result.forEach((item, index) => {
              if (item.image) {
                expect(item.image).toMatch(/^\/images\/wardrobe\/.+/);
                expect(item.image).not.toMatch(/\/\//); // No double slashes
                expect(item.image).not.toMatch(/\\/); // No backslashes
              }
              
              // Property: Should preserve all other item properties
              expect(item.id).toBe(items[index].id);
              expect(item.name).toBe(items[index].name);
              expect(item.category).toBe(items[index].category);
            });
            
            // Property: Items without images should remain unchanged
            result.forEach((item, index) => {
              if (!items[index].image) {
                expect(item.image).toBe(items[index].image);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases in path formatting', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant(null),
            fc.constant(undefined),
            fc.string().filter(s => s.trim() === ''), // whitespace only
            fc.constantFrom('/', '//', '\\', './', '../', '/images/', '/images/wardrobe/')
          ),
          (imagePath) => {
            const item = {
              id: 'test-item',
              name: 'Test Item',
              category: 'Shirt',
              image: imagePath
            };
            
            const result = dataLoader.formatImagePaths([item]);
            
            // Property: Should handle edge cases gracefully
            expect(() => dataLoader.formatImagePaths([item])).not.toThrow();
            
            // Property: Should return an array with same length
            expect(result).toHaveLength(1);
            
            // Property: Should preserve item structure
            expect(result[0].id).toBe(item.id);
            expect(result[0].name).toBe(item.name);
            expect(result[0].category).toBe(item.category);
            
            // Property: Should handle null/undefined/empty gracefully
            if (!imagePath || typeof imagePath !== 'string') {
              expect(result[0].image).toBe(imagePath);
            } else if (imagePath.trim() === '' && imagePath !== '') {
              // Whitespace-only strings get formatted
              expect(result[0].image).toMatch(/^\/images\/wardrobe\/.+/);
            } else if (imagePath === '') {
              expect(result[0].image).toBe(imagePath);
            } else if (imagePath === '/images/wardrobe/') {
              // Edge case: path ends with directory separator
              expect(result[0].image).toBe('/images/wardrobe/');
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

describe('Property 10: Summary Report Accuracy', () => {
  /**
   * **Feature: wardrobe-sync-script, Property 10: Summary Report Accuracy**
   * **Validates: Requirements 4.3, 7.3**
   * 
   * For any sync operation, the summary report should accurately reflect the actual 
   * number of items added, skipped, and errors encountered for each user
   */
  let logger;
  let mockSupabase;
  let databaseSync;
  let dataValidator;

  beforeEach(() => {
    // Mock console methods to capture output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    logger = new SecureLogger(false);
    dataValidator = new DataValidator(logger);

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn()
    };

    databaseSync = new DatabaseSync('https://test.supabase.co', 'test-key', logger);
    databaseSync.supabase = mockSupabase;
  });

  it('should accurately track items inserted, skipped, and errors', () => {
    fc.assert(
      fc.property(
        fc.record({
          totalItems: fc.integer({ min: 1, max: 20 }),
          duplicateRatio: fc.float({ min: 0, max: Math.fround(0.8) }),
          errorRatio: fc.float({ min: 0, max: Math.fround(0.3) }),
          userId: fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0)
        }),
        ({ totalItems, duplicateRatio, errorRatio, userId }) => {
          // Handle NaN values
          if (isNaN(duplicateRatio)) duplicateRatio = 0;
          if (isNaN(errorRatio)) errorRatio = 0;

          // Calculate expected counts
          const expectedDuplicates = Math.floor(totalItems * duplicateRatio);
          const expectedErrors = Math.floor((totalItems - expectedDuplicates) * errorRatio);
          const expectedInserted = totalItems - expectedDuplicates - expectedErrors;

          // Create test items
          const items = Array(totalItems).fill(null).map((_, i) => ({
            id: `item-${i}`,
            name: `Test Item ${i}`,
            category: 'Shirt'
          }));

          // Create existing items (for duplicates)
          const existingItems = items.slice(0, expectedDuplicates).map(item => ({
            ...item,
            id: `existing-${item.id}`
          }));

          // Create categories
          const categories = [
            { id: 'cat-1', name: 'Shirt' },
            { id: 'cat-2', name: 'Pants' }
          ];

          // Mock database operations - simplified to always succeed
          mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: existingItems, error: null })
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ 
                data: Array(Math.max(0, totalItems - expectedDuplicates)).fill(null).map((_, i) => ({ 
                  id: `db-item-${i}`, 
                  name: `Test Item ${i}` 
                })), 
                error: null 
              })
            })
          });

          // Execute the insertion
          return databaseSync.insertWardrobeItems(userId, items, categories, dataValidator)
            .then(result => {
              // Property: Total items should match input
              expect(result.totalItems).toBe(totalItems);

              // Property: Counts should add up to total
              expect(result.insertedCount + result.skippedCount + result.errorCount).toBe(totalItems);

              // Property: Skipped count should match duplicates
              expect(result.skippedCount).toBe(expectedDuplicates);

              // Property: Arrays should have correct lengths
              expect(result.inserted).toHaveLength(result.insertedCount);
              expect(result.skipped).toHaveLength(result.skippedCount);
              expect(result.errors).toHaveLength(result.errorCount);

              // Property: All counts should be non-negative
              expect(result.insertedCount).toBeGreaterThanOrEqual(0);
              expect(result.skippedCount).toBeGreaterThanOrEqual(0);
              expect(result.errorCount).toBeGreaterThanOrEqual(0);
            });
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should accurately track outfit insertion results', () => {
    fc.assert(
      fc.property(
        fc.record({
          outfitCount: fc.integer({ min: 1, max: 10 }),
          validItemRatio: fc.float({ min: Math.fround(0.5), max: Math.fround(1.0) }),
          userId: fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0)
        }),
        ({ outfitCount, validItemRatio, userId }) => {
          // Handle NaN values
          if (isNaN(validItemRatio)) validItemRatio = 1.0;

          // Create wardrobe items
          const wardrobeItems = [
            { id: 'item-1', name: 'Blue Shirt', category_id: 'cat-1' },
            { id: 'item-2', name: 'Black Pants', category_id: 'cat-2' },
            { id: 'item-3', name: 'Brown Shoes', category_id: 'cat-3' }
          ];

          // Create outfits with varying validity
          const outfits = Array(outfitCount).fill(null).map((_, i) => {
            const isValid = i < Math.floor(outfitCount * validItemRatio);
            return {
              id: `outfit-${i}`,
              name: `Test Outfit ${i}`,
              items: isValid ? ['Blue Shirt', 'Black Pants'] : ['Blue Shirt', 'Nonexistent Item'],
              tuck: 'Tucked',
              weight: 1,
              loved: false
            };
          });

          const expectedValid = Math.floor(outfitCount * validItemRatio);

          // Mock database operations - simplified
          let outfitInsertCount = 0;
          mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            insert: vi.fn().mockImplementation((data) => {
              if (Array.isArray(data) && data.length > 0 && data[0].user_id) {
                // Outfit insertion
                outfitInsertCount++;
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ 
                      data: { id: `outfit-db-${outfitInsertCount}`, name: data[0].name }, 
                      error: null 
                    })
                  })
                };
              } else {
                // Outfit items insertion
                return Promise.resolve({ data: [], error: null });
              }
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          });

          // Execute the insertion
          return databaseSync.insertOutfits(userId, outfits, wardrobeItems)
            .then(result => {
              // Property: Total outfits should match input
              expect(result.totalOutfits).toBe(outfitCount);

              // Property: Counts should add up correctly
              expect(result.insertedCount + result.skippedCount + result.errorCount).toBe(outfitCount);

              // Property: Arrays should have correct lengths
              expect(result.inserted).toHaveLength(result.insertedCount);
              expect(result.skipped).toHaveLength(result.skippedCount);
              expect(result.errors).toHaveLength(result.errorCount);

              // Property: All counts should be non-negative
              expect(result.insertedCount).toBeGreaterThanOrEqual(0);
              expect(result.skippedCount).toBeGreaterThanOrEqual(0);
              expect(result.errorCount).toBeGreaterThanOrEqual(0);

              // Property: Total should equal input
              expect(result.totalOutfits).toBe(outfitCount);
            });
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should maintain accuracy across multiple users', () => {
    fc.assert(
      fc.property(
        fc.record({
          userCount: fc.integer({ min: 1, max: 3 }),
          itemsPerUser: fc.integer({ min: 1, max: 5 })
        }),
        ({ userCount, itemsPerUser }) => {
          // Create multiple users
          const users = Array(userCount).fill(null).map((_, i) => ({
            id: `user-${i}`,
            email: `user${i}@example.com`
          }));

          // Mock consistent database behavior
          mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ 
                data: Array(itemsPerUser).fill(null).map((_, idx) => ({ 
                  id: `db-item-${idx}`, 
                  name: `Item ${idx}` 
                })), 
                error: null 
              })
            })
          });

          // Process each user sequentially
          const processUser = async (user, index) => {
            const items = Array(itemsPerUser).fill(null).map((_, i) => ({
              id: `user-${index}-item-${i}`,
              name: `User ${index} Item ${i}`,
              category: 'Shirt'
            }));

            const categories = [{ id: 'cat-1', name: 'Shirt' }];
            
            const result = await databaseSync.insertWardrobeItems(user.id, items, categories, dataValidator);
            return result;
          };

          // Process all users
          return Promise.all(users.map(processUser))
            .then(results => {
              // Property: Each user should have accurate individual results
              results.forEach((result, index) => {
                expect(result.totalItems).toBe(itemsPerUser);
                expect(result.insertedCount + result.skippedCount + result.errorCount).toBe(itemsPerUser);
              });

              // Property: Global totals should match sum of individual results
              const actualTotalInserted = results.reduce((sum, r) => sum + r.insertedCount, 0);
              const actualTotalSkipped = results.reduce((sum, r) => sum + r.skippedCount, 0);
              const actualTotalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);

              // Property: Total items processed should equal expected
              const totalItemsProcessed = actualTotalInserted + actualTotalSkipped + actualTotalErrors;
              expect(totalItemsProcessed).toBe(userCount * itemsPerUser);

              // Property: All counts should be non-negative
              expect(actualTotalInserted).toBeGreaterThanOrEqual(0);
              expect(actualTotalSkipped).toBeGreaterThanOrEqual(0);
              expect(actualTotalErrors).toBeGreaterThanOrEqual(0);
            });
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('DatabaseSync - Unit Tests', () => {
  let logger;
  let mockSupabase;
  let databaseSync;

  beforeEach(() => {
    // Mock console methods to capture output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    logger = new SecureLogger(false);

    // Create mock Supabase client
    mockSupabase = {
      auth: {
        admin: {
          getUserById: vi.fn(),
          listUsers: vi.fn()
        }
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    };

    // Create DatabaseSync instance with mocked Supabase client
    databaseSync = new DatabaseSync('https://fake-project.supabase.co', 'fake-key', logger);
    databaseSync.supabase = mockSupabase;
  });

  describe('Service Role Authentication', () => {
    it('should initialize with service role key', () => {
      expect(databaseSync).toBeDefined();
      expect(databaseSync.supabase).toBeDefined();
      expect(databaseSync.logger).toBe(logger);
    });

    it('should handle authentication errors gracefully', async () => {
      // Mock authentication failure
      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: null,
        error: { message: 'Invalid service role key' }
      });

      mockSupabase.auth.admin.listUsers.mockResolvedValue({
        data: null,
        error: { message: 'Invalid service role key' }
      });

      await expect(
        databaseSync.getTargetUsers(false)
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('User Targeting - Admin Only Mode', () => {
    it('should get admin user by ID when provided', async () => {
      const mockAdminUser = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com'
        }
      };

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: mockAdminUser,
        error: null
      });

      const result = await databaseSync.getTargetUsers(true, 'admin-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('admin-123');
      expect(result[0].email).toBe('admin@example.com');
      expect(mockSupabase.auth.admin.getUserById).toHaveBeenCalledWith('admin-123');
    });

    it('should fallback to email lookup when ID fails', async () => {
      const mockUsers = {
        users: [
          { id: 'user-1', email: 'user1@example.com' },
          { id: 'admin-123', email: 'admin@example.com' },
          { id: 'user-2', email: 'user2@example.com' }
        ]
      };

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      mockSupabase.auth.admin.listUsers.mockResolvedValue({
        data: mockUsers,
        error: null
      });

      const result = await databaseSync.getTargetUsers(true, 'invalid-id', 'admin@example.com');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('admin-123');
      expect(result[0].email).toBe('admin@example.com');
    });

    it('should throw ConfigurationError when admin user not found', async () => {
      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      mockSupabase.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null
      });

      await expect(
        databaseSync.getTargetUsers(true, 'invalid-id', 'nonexistent@example.com')
      ).rejects.toThrow(ConfigurationError);
    });
  });

  describe('User Targeting - All Users Mode', () => {
    it('should get all users when admin-only is false', async () => {
      const mockUsers = {
        users: [
          { id: 'user-1', email: 'user1@example.com' },
          { id: 'user-2', email: 'user2@example.com' },
          { id: 'user-3', email: 'user3@example.com' }
        ]
      };

      mockSupabase.auth.admin.listUsers.mockResolvedValue({
        data: mockUsers,
        error: null
      });

      const result = await databaseSync.getTargetUsers(false);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('user-1');
      expect(result[1].id).toBe('user-2');
      expect(result[2].id).toBe('user-3');
      expect(mockSupabase.auth.admin.listUsers).toHaveBeenCalled();
    });

    it('should handle empty user list', async () => {
      mockSupabase.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null
      });

      const result = await databaseSync.getTargetUsers(false);

      expect(result).toHaveLength(0);
    });

    it('should throw DatabaseError when listUsers fails', async () => {
      mockSupabase.auth.admin.listUsers.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      await expect(
        databaseSync.getTargetUsers(false)
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('Environment Variable Validation', () => {
    it('should validate required environment variables', () => {
      // Test that DatabaseSync requires valid URLs
      expect(() => new DatabaseSync('', '', logger)).toThrow();
      expect(() => new DatabaseSync(null, null, logger)).toThrow();
      expect(() => new DatabaseSync('https://valid.supabase.co', 'valid-key', logger)).not.toThrow();
    });
  });

  describe('Category Management', () => {
    it('should get existing categories for user', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Jacket', is_anchor_item: true, display_order: 1 },
        { id: 'cat-2', name: 'Shirt', is_anchor_item: false, display_order: 2 }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockCategories, error: null })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      const result = await databaseSync.getCategoriesForUser('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Jacket');
      expect(result[1].name).toBe('Shirt');
    });

    it('should create missing default categories', async () => {
      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ 
          data: [
            { id: 'cat-1', name: 'Jacket', is_anchor_item: true, display_order: 1 },
            { id: 'cat-2', name: 'Shirt', is_anchor_item: false, display_order: 2 }
          ], 
          error: null 
        })
      });

      // First call returns empty categories, second call returns all categories
      let callCount = 0;
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve({ data: [], error: null });
              } else {
                return Promise.resolve({ 
                  data: [
                    { id: 'cat-1', name: 'Jacket', is_anchor_item: true, display_order: 1 },
                    { id: 'cat-2', name: 'Shirt', is_anchor_item: false, display_order: 2 }
                  ], 
                  error: null 
                });
              }
            })
          })
        }),
        insert: insertSpy
      });

      const result = await databaseSync.getCategoriesForUser('user-123');

      expect(result).toHaveLength(2);
      expect(insertSpy).toHaveBeenCalled();
    });

    it('should map category names to IDs correctly', () => {
      const userCategories = [
        { id: 'cat-1', name: 'Jacket', is_anchor_item: true },
        { id: 'cat-2', name: 'Shirt', is_anchor_item: false },
        { id: 'cat-3', name: 'Pants', is_anchor_item: true }
      ];

      expect(databaseSync.mapCategoryNameToId('Jacket', userCategories)).toBe('cat-1');
      expect(databaseSync.mapCategoryNameToId('shirt', userCategories)).toBe('cat-2'); // case insensitive
      expect(databaseSync.mapCategoryNameToId('PANTS', userCategories)).toBe('cat-3'); // case insensitive
      expect(databaseSync.mapCategoryNameToId('NonExistent', userCategories)).toBeNull();
      expect(databaseSync.mapCategoryNameToId('', userCategories)).toBeNull();
      expect(databaseSync.mapCategoryNameToId(null, userCategories)).toBeNull();
    });
  });

  describe('Existing Data Retrieval', () => {
    it('should get existing wardrobe items for duplicate checking', async () => {
      const mockItems = [
        { 
          id: 'item-1', 
          name: 'Blue Shirt', 
          category_id: 'cat-1',
          categories: { name: 'Shirt' },
          brand: 'Brand A',
          active: true
        },
        { 
          id: 'item-2', 
          name: 'Black Pants', 
          category_id: 'cat-2',
          categories: { name: 'Pants' },
          brand: 'Brand B',
          active: true
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockItems, error: null }))
          }))
        }))
      });

      const result = await databaseSync.getExistingWardrobeItems('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Blue Shirt');
      expect(result[0].category).toBe('Shirt');
      expect(result[1].name).toBe('Black Pants');
      expect(result[1].category).toBe('Pants');
    });

    it('should get existing outfits for duplicate checking', async () => {
      const mockOutfits = [
        {
          id: 'outfit-1',
          name: 'Casual Look',
          tuck_style: 'Untucked',
          weight: 1,
          loved: false,
          source: 'curated',
          outfit_items: [
            { item_id: 'item-1', wardrobe_items: { name: 'Blue Shirt' } },
            { item_id: 'item-2', wardrobe_items: { name: 'Black Pants' } }
          ]
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockOutfits, error: null }))
        }))
      });

      const result = await databaseSync.getExistingOutfits('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Casual Look');
      expect(result[0].items).toEqual(['item-1', 'item-2']);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Connection timeout' } 
            }))
          }))
        }))
      });

      await expect(
        databaseSync.getCategoriesForUser('user-123')
      ).rejects.toThrow(DatabaseError);
    });

    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(
        databaseSync.getCategoriesForUser('user-123')
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('Property 6: Database Association Integrity', () => {
    /**
     * **Feature: wardrobe-sync-script, Property 6: Database Association Integrity**
     * **Validates: Requirements 2.4**
     * 
     * For any wardrobe item insertion, the item should be correctly associated with 
     * the specified user_id and appropriate category_id
     */
    it('should correctly associate wardrobe items with user and category', async () => {
      // Create a local dataValidator instance for this test
      const testDataValidator = new DataValidator(logger);
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            itemCount: fc.integer({ min: 1, max: 5 }),
            categoryCount: fc.integer({ min: 1, max: 7 })
          }),
          async ({ userId, itemCount, categoryCount }) => {
            // Create mock categories
            const categories = Array(categoryCount).fill(null).map((_, i) => ({
              id: `cat-${i}`,
              name: ['Jacket', 'Shirt', 'Pants', 'Shoes', 'Belt', 'Watch', 'Undershirt'][i] || `Category-${i}`,
              is_anchor_item: i % 2 === 0
            }));

            // Create mock wardrobe items
            const items = Array(itemCount).fill(null).map((_, i) => ({
              id: `item-${i}`,
              name: `Test Item ${i}`,
              category: categories[i % categories.length].name,
              brand: `Brand ${i}`,
              formalityScore: Math.floor(Math.random() * 10) + 1
            }));

            // Mock the database operations
            const insertedItems = [];
            mockSupabase.from.mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [], error: null }) // No existing items
                })
              }),
              insert: vi.fn().mockImplementation((dbItems) => {
                // Capture the inserted items for validation
                insertedItems.push(...dbItems);
                return {
                  select: vi.fn().mockResolvedValue({ 
                    data: dbItems.map((item, idx) => ({ ...item, id: `db-item-${idx}` })), 
                    error: null 
                  })
                };
              })
            });

            const result = await databaseSync.insertWardrobeItems(userId, items, categories, testDataValidator);

            // Property: All inserted items should have correct user_id
            insertedItems.forEach(dbItem => {
              expect(dbItem.user_id).toBe(userId);
            });

            // Property: All inserted items should have valid category_id
            insertedItems.forEach(dbItem => {
              expect(categories.some(cat => cat.id === dbItem.category_id)).toBe(true);
            });

            // Property: All inserted items should be marked as active
            insertedItems.forEach(dbItem => {
              expect(dbItem.active).toBe(true);
            });

            // Property: Result should reflect successful insertions
            expect(result.insertedCount).toBe(itemCount);
            expect(result.errorCount).toBe(0);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 7: Duplicate Detection Accuracy', () => {
    /**
     * **Feature: wardrobe-sync-script, Property 7: Duplicate Detection Accuracy**
     * **Validates: Requirements 4.1, 4.5**
     * 
     * For any combination of existing and new wardrobe items or outfits, the duplicate 
     * detection should correctly identify duplicates based on name/category for items 
     * and item combinations for outfits
     */
    it('should accurately detect duplicate wardrobe items', () => {
      fc.assert(
        fc.property(
          fc.record({
            existingItemCount: fc.integer({ min: 1, max: 10 }),
            newItemCount: fc.integer({ min: 1, max: 10 }),
            duplicateRatio: fc.float({ min: 0, max: 1 })
          }),
          ({ existingItemCount, newItemCount, duplicateRatio }) => {
            // Handle NaN values in duplicateRatio
            if (isNaN(duplicateRatio)) {
              duplicateRatio = 0;
            }
            
            // Create DataValidator instance for this test
            const testDataValidator = new DataValidator(logger);
            
            // Create existing items
            const existingItems = Array(existingItemCount).fill(null).map((_, i) => ({
              id: `existing-${i}`,
              name: `Item ${i}`,
              category: ['Shirt', 'Pants', 'Jacket'][i % 3]
            }));

            // Create new items, some of which are duplicates
            const requestedDuplicateCount = Math.floor(newItemCount * duplicateRatio);
            const actualDuplicateCount = Math.min(requestedDuplicateCount, existingItemCount);
            const newItems = [];

            // Add duplicates (same name and category as existing items)
            for (let i = 0; i < actualDuplicateCount; i++) {
              newItems.push({
                id: `new-duplicate-${i}`,
                name: existingItems[i].name, // Same name
                category: existingItems[i].category // Same category
              });
            }

            // Add unique items
            for (let i = actualDuplicateCount; i < newItemCount; i++) {
              newItems.push({
                id: `new-unique-${i}`,
                name: `Unique Item ${i}`,
                category: ['Belt', 'Watch', 'Shoes'][i % 3]
              });
            }

            const result = testDataValidator.checkDuplicates(newItems, existingItems);

            // Property: Duplicate count should match actual duplicates created
            expect(result.duplicateCount).toBe(actualDuplicateCount);

            // Property: Unique count should match expected unique items
            expect(result.uniqueCount).toBe(newItemCount - actualDuplicateCount);

            // Property: Total should equal input count
            expect(result.totalNew).toBe(newItemCount);
            expect(result.duplicateCount + result.uniqueCount).toBe(newItemCount);

            // Property: Duplicates should have matching names and categories
            result.duplicates.forEach(dup => {
              const matchFound = dup.existingMatches.some(existing => 
                existing.name?.toLowerCase() === dup.newItem.name?.toLowerCase() &&
                existing.category?.toLowerCase() === dup.newItem.category?.toLowerCase()
              );
              expect(matchFound).toBe(true);
            });

            // Property: Unique items should not match any existing items
            result.unique.forEach(uniqueItem => {
              const matchFound = existingItems.some(existing =>
                existing.name?.toLowerCase() === uniqueItem.name?.toLowerCase() &&
                existing.category?.toLowerCase() === uniqueItem.category?.toLowerCase()
              );
              expect(matchFound).toBe(false);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle case-insensitive duplicate detection', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseName: fc.string({ minLength: 1, maxLength: 20 }),
            baseCategory: fc.constantFrom('Shirt', 'Pants', 'Jacket', 'Shoes'),
            caseVariations: fc.array(
              fc.constantFrom('lower', 'upper', 'mixed', 'original'),
              { minLength: 1, maxLength: 4 }
            )
          }),
          ({ baseName, baseCategory, caseVariations }) => {
            // Create DataValidator instance for this test
            const testDataValidator = new DataValidator(logger);
            
            // Create one existing item
            const existingItems = [{
              id: 'existing-1',
              name: baseName,
              category: baseCategory
            }];

            // Create new items with different case variations
            const newItems = caseVariations.map((caseType, index) => {
              let name = baseName;
              let category = baseCategory;

              switch (caseType) {
                case 'lower':
                  name = name.toLowerCase();
                  category = category.toLowerCase();
                  break;
                case 'upper':
                  name = name.toUpperCase();
                  category = category.toUpperCase();
                  break;
                case 'mixed':
                  name = name.split('').map((char, i) => 
                    i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
                  ).join('');
                  category = category.split('').map((char, i) => 
                    i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
                  ).join('');
                  break;
                // 'original' keeps the same case
              }

              return {
                id: `new-${index}`,
                name,
                category
              };
            });

            const result = testDataValidator.checkDuplicates(newItems, existingItems);

            // Property: All variations should be detected as duplicates (case-insensitive)
            expect(result.duplicateCount).toBe(caseVariations.length);
            expect(result.uniqueCount).toBe(0);

            // Property: Each duplicate should have the existing item as a match
            result.duplicates.forEach(dup => {
              expect(dup.existingMatches).toHaveLength(1);
              expect(dup.existingMatches[0].id).toBe('existing-1');
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Task 5.2: Unit tests for outfit processing
   * Test outfit validation and insertion
   * Test handling of invalid item references
   * Requirements: 4.4
   */
  describe('Outfit Processing', () => {
    let databaseSync;
    let dataValidator;
    let mockSupabase;

    beforeEach(() => {
      mockSupabase = {
        from: vi.fn()
      };
      
      // Use a valid URL format for testing
      databaseSync = new DatabaseSync('https://test.supabase.co', 'test-key', logger);
      databaseSync.supabase = mockSupabase;
      dataValidator = new DataValidator(logger);
    });

    describe('Outfit Validation', () => {
      it('should validate outfit structure correctly', () => {
        const validWardrobeItems = [
          { id: 'item-1', name: 'Blue Shirt', category: 'Shirt' },
          { id: 'item-2', name: 'Black Pants', category: 'Pants' }
        ];

        // Valid outfit
        const validOutfit = {
          id: 'outfit-1',
          items: ['item-1', 'item-2'],
          tuck: 'Tucked',
          weight: 1,
          loved: false
        };

        const result = dataValidator.validateOutfit(validOutfit, validWardrobeItems);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject outfits with missing required fields', () => {
        const validWardrobeItems = [
          { id: 'item-1', name: 'Blue Shirt', category: 'Shirt' }
        ];

        // Outfit missing id
        const outfitMissingId = {
          items: ['item-1']
        };

        const result1 = dataValidator.validateOutfit(outfitMissingId, validWardrobeItems);
        expect(result1.isValid).toBe(false);
        expect(result1.errors).toContain('Outfit must have a valid string id');

        // Outfit missing items array
        const outfitMissingItems = {
          id: 'outfit-1'
        };

        const result2 = dataValidator.validateOutfit(outfitMissingItems, validWardrobeItems);
        expect(result2.isValid).toBe(false);
        expect(result2.errors).toContain('Outfit must have an items array');
      });

      it('should reject outfits with invalid item references', () => {
        const validWardrobeItems = [
          { id: 'item-1', name: 'Blue Shirt', category: 'Shirt' }
        ];

        const outfitWithInvalidRefs = {
          id: 'outfit-1',
          items: ['item-1', 'invalid-item', 'another-invalid']
        };

        const result = dataValidator.validateOutfit(outfitWithInvalidRefs, validWardrobeItems);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => 
          error.includes('Outfit references non-existent items: invalid-item, another-invalid')
        )).toBe(true);
      });

      it('should reject outfits with empty items array', () => {
        const validWardrobeItems = [
          { id: 'item-1', name: 'Blue Shirt', category: 'Shirt' }
        ];

        const emptyOutfit = {
          id: 'outfit-1',
          items: []
        };

        const result = dataValidator.validateOutfit(emptyOutfit, validWardrobeItems);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Outfit must contain at least one item');
      });

      it('should validate optional fields correctly', () => {
        const validWardrobeItems = [
          { id: 'item-1', name: 'Blue Shirt', category: 'Shirt' }
        ];

        // Invalid tuck value
        const invalidTuckOutfit = {
          id: 'outfit-1',
          items: ['item-1'],
          tuck: 'InvalidTuck'
        };

        const result1 = dataValidator.validateOutfit(invalidTuckOutfit, validWardrobeItems);
        expect(result1.isValid).toBe(false);
        expect(result1.errors).toContain('Outfit tuck must be "Tucked" or "Untucked" if provided');

        // Invalid weight value
        const invalidWeightOutfit = {
          id: 'outfit-2',
          items: ['item-1'],
          weight: -1
        };

        const result2 = dataValidator.validateOutfit(invalidWeightOutfit, validWardrobeItems);
        expect(result2.isValid).toBe(false);
        expect(result2.errors).toContain('Outfit weight must be a non-negative number if provided');

        // Invalid loved value
        const invalidLovedOutfit = {
          id: 'outfit-3',
          items: ['item-1'],
          loved: 'yes'
        };

        const result3 = dataValidator.validateOutfit(invalidLovedOutfit, validWardrobeItems);
        expect(result3.isValid).toBe(false);
        expect(result3.errors).toContain('Outfit loved must be a boolean if provided');
      });
    });

    describe('Outfit Insertion', () => {
      it('should successfully insert valid outfits', async () => {
        const userWardrobeItems = [
          { id: 'db-item-1', name: 'Blue Shirt', category_id: 'cat-1' },
          { id: 'db-item-2', name: 'Black Pants', category_id: 'cat-2' }
        ];

        const outfitsToInsert = [
          {
            id: 'outfit-1',
            name: 'Business Casual',
            items: ['Blue Shirt', 'Black Pants'],
            tuck: 'Tucked',
            weight: 1,
            loved: false
          }
        ];

        // Mock outfit insertion
        mockSupabase.from.mockReturnValue({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: 'new-outfit-1', name: 'Business Casual' },
                error: null
              }))
            }))
          }))
        });

        const result = await databaseSync.insertOutfits('user-123', outfitsToInsert, userWardrobeItems);

        expect(result.insertedCount).toBe(1);
        expect(result.errorCount).toBe(0);
        expect(result.inserted).toHaveLength(1);
        expect(result.inserted[0].name).toBe('Business Casual');
      });

      it('should handle outfits with missing wardrobe items', async () => {
        const userWardrobeItems = [
          { id: 'db-item-1', name: 'Blue Shirt', category_id: 'cat-1' }
        ];

        const outfitsToInsert = [
          {
            id: 'outfit-1',
            name: 'Incomplete Outfit',
            items: ['Blue Shirt', 'Missing Item'],
            tuck: 'Tucked',
            weight: 1,
            loved: false
          }
        ];

        const result = await databaseSync.insertOutfits('user-123', outfitsToInsert, userWardrobeItems);

        expect(result.insertedCount).toBe(0);
        expect(result.errorCount).toBe(1);
        expect(result.errors[0].error).toContain('Missing wardrobe items: Missing Item');
      });

      it('should handle outfits with no valid wardrobe items', async () => {
        const userWardrobeItems = [
          { id: 'db-item-1', name: 'Blue Shirt', category_id: 'cat-1' }
        ];

        const outfitsToInsert = [
          {
            id: 'outfit-1',
            name: 'Invalid Outfit',
            items: ['Missing Item 1', 'Missing Item 2'],
            tuck: 'Tucked',
            weight: 1,
            loved: false
          }
        ];

        const result = await databaseSync.insertOutfits('user-123', outfitsToInsert, userWardrobeItems);

        expect(result.insertedCount).toBe(0);
        expect(result.errorCount).toBe(1);
        expect(result.errors[0].error).toContain('Missing wardrobe items: Missing Item 1, Missing Item 2');
      });

      it('should handle database errors during outfit insertion', async () => {
        const userWardrobeItems = [
          { id: 'db-item-1', name: 'Blue Shirt', category_id: 'cat-1' }
        ];

        const outfitsToInsert = [
          {
            id: 'outfit-1',
            name: 'Test Outfit',
            items: ['Blue Shirt'],
            tuck: 'Tucked',
            weight: 1,
            loved: false
          }
        ];

        // Mock database error
        mockSupabase.from.mockReturnValue({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Database connection failed' }
              }))
            }))
          }))
        });

        const result = await databaseSync.insertOutfits('user-123', outfitsToInsert, userWardrobeItems);

        expect(result.insertedCount).toBe(0);
        expect(result.errorCount).toBe(1);
        expect(result.errors[0].error).toContain('Failed to insert outfit: Database connection failed');
      });

      it('should handle database errors during outfit_items insertion', async () => {
        const userWardrobeItems = [
          { id: 'db-item-1', name: 'Blue Shirt', category_id: 'cat-1' }
        ];

        const outfitsToInsert = [
          {
            id: 'outfit-1',
            name: 'Test Outfit',
            items: ['Blue Shirt'],
            tuck: 'Tucked',
            weight: 1,
            loved: false
          }
        ];

        // Mock successful outfit insertion but failed outfit_items insertion
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'outfits') {
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({
                    data: { id: 'new-outfit-1', name: 'Test Outfit' },
                    error: null
                  }))
                }))
              })),
              delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
              }))
            };
          } else if (table === 'outfit_items') {
            return {
              insert: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Failed to insert outfit items' }
              }))
            };
          }
          // Default fallback
          return {
            insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
            delete: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          };
        });

        const result = await databaseSync.insertOutfits('user-123', outfitsToInsert, userWardrobeItems);

        expect(result.insertedCount).toBe(0);
        expect(result.errorCount).toBe(1);
        expect(result.errors[0].error).toContain('Failed to insert outfit items: Failed to insert outfit items');
      });

      it('should map tuck styles correctly', async () => {
        const userWardrobeItems = [
          { id: 'db-item-1', name: 'Blue Shirt', category_id: 'cat-1' }
        ];

        const outfitsToInsert = [
          {
            id: 'outfit-1',
            name: 'Tucked Outfit',
            items: ['Blue Shirt'],
            tuck: 'Tucked',
            weight: 1,
            loved: false
          },
          {
            id: 'outfit-2',
            name: 'Untucked Outfit',
            items: ['Blue Shirt'],
            tuck: 'Untucked',
            weight: 1,
            loved: false
          },
          {
            id: 'outfit-3',
            name: 'No Tuck Outfit',
            items: ['Blue Shirt'],
            weight: 1,
            loved: false
          }
        ];

        let insertedData = [];
        mockSupabase.from.mockImplementation((table) => {
          if (table === 'outfits') {
            return {
              insert: vi.fn((data) => {
                insertedData.push(...data);
                return {
                  select: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({
                      data: { id: 'new-outfit', name: data[0].name },
                      error: null
                    }))
                  }))
                };
              })
            };
          } else {
            return {
              insert: vi.fn(() => Promise.resolve({ data: [], error: null }))
            };
          }
        });

        await databaseSync.insertOutfits('user-123', outfitsToInsert, userWardrobeItems);

        expect(insertedData[0].tuck_style).toBe('Tucked');
        expect(insertedData[1].tuck_style).toBe('Untucked');
        expect(insertedData[2].tuck_style).toBe(null);
      });
    });

    describe('Invalid Item Reference Handling', () => {
      it('should skip outfits with all invalid references', async () => {
        const userWardrobeItems = [
          { id: 'db-item-1', name: 'Blue Shirt', category_id: 'cat-1' }
        ];

        const outfitsToInsert = [
          {
            id: 'outfit-1',
            name: 'Invalid Outfit',
            items: ['Nonexistent Item 1', 'Nonexistent Item 2'],
            tuck: 'Tucked',
            weight: 1,
            loved: false
          }
        ];

        const result = await databaseSync.insertOutfits('user-123', outfitsToInsert, userWardrobeItems);

        expect(result.insertedCount).toBe(0);
        expect(result.errorCount).toBe(1);
        expect(result.errors[0].error).toContain('Missing wardrobe items');
      });

      it('should handle mixed valid and invalid references', async () => {
        const userWardrobeItems = [
          { id: 'db-item-1', name: 'Blue Shirt', category_id: 'cat-1' }
        ];

        const outfitsToInsert = [
          {
            id: 'outfit-1',
            name: 'Mixed Outfit',
            items: ['Blue Shirt', 'Nonexistent Item'],
            tuck: 'Tucked',
            weight: 1,
            loved: false
          }
        ];

        const result = await databaseSync.insertOutfits('user-123', outfitsToInsert, userWardrobeItems);

        expect(result.insertedCount).toBe(0);
        expect(result.errorCount).toBe(1);
        expect(result.errors[0].error).toContain('Missing wardrobe items: Nonexistent Item');
      });

      it('should handle item matching by both ID and name', async () => {
        const userWardrobeItems = [
          { id: 'db-item-1', name: 'Blue Shirt', category_id: 'cat-1' },
          { id: 'db-item-2', name: 'Black Pants', category_id: 'cat-2' }
        ];

        const outfitsToInsert = [
          {
            id: 'outfit-1',
            name: 'Mixed Reference Outfit',
            items: ['db-item-1', 'Black Pants'], // One by ID, one by name
            tuck: 'Tucked',
            weight: 1,
            loved: false
          }
        ];

        mockSupabase.from.mockImplementation((table) => {
          if (table === 'outfits') {
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({
                    data: { id: 'new-outfit-1', name: 'Mixed Reference Outfit' },
                    error: null
                  }))
                }))
              }))
            };
          } else {
            return {
              insert: vi.fn(() => Promise.resolve({ data: [], error: null }))
            };
          }
        });

        const result = await databaseSync.insertOutfits('user-123', outfitsToInsert, userWardrobeItems);

        expect(result.insertedCount).toBe(1);
        expect(result.errorCount).toBe(0);
      });
    });
  });
});

describe('Integration Tests - Full Workflow', () => {
  let logger;
  let mockSupabase;
  let tempDir;
  let tempWardrobeFile;
  let tempOutfitsFile;
  let tempImagesDir;

  beforeEach(async () => {
    // Mock console methods to capture output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    logger = new SecureLogger(false);

    // Create temporary directory structure for test files
    tempDir = path.join(process.cwd(), `test-integration-${Date.now()}-${Math.random()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    tempImagesDir = path.join(tempDir, 'images');
    fs.mkdirSync(tempImagesDir, { recursive: true });
    
    tempWardrobeFile = path.join(tempDir, 'wardrobe.json');
    tempOutfitsFile = path.join(tempDir, 'outfits.json');

    // Create mock Supabase client with comprehensive mocking
    mockSupabase = {
      auth: {
        admin: {
          getUserById: vi.fn(),
          listUsers: vi.fn()
        }
      },
      from: vi.fn()
    };
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Complete Sync Process - Admin Only Mode', () => {
    it('should successfully sync wardrobe items and outfits to admin user', async () => {
      // Create test data files
      const wardrobeData = {
        items: [
          {
            id: 'item-1',
            name: 'Blue Shirt',
            category: 'Shirt',
            brand: 'Test Brand',
            formalityScore: 5,
            capsuleTags: ['Refined'],
            image: 'blue-shirt.png'
          },
          {
            id: 'item-2',
            name: 'Black Pants',
            category: 'Pants',
            brand: 'Test Brand',
            formalityScore: 7,
            capsuleTags: ['Refined', 'Crossover']
          }
        ]
      };

      const outfitData = {
        outfits: [
          {
            id: 'outfit-1',
            items: ['Blue Shirt', 'Black Pants'], // Reference by name, not ID
            tuck: 'Tucked',
            weight: 1,
            loved: false
          }
        ]
      };

      // Write test data to files
      fs.writeFileSync(tempWardrobeFile, JSON.stringify(wardrobeData, null, 2));
      fs.writeFileSync(tempOutfitsFile, JSON.stringify(outfitData, null, 2));
      
      // Create test image file
      fs.writeFileSync(path.join(tempImagesDir, 'blue-shirt.png'), 'fake image content');

      // Mock admin user lookup
      const mockAdminUser = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com'
        }
      };

      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: mockAdminUser,
        error: null
      });

      // Mock categories
      const mockCategories = [
        { id: 'cat-1', name: 'Shirt', is_anchor_item: false, display_order: 1 },
        { id: 'cat-2', name: 'Pants', is_anchor_item: true, display_order: 2 }
      ];

      // Mock database operations
      let insertedWardrobeItems = [];
      let insertedOutfits = [];
      let insertedOutfitItems = [];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockCategories, error: null })
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          };
        } else if (table === 'wardrobe_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }) // No existing items
              })
            }),
            insert: vi.fn().mockImplementation((items) => {
              insertedWardrobeItems.push(...items);
              return {
                select: vi.fn().mockResolvedValue({ 
                  data: items.map((item, idx) => ({ ...item, id: `db-item-${idx}` })), 
                  error: null 
                })
              };
            })
          };
        } else if (table === 'outfits') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }) // No existing outfits
            }),
            insert: vi.fn().mockImplementation((outfits) => {
              insertedOutfits.push(...outfits);
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'new-outfit-1', name: outfits[0].name },
                    error: null
                  })
                })
              };
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          };
        } else if (table === 'outfit_items') {
          return {
            insert: vi.fn().mockImplementation((items) => {
              insertedOutfitItems.push(...items);
              return Promise.resolve({ data: items, error: null });
            })
          };
        }
        
        // Default fallback
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      // Create DatabaseSync instance and run sync
      const databaseSync = new DatabaseSync('https://test.supabase.co', 'test-key', logger);
      databaseSync.supabase = mockSupabase;

      const dataLoader = new DataLoader(logger);
      const dataValidator = new DataValidator(logger);

      // Load and validate data
      const loadedWardrobeData = dataLoader.loadWardrobeData(tempWardrobeFile);
      const loadedOutfitData = dataLoader.loadOutfitData(tempOutfitsFile);

      // Validate image assets BEFORE formatting paths
      const imageValidation = dataLoader.validateImageAssets(loadedWardrobeData.items, tempImagesDir);

      // Format image paths (this is done in the main workflow)
      loadedWardrobeData.items = dataLoader.formatImagePaths(loadedWardrobeData.items);

      // Get target users (admin only)
      const targetUsers = await databaseSync.getTargetUsers(true, 'admin-123');

      // Process the admin user
      const user = targetUsers[0];
      const userCategories = await databaseSync.getCategoriesForUser(user.id);

      // Insert wardrobe items
      const itemResults = await databaseSync.insertWardrobeItems(
        user.id, 
        loadedWardrobeData.items, 
        userCategories, 
        dataValidator
      );

      // Get user's wardrobe items for outfit processing
      const userWardrobeItems = insertedWardrobeItems.map((item, idx) => ({
        id: `db-item-${idx}`,
        name: item.name,
        category_id: item.category_id
      }));

      // Insert outfits
      const outfitResults = await databaseSync.insertOutfits(
        user.id, 
        loadedOutfitData.outfits, 
        userWardrobeItems
      );

      // Assertions
      expect(targetUsers).toHaveLength(1);
      expect(targetUsers[0].id).toBe('admin-123');
      expect(targetUsers[0].email).toBe('admin@example.com');

      expect(imageValidation.validCount).toBe(2); // Both items are valid (one with image, one without)
      expect(imageValidation.invalidCount).toBe(0);
      expect(imageValidation.missingImages).toHaveLength(0);
      expect(imageValidation.totalItems).toBe(2); // Both items are processed

      expect(itemResults.insertedCount).toBe(2);
      expect(itemResults.errorCount).toBe(0);
      expect(insertedWardrobeItems).toHaveLength(2);
      
      // Verify wardrobe item data integrity
      expect(insertedWardrobeItems[0].user_id).toBe('admin-123');
      expect(insertedWardrobeItems[0].name).toBe('Blue Shirt');
      expect(insertedWardrobeItems[0].category_id).toBe('cat-1');
      expect(insertedWardrobeItems[0].active).toBe(true);
      expect(insertedWardrobeItems[0].image_url).toBe('/images/wardrobe/blue-shirt.png');

      expect(insertedWardrobeItems[1].user_id).toBe('admin-123');
      expect(insertedWardrobeItems[1].name).toBe('Black Pants');
      expect(insertedWardrobeItems[1].category_id).toBe('cat-2');
      expect(insertedWardrobeItems[1].active).toBe(true);
      expect(insertedWardrobeItems[1].image_url).toBeNull();

      expect(outfitResults.insertedCount).toBe(1);
      expect(outfitResults.errorCount).toBe(0);
      expect(insertedOutfits).toHaveLength(1);
      
      // Verify outfit data integrity
      expect(insertedOutfits[0].user_id).toBe('admin-123');
      expect(insertedOutfits[0].tuck_style).toBe('Tucked');
      expect(insertedOutfits[0].weight).toBe(1);
      expect(insertedOutfits[0].loved).toBe(false);
      expect(insertedOutfits[0].source).toBe('curated');

      expect(insertedOutfitItems).toHaveLength(2);
      expect(insertedOutfitItems[0].outfit_id).toBe('new-outfit-1');
      expect(insertedOutfitItems[1].outfit_id).toBe('new-outfit-1');
    });

    it('should handle missing image files gracefully', async () => {
      // Create test data with missing image reference
      const wardrobeData = {
        items: [
          {
            id: 'item-1',
            name: 'Blue Shirt',
            category: 'Shirt',
            image: 'missing-image.png'
          }
        ]
      };

      fs.writeFileSync(tempWardrobeFile, JSON.stringify(wardrobeData, null, 2));

      const dataLoader = new DataLoader(logger);
      const loadedWardrobeData = dataLoader.loadWardrobeData(tempWardrobeFile);
      
      // Validate image assets - should handle missing image
      const imageValidation = dataLoader.validateImageAssets(loadedWardrobeData.items, tempImagesDir);

      expect(imageValidation.validCount).toBe(0);
      expect(imageValidation.invalidCount).toBe(1);
      expect(imageValidation.missingImages).toHaveLength(1);
      expect(imageValidation.missingImages[0].itemId).toBe('item-1');
      expect(imageValidation.missingImages[0].imagePath).toBe('missing-image.png');

      // Handle missing images should set image to null
      const processedItems = dataLoader.handleMissingImages(loadedWardrobeData.items, imageValidation);
      expect(processedItems[0].image).toBeNull();
    });

    it('should handle validation errors correctly', async () => {
      // Create invalid test data
      const wardrobeData = {
        items: [
          {
            // Missing required fields
            name: 'Invalid Item'
            // Missing id and category
          }
        ]
      };

      const outfitData = {
        outfits: [
          {
            id: 'outfit-1',
            items: ['nonexistent-item'] // References non-existent item
          }
        ]
      };

      fs.writeFileSync(tempWardrobeFile, JSON.stringify(wardrobeData, null, 2));
      fs.writeFileSync(tempOutfitsFile, JSON.stringify(outfitData, null, 2));

      const dataLoader = new DataLoader(logger);
      const dataValidator = new DataValidator(logger);

      const loadedWardrobeData = dataLoader.loadWardrobeData(tempWardrobeFile);
      const loadedOutfitData = dataLoader.loadOutfitData(tempOutfitsFile);

      // Validate wardrobe items - should fail
      const itemValidationResults = loadedWardrobeData.items.map(item => 
        dataValidator.validateWardrobeItem(item)
      );
      const invalidItems = itemValidationResults.filter(result => !result.isValid);

      expect(invalidItems).toHaveLength(1);
      expect(invalidItems[0].errors).toContain('Item must have a valid string id');
      expect(invalidItems[0].errors).toContain('Item must have a valid string category');

      // Validate outfits - should fail due to missing item reference
      const outfitValidationResults = loadedOutfitData.outfits.map(outfit => 
        dataValidator.validateOutfit(outfit, loadedWardrobeData.items)
      );
      const invalidOutfits = outfitValidationResults.filter(result => !result.isValid);

      expect(invalidOutfits).toHaveLength(1);
      expect(invalidOutfits[0].errors.some(error => 
        error.includes('Outfit references non-existent items: nonexistent-item')
      )).toBe(true);
    });
  });

  describe('Complete Sync Process - All Users Mode', () => {
    it('should successfully sync to multiple users', async () => {
      // Create simple test data
      const wardrobeData = {
        items: [
          {
            id: 'item-1',
            name: 'Test Shirt',
            category: 'Shirt'
          }
        ]
      };

      const outfitData = {
        outfits: []
      };

      fs.writeFileSync(tempWardrobeFile, JSON.stringify(wardrobeData, null, 2));
      fs.writeFileSync(tempOutfitsFile, JSON.stringify(outfitData, null, 2));

      // Mock multiple users
      const mockUsers = {
        users: [
          { id: 'user-1', email: 'user1@example.com' },
          { id: 'user-2', email: 'user2@example.com' },
          { id: 'user-3', email: 'user3@example.com' }
        ]
      };

      mockSupabase.auth.admin.listUsers.mockResolvedValue({
        data: mockUsers,
        error: null
      });

      // Mock categories for each user
      const mockCategories = [
        { id: 'cat-1', name: 'Shirt', is_anchor_item: false, display_order: 1 }
      ];

      let totalInsertedItems = [];

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockCategories, error: null })
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          };
        } else if (table === 'wardrobe_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }) // No existing items
              })
            }),
            insert: vi.fn().mockImplementation((items) => {
              totalInsertedItems.push(...items);
              return {
                select: vi.fn().mockResolvedValue({ 
                  data: items.map((item, idx) => ({ ...item, id: `db-item-${idx}` })), 
                  error: null 
                })
              };
            })
          };
        }
        
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      // Create DatabaseSync instance and run sync
      const databaseSync = new DatabaseSync('https://test.supabase.co', 'test-key', logger);
      databaseSync.supabase = mockSupabase;

      const dataLoader = new DataLoader(logger);
      const dataValidator = new DataValidator(logger);

      // Get target users (all users)
      const targetUsers = await databaseSync.getTargetUsers(false);

      expect(targetUsers).toHaveLength(3);

      // Process each user
      for (const user of targetUsers) {
        const userCategories = await databaseSync.getCategoriesForUser(user.id);
        const itemResults = await databaseSync.insertWardrobeItems(
          user.id, 
          wardrobeData.items, 
          userCategories, 
          dataValidator
        );

        expect(itemResults.insertedCount).toBe(1);
        expect(itemResults.errorCount).toBe(0);
      }

      // Verify that items were inserted for all users
      expect(totalInsertedItems).toHaveLength(3);
      expect(totalInsertedItems[0].user_id).toBe('user-1');
      expect(totalInsertedItems[1].user_id).toBe('user-2');
      expect(totalInsertedItems[2].user_id).toBe('user-3');

      // All items should have the same name and category
      totalInsertedItems.forEach(item => {
        expect(item.name).toBe('Test Shirt');
        expect(item.category_id).toBe('cat-1');
        expect(item.active).toBe(true);
      });
    });

    it('should handle partial user failures gracefully', async () => {
      // Create test data
      const wardrobeData = {
        items: [
          {
            id: 'item-1',
            name: 'Test Shirt',
            category: 'Shirt'
          }
        ]
      };

      fs.writeFileSync(tempWardrobeFile, JSON.stringify(wardrobeData, null, 2));
      fs.writeFileSync(tempOutfitsFile, JSON.stringify({ outfits: [] }, null, 2));

      // Mock multiple users
      const mockUsers = {
        users: [
          { id: 'user-1', email: 'user1@example.com' },
          { id: 'user-2', email: 'user2@example.com' }
        ]
      };

      mockSupabase.auth.admin.listUsers.mockResolvedValue({
        data: mockUsers,
        error: null
      });

      const mockCategories = [
        { id: 'cat-1', name: 'Shirt', is_anchor_item: false, display_order: 1 }
      ];

      let callCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockCategories, error: null })
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          };
        } else if (table === 'wardrobe_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            }),
            insert: vi.fn().mockImplementation((items) => {
              callCount++;
              if (callCount === 2) {
                // Fail for second user
                return {
                  select: vi.fn().mockResolvedValue({ 
                    data: null, 
                    error: { message: 'Database error for user 2' }
                  })
                };
              }
              // Succeed for first user
              return {
                select: vi.fn().mockResolvedValue({ 
                  data: items.map((item, idx) => ({ ...item, id: `db-item-${idx}` })), 
                  error: null 
                })
              };
            })
          };
        }
        
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const databaseSync = new DatabaseSync('https://test.supabase.co', 'test-key', logger);
      databaseSync.supabase = mockSupabase;

      const dataValidator = new DataValidator(logger);
      const targetUsers = await databaseSync.getTargetUsers(false);

      let successfulUsers = 0;
      let failedUsers = 0;
      const errors = [];

      // Process each user and track results
      for (const user of targetUsers) {
        try {
          const userCategories = await databaseSync.getCategoriesForUser(user.id);
          const itemResults = await databaseSync.insertWardrobeItems(
            user.id, 
            wardrobeData.items, 
            userCategories, 
            dataValidator
          );

          if (itemResults.errorCount > 0) {
            throw new Error(`Failed to insert items for user ${user.email}`);
          }

          successfulUsers++;
        } catch (error) {
          failedUsers++;
          errors.push({
            user: user.email,
            error: error.message
          });
        }
      }

      expect(successfulUsers).toBe(1);
      expect(failedUsers).toBe(1);
      expect(errors).toHaveLength(1);
      expect(errors[0].user).toBe('user2@example.com');
    });
  });

  describe('Error Scenarios and Rollback Behavior', () => {
    it('should handle database connection failures', async () => {
      // Create test data
      const wardrobeData = {
        items: [
          {
            id: 'item-1',
            name: 'Test Shirt',
            category: 'Shirt'
          }
        ]
      };

      fs.writeFileSync(tempWardrobeFile, JSON.stringify(wardrobeData, null, 2));
      fs.writeFileSync(tempOutfitsFile, JSON.stringify({ outfits: [] }, null, 2));

      // Mock database connection failure
      mockSupabase.auth.admin.listUsers.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' }
      });

      const databaseSync = new DatabaseSync('https://test.supabase.co', 'test-key', logger);
      databaseSync.supabase = mockSupabase;

      await expect(
        databaseSync.getTargetUsers(false)
      ).rejects.toThrow(DatabaseError);
    });

    it('should handle outfit insertion rollback on outfit_items failure', async () => {
      // Create test data
      const wardrobeData = {
        items: [
          {
            id: 'item-1',
            name: 'Test Shirt',
            category: 'Shirt'
          }
        ]
      };

      const outfitData = {
        outfits: [
          {
            id: 'outfit-1',
            items: ['Test Shirt'] // Reference by name, not ID
          }
        ]
      };

      fs.writeFileSync(tempWardrobeFile, JSON.stringify(wardrobeData, null, 2));
      fs.writeFileSync(tempOutfitsFile, JSON.stringify(outfitData, null, 2));

      // Mock admin user
      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } },
        error: null
      });

      const mockCategories = [
        { id: 'cat-1', name: 'Shirt', is_anchor_item: false, display_order: 1 }
      ];

      let outfitDeleted = false;

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockCategories, error: null })
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          };
        } else if (table === 'wardrobe_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ 
                  data: [{ id: 'db-item-1', name: 'Test Shirt', category_id: 'cat-1' }], 
                  error: null 
                })
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          };
        } else if (table === 'outfits') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'new-outfit-1', name: null },
                  error: null
                })
              })
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => {
                outfitDeleted = true;
                return Promise.resolve({ data: null, error: null });
              })
            })
          };
        } else if (table === 'outfit_items') {
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Failed to insert outfit items' }
            })
          };
        }
        
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const databaseSync = new DatabaseSync('https://test.supabase.co', 'test-key', logger);
      databaseSync.supabase = mockSupabase;

      const targetUsers = await databaseSync.getTargetUsers(true, 'admin-123');
      const userWardrobeItems = [{ id: 'db-item-1', name: 'Test Shirt', category_id: 'cat-1' }];

      const outfitResults = await databaseSync.insertOutfits(
        targetUsers[0].id, 
        outfitData.outfits, 
        userWardrobeItems
      );

      // Should have failed and rolled back
      expect(outfitResults.insertedCount).toBe(0);
      expect(outfitResults.errorCount).toBe(1);
      expect(outfitResults.errors[0].error).toContain('Failed to insert outfit items');
      expect(outfitDeleted).toBe(true); // Verify rollback occurred
    });

    it('should handle invalid JSON files gracefully', async () => {
      // Create invalid JSON files
      fs.writeFileSync(tempWardrobeFile, '{ invalid json }');
      fs.writeFileSync(tempOutfitsFile, '{ "outfits": [ }'); // Missing closing bracket

      const dataLoader = new DataLoader(logger);

      expect(() => dataLoader.loadWardrobeData(tempWardrobeFile)).toThrow(ValidationError);
      expect(() => dataLoader.loadOutfitData(tempOutfitsFile)).toThrow(ValidationError);
    });

    it('should handle missing data files gracefully', async () => {
      const dataLoader = new DataLoader(logger);

      const nonexistentWardrobeFile = path.join(tempDir, 'nonexistent-wardrobe.json');
      const nonexistentOutfitsFile = path.join(tempDir, 'nonexistent-outfits.json');

      expect(() => dataLoader.loadWardrobeData(nonexistentWardrobeFile)).toThrow(FileSystemError);
      expect(() => dataLoader.loadOutfitData(nonexistentOutfitsFile)).toThrow(FileSystemError);
    });

    it('should handle configuration errors properly', async () => {
      // Test missing admin user configuration
      mockSupabase.auth.admin.getUserById.mockResolvedValue({
        data: null,
        error: { message: 'User not found' }
      });

      mockSupabase.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: null
      });

      const databaseSync = new DatabaseSync('https://test.supabase.co', 'test-key', logger);
      databaseSync.supabase = mockSupabase;

      await expect(
        databaseSync.getTargetUsers(true, 'invalid-admin-id', 'nonexistent@example.com')
      ).rejects.toThrow(ConfigurationError);
    });
  });

  describe('Dry Run Mode', () => {
    it('should validate data without making database changes', async () => {
      // Create valid test data
      const wardrobeData = {
        items: [
          {
            id: 'item-1',
            name: 'Test Shirt',
            category: 'Shirt'
          }
        ]
      };

      const outfitData = {
        outfits: [
          {
            id: 'outfit-1',
            items: ['item-1']
          }
        ]
      };

      fs.writeFileSync(tempWardrobeFile, JSON.stringify(wardrobeData, null, 2));
      fs.writeFileSync(tempOutfitsFile, JSON.stringify(outfitData, null, 2));

      const dataLoader = new DataLoader(logger);
      const dataValidator = new DataValidator(logger);

      // Load and validate data (dry run simulation)
      const loadedWardrobeData = dataLoader.loadWardrobeData(tempWardrobeFile);
      const loadedOutfitData = dataLoader.loadOutfitData(tempOutfitsFile);

      // Validate wardrobe items
      const itemValidationResults = loadedWardrobeData.items.map(item => 
        dataValidator.validateWardrobeItem(item)
      );
      const invalidItems = itemValidationResults.filter(result => !result.isValid);

      // Validate outfits
      const outfitValidationResults = loadedOutfitData.outfits.map(outfit => 
        dataValidator.validateOutfit(outfit, loadedWardrobeData.items)
      );
      const invalidOutfits = outfitValidationResults.filter(result => !result.isValid);

      // Validate image assets
      const imageValidation = dataLoader.validateImageAssets(loadedWardrobeData.items, tempImagesDir);

      // All validations should pass
      expect(invalidItems).toHaveLength(0);
      expect(invalidOutfits).toHaveLength(0);
      expect(imageValidation.validCount).toBe(1);
      expect(imageValidation.invalidCount).toBe(0);

      // In dry run mode, no database operations should be performed
      // This test verifies that validation works without database calls
    });

    it('should detect validation errors in dry run mode', async () => {
      // Create invalid test data
      const wardrobeData = {
        items: [
          {
            // Missing required fields
            name: 'Invalid Item'
          }
        ]
      };

      const outfitData = {
        outfits: [
          {
            id: 'outfit-1',
            items: ['nonexistent-item']
          }
        ]
      };

      fs.writeFileSync(tempWardrobeFile, JSON.stringify(wardrobeData, null, 2));
      fs.writeFileSync(tempOutfitsFile, JSON.stringify(outfitData, null, 2));

      const dataLoader = new DataLoader(logger);
      const dataValidator = new DataValidator(logger);

      const loadedWardrobeData = dataLoader.loadWardrobeData(tempWardrobeFile);
      const loadedOutfitData = dataLoader.loadOutfitData(tempOutfitsFile);

      // Validate wardrobe items - should fail
      const itemValidationResults = loadedWardrobeData.items.map(item => 
        dataValidator.validateWardrobeItem(item)
      );
      const invalidItems = itemValidationResults.filter(result => !result.isValid);

      // Validate outfits - should fail
      const outfitValidationResults = loadedOutfitData.outfits.map(outfit => 
        dataValidator.validateOutfit(outfit, loadedWardrobeData.items)
      );
      const invalidOutfits = outfitValidationResults.filter(result => !result.isValid);

      // Should detect validation errors
      expect(invalidItems).toHaveLength(1);
      expect(invalidItems[0].errors).toContain('Item must have a valid string id');
      expect(invalidItems[0].errors).toContain('Item must have a valid string category');

      expect(invalidOutfits).toHaveLength(1);
      expect(invalidOutfits[0].errors.some(error => 
        error.includes('Outfit references non-existent items: nonexistent-item')
      )).toBe(true);

      // Dry run should stop here with validation errors
      // No database operations should be attempted
    });
  });
});