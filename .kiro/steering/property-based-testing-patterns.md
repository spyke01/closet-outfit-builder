# Property-Based Testing Patterns

This document outlines effective patterns for property-based testing based on our experience with the category split implementation and other features.

## Core Principles

### 1. Test Business Logic, Not UI

**Problem**: Property tests that render components are slow and fragile.

**Solution**: Extract business logic into pure functions and test those.

```typescript
// ❌ Avoid: Testing UI interactions in property tests
fc.assert(fc.property(
  categoryGenerator,
  (categories) => {
    render(<CategoryDropdown categories={categories} />);
    // DOM interactions are slow and fragile
  }
));

// ✅ Prefer: Testing pure business logic
fc.assert(fc.property(
  categoryGenerator,
  (categories) => {
    const result = mapCategoriesToSlots(categories);
    expect(result).toSatisfyBusinessRule();
    return true;
  }
));
```

### 2. Keep Generators Simple and Realistic

**Effective generators**:
- Produce realistic data that matches actual usage
- Are fast to execute
- Cover edge cases naturally

```typescript
// ✅ Good generator: Simple and realistic
const categoryArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.oneof(
    fc.constant('Jacket'),
    fc.constant('Overshirt'),
    fc.constant('Shirt'),
    fc.constant('Pants')
  ),
  display_order: fc.integer({ min: 1, max: 10 })
});

// ❌ Avoid: Overly complex generators
const complexCategoryArb = fc.record({
  id: fc.string().chain(s => fc.constant(crypto.randomUUID())), // Slow
  name: fc.string({ minLength: 1, maxLength: 100 }), // Unrealistic
  metadata: fc.dictionary(fc.string(), fc.anything()) // Too complex
});
```

## Common Property Patterns

### 1. Invariant Properties

Test properties that should always hold true.

```typescript
// Example: Category mapping should always preserve item count
fc.assert(fc.property(
  fc.array(wardrobeItemArb),
  (items) => {
    const mappedItems = mapItemsToNewCategories(items);
    expect(mappedItems.length).toBe(items.length);
    return true;
  }
));
```

### 2. Round-Trip Properties

Test operations that should be reversible.

```typescript
// Example: Serialization round-trip
fc.assert(fc.property(
  outfitSelectionArb,
  (selection) => {
    const serialized = serializeOutfit(selection);
    const deserialized = deserializeOutfit(serialized);
    expect(deserialized).toEqual(selection);
    return true;
  }
));
```

### 3. Consistency Properties

Test that similar inputs produce similar outputs.

```typescript
// Example: Scoring consistency
fc.assert(fc.property(
  fc.record({
    jacketItem: outfitItemArb,
    overshirtItem: outfitItemArb
  }),
  (testData) => {
    // Make items identical except for category
    const jacketItem = { ...testData.jacketItem, category: 'Jacket' };
    const overshirtItem = { ...testData.overshirtItem, 
                           category: 'Overshirt',
                           formality_score: jacketItem.formality_score,
                           color: jacketItem.color };
    
    const jacketScore = calculateScore({ jacket: jacketItem });
    const overshirtScore = calculateScore({ jacket: overshirtItem });
    
    expect(jacketScore).toBe(overshirtScore);
    return true;
  }
));
```

### 4. Independence Properties

Test that operations on different parts don't interfere.

```typescript
// Example: Category selection independence
fc.assert(fc.property(
  fc.record({
    jacketId: fc.string(),
    shirtId: fc.string(),
    pantsId: fc.string()
  }),
  (testData) => {
    let selection = {};
    selection = selectItem(selection, 'Jacket', testData.jacketId);
    selection = selectItem(selection, 'Shirt', testData.shirtId);
    selection = selectItem(selection, 'Pants', testData.pantsId);
    
    // Selecting jacket shouldn't affect shirt or pants
    const newJacketId = 'new-jacket';
    const updatedSelection = selectItem(selection, 'Jacket', newJacketId);
    
    expect(updatedSelection.jacket).toBe(newJacketId);
    expect(updatedSelection.shirt).toBe(testData.shirtId);
    expect(updatedSelection.pants).toBe(testData.pantsId);
    
    return true;
  }
));
```

## Performance Optimization

### 1. Limit Test Runs

For development and CI efficiency:

```typescript
// Development: Fast feedback
fc.assert(property, { numRuns: 3 });

// CI: More thorough testing
fc.assert(property, { numRuns: process.env.CI ? 20 : 5 });
```

### 2. Use Efficient Generators

```typescript
// ✅ Fast: Pre-defined constants
const categoryNameArb = fc.oneof(
  fc.constant('Jacket'),
  fc.constant('Overshirt'),
  fc.constant('Shirt')
);

// ❌ Slow: Complex string generation
const categoryNameArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => isValidCategoryName(s));
```

### 3. Avoid Heavy Operations

```typescript
// ✅ Test the logic, not the implementation
fc.assert(fc.property(
  dataArb,
  (data) => {
    const result = businessLogicFunction(data);
    expect(result).toSatisfyProperty();
    return true;
  }
));

// ❌ Avoid database operations, file I/O, network calls
fc.assert(fc.property(
  dataArb,
  async (data) => {
    await database.save(data); // Slow and fragile
    const result = await database.find(data.id);
    expect(result).toEqual(data);
    return true;
  }
));
```

## Error Handling in Property Tests

### 1. Handle Generator Edge Cases

```typescript
const safeItemArb = wardrobeItemArb.filter(item => 
  item.name && item.name.length > 0 && item.category_id
);
```

### 2. Graceful Failure Handling

```typescript
fc.assert(fc.property(
  inputArb,
  (input) => {
    try {
      const result = functionUnderTest(input);
      expect(result).toSatisfyCondition();
      return true;
    } catch (error) {
      // Only fail if it's an unexpected error
      if (error instanceof ValidationError) {
        return true; // Expected for invalid input
      }
      throw error; // Unexpected error, let test fail
    }
  }
));
```

## Integration with Regular Tests

### 1. Complement, Don't Replace

Use property tests alongside unit tests:

```typescript
describe('Category Mapping', () => {
  // Unit tests for specific cases
  it('should map Jacket to jacket slot', () => {
    expect(mapCategory('Jacket')).toBe('jacket');
  });
  
  it('should map Overshirt to jacket slot', () => {
    expect(mapCategory('Overshirt')).toBe('jacket');
  });
  
  // Property test for general behavior
  it('should always return valid slot for any valid category', () => {
    fc.assert(fc.property(
      validCategoryArb,
      (category) => {
        const slot = mapCategory(category);
        expect(VALID_SLOTS).toContain(slot);
        return true;
      }
    ));
  });
});
```

### 2. Use Property Tests for Regression Prevention

```typescript
// After fixing a bug, add a property test to prevent regression
it('should handle category split without data loss', () => {
  fc.assert(fc.property(
    fc.array(oldFormatItemArb),
    (oldItems) => {
      const newItems = migrateItems(oldItems);
      expect(newItems.length).toBe(oldItems.length);
      expect(newItems.every(item => item.category !== 'Jacket/Overshirt')).toBe(true);
      return true;
    }
  ));
});
```

## Documentation Standards

### 1. Property Description

Always document what property is being tested:

```typescript
/**
 * Property: Category Independence
 * For any outfit selection, changing one category should not affect other categories
 * **Validates: Requirements 4.2, 4.5, 4.6**
 */
it('should maintain category independence', () => {
  fc.assert(fc.property(/* ... */));
});
```

### 2. Generator Documentation

Document complex generators:

```typescript
/**
 * Generates realistic wardrobe items with valid category relationships
 * Ensures formality_score is between 1-10 and category matches item type
 */
const realisticWardrobeItemArb = fc.record({
  // ...
});
```

## Common Pitfalls to Avoid

### 1. Testing Implementation Details

```typescript
// ❌ Don't test internal state
fc.assert(fc.property(
  inputArb,
  (input) => {
    const component = new Component(input);
    expect(component._internalState).toBe(expectedState);
  }
));

// ✅ Test observable behavior
fc.assert(fc.property(
  inputArb,
  (input) => {
    const result = processInput(input);
    expect(result).toSatisfyPublicContract();
    return true;
  }
));
```

### 2. Over-Constraining Generators

```typescript
// ❌ Too restrictive
const itemArb = wardrobeItemArb.filter(item => 
  item.name === 'Blue Jacket' && item.formality_score === 8
);

// ✅ Allow natural variation
const itemArb = wardrobeItemArb;
```

### 3. Ignoring Shrinking

When a property test fails, fast-check provides a minimal failing example. Use it:

```typescript
// When test fails with: { name: "A", formality_score: 1 }
// Don't just increase numRuns, investigate why this minimal case fails
```

## Conclusion

Property-based testing is most effective when:
1. Testing pure business logic functions
2. Using simple, realistic generators
3. Focusing on universal properties rather than specific examples
4. Complementing (not replacing) traditional unit tests
5. Keeping tests fast and maintainable

The goal is to catch edge cases and ensure system properties hold across a wide range of inputs, while maintaining test suite performance and reliability.