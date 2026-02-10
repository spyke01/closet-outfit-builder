# Property-Based Testing Patterns

This document outlines effective patterns for property-based testing. Property-based tests are a specialized tool - use them sparingly for critical business logic where they provide unique value over traditional unit tests.

## When to Use Property-Based Tests

**Use property-based tests for**:
- Core business logic with complex input spaces
- Data transformations that must preserve invariants
- Algorithms with universal properties (e.g., reversibility, consistency)
- Critical calculations (scoring, pricing, permissions)

**Don't use property-based tests for**:
- UI components (too slow, too fragile)
- Simple functions already covered by unit tests
- Implementation details
- Anything that requires extensive mocking

**Rule of thumb**: If you can't describe a universal property in one sentence, use a unit test instead.

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

### 3. Async Property Correctness

If the property body is async, use `fc.asyncProperty` and `await fc.assert(...)`.

```typescript
// ✅ Correct async pattern
await fc.assert(
  fc.asyncProperty(validInputArb, async (input) => {
    const result = await asyncBusinessLogic(input);
    expect(result).toSatisfyInvariant();
  }),
  { numRuns: 3 }
);

// ❌ Incorrect: async callback inside fc.property
fc.assert(
  fc.property(validInputArb, async (input) => {
    await asyncBusinessLogic(input);
  })
);
```

Never leave unresolved promises in property tests. Fire-and-forget async work can stall worker shutdown and cause suite hangs.

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

### 1. Keep numRuns Low

**Critical**: Property tests are expensive. Keep them fast.

```typescript
// ✅ Development: Minimal runs for fast feedback
fc.assert(property, { numRuns: 3 });

// ✅ CI: Still keep it reasonable
fc.assert(property, { numRuns: process.env.CI ? 10 : 3 });

// ❌ Avoid: Too many runs (slow suite)
fc.assert(property, { numRuns: 100 }); // Only for critical algorithms
```

**Target**: Each property test should complete in <100ms.

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

### 4. Avoid Wall-Clock Fragility

Do not use strict timing assertions in property tests. CI variance makes these tests flaky.

Use:
- broad upper bounds only when needed
- relative assertions between implementations
- deterministic invariants over performance micro-benchmarks

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

**Property tests are supplements, not replacements.** Most functionality should be covered by fast unit tests.

```typescript
describe('Category Mapping', () => {
  // ✅ Unit tests for specific cases (primary coverage)
  it('maps Jacket to jacket slot', () => {
    expect(mapCategory('Jacket')).toBe('jacket');
  });
  
  it('maps Overshirt to jacket slot', () => {
    expect(mapCategory('Overshirt')).toBe('jacket');
  });
  
  // ✅ Property test for edge cases (supplemental coverage)
  it('always returns valid slot for any category', () => {
    fc.assert(fc.property(
      validCategoryArb,
      (category) => {
        const slot = mapCategory(category);
        expect(VALID_SLOTS).toContain(slot);
        return true;
      }
    ), { numRuns: 3 });
  });
});
```

### 2. Use Property Tests for Critical Invariants

```typescript
// ✅ Good use: Testing critical data integrity
it('migration preserves all items', () => {
  fc.assert(fc.property(
    fc.array(oldFormatItemArb),
    (oldItems) => {
      const newItems = migrateItems(oldItems);
      expect(newItems.length).toBe(oldItems.length);
      return true;
    }
  ), { numRuns: 5 });
});

// ❌ Avoid: Testing trivial properties
it('array length is non-negative', () => {
  fc.assert(fc.property(
    fc.array(fc.anything()),
    (arr) => arr.length >= 0 // Trivial, remove this test
  ));
});
```

## Documentation Standards

### 1. Property Description

Always document the universal property being tested:

```typescript
/**
 * Property: Category Independence
 * Changing one category should not affect other categories
 */
it('maintains category independence', () => {
  fc.assert(fc.property(/* ... */), { numRuns: 3 });
});
```

### 2. Generator Documentation

Document complex generators:

```typescript
/**
 * Generates realistic wardrobe items with valid category relationships
 * Ensures formality_score is between 1-10
 */
const realisticWardrobeItemArb = fc.record({
  // ...
});
```

## When to Remove Property Tests

Property tests are expensive. Remove them if:

1. **They're slow** (>100ms) without providing unique value
2. **They duplicate unit test coverage** - if unit tests already cover the behavior
3. **They test trivial properties** - obvious invariants that can't realistically break
4. **They require extensive mocking** - indicates testing at wrong level
5. **They're flaky** - property tests should be deterministic

**Remember**: A few well-chosen property tests are better than many redundant ones.

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

### 3. Using Property Tests as a Crutch

```typescript
// ❌ Don't use property tests to avoid writing specific test cases
it('handles all inputs', () => {
  fc.assert(fc.property(
    fc.anything(),
    (input) => {
      // Vague assertion that doesn't test anything meaningful
      expect(processInput(input)).toBeDefined();
    }
  ));
});

// ✅ Write specific unit tests for known cases
it('handles valid input', () => {
  expect(processInput(validInput)).toBe(expectedOutput);
});

it('rejects invalid input', () => {
  expect(() => processInput(invalidInput)).toThrow();
});
```

### 4. Invalid Domain Generation

Generating invalid schema data by default causes noisy failures and obscures real regressions.

Rules:
- Default generators should produce schema-valid values (including UUID format and required fields).
- Use separate, explicit generators for rejection/error-path properties.

## Decision Guide: Property Test vs Unit Test

| Scenario | Use Property Test? | Rationale |
|----------|-------------------|-----------|
| Core business logic with complex inputs | ✅ Yes | Catches edge cases unit tests miss |
| Data transformation preserving invariants | ✅ Yes | Verifies universal properties |
| Simple CRUD operations | ❌ No | Unit tests are faster and clearer |
| UI component rendering | ❌ No | Too slow, too fragile |
| API endpoint behavior | ❌ No | Integration tests are better |
| Trivial getters/setters | ❌ No | Not worth the overhead |
| Already covered by unit tests | ❌ No | Redundant coverage |

## Conclusion

Property-based testing is a specialized tool for critical business logic:

1. **Use sparingly**: Only for complex logic with universal properties
2. **Keep fast**: numRuns: 3-10, target <100ms per test
3. **Complement unit tests**: Don't replace them
4. **Test pure functions**: Avoid UI, mocking, and I/O
5. **Remove liberally**: Delete slow, redundant, or trivial property tests

**Remember**: Most functionality should be covered by fast unit tests. Property tests are for catching edge cases in critical algorithms where they provide unique value.
