# Test Failure Resolution Guide

This document provides systematic approaches to diagnosing and fixing test failures, based on common patterns encountered during development.

## Failure Classification

### 1. Selector Failures

**Symptoms**:
- "Unable to find element with text: X"
- "Found multiple elements with text: X"
- "Element not found by role/testid"

**Common Causes & Solutions**:

#### Multiple Elements Found
```typescript
// ❌ Problem: Generic selector finds multiple matches
screen.getByText('Blue Jacket'); // Fails if multiple items have same name

// ✅ Solution 1: Use getAllBy and select specific element
const jacketElements = screen.getAllByText('Blue Jacket');
const firstJacket = jacketElements[0];

// ✅ Solution 2: Use more specific selector
screen.getByRole('button', { name: 'Blue Jacket' });

// ✅ Solution 3: Add test IDs for unique identification
screen.getByTestId(`item-${itemId}`);
```

#### Element Not Found
```typescript
// ❌ Problem: Element rendered conditionally
screen.getByText('Save Button'); // Fails if button is disabled/hidden

// ✅ Solution 1: Check if element should exist
const saveButton = screen.queryByText('Save Button');
if (saveButton) {
  fireEvent.click(saveButton);
}

// ✅ Solution 2: Wait for element to appear
await waitFor(() => {
  expect(screen.getByText('Save Button')).toBeInTheDocument();
});

// ✅ Solution 3: Use more flexible selectors
screen.getByRole('button', { name: /save/i }); // Case-insensitive partial match
```

### 2. Timing Issues

**Symptoms**:
- Tests pass sometimes, fail other times
- "Element not found" in async operations
- "Expected element to be in document"

**Solutions**:

#### Async Operations
```typescript
// ❌ Problem: Not waiting for async operations
fireEvent.click(submitButton);
expect(screen.getByText('Success')).toBeInTheDocument(); // Fails

// ✅ Solution: Use waitFor
fireEvent.click(submitButton);
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

#### State Updates
```typescript
// ❌ Problem: React state not updated yet
fireEvent.change(input, { target: { value: 'new value' } });
expect(input.value).toBe('new value'); // May fail

// ✅ Solution: Wait for state update
fireEvent.change(input, { target: { value: 'new value' } });
await waitFor(() => {
  expect(input).toHaveValue('new value');
});
```

### 3. Mock Issues

**Symptoms**:
- "Cannot read property of undefined"
- Unexpected function calls
- Mock functions not being called

**Solutions**:

#### Mock Setup
```typescript
// ❌ Problem: Incomplete mock setup
vi.mock('@/lib/hooks/use-categories', () => ({
  useCategories: () => ({
    data: mockCategories // Missing isLoading, error, etc.
  })
}));

// ✅ Solution: Complete mock interface
vi.mock('@/lib/hooks/use-categories', () => ({
  useCategories: () => ({
    data: mockCategories,
    isLoading: false,
    error: null,
    refetch: vi.fn()
  })
}));
```

#### Mock Data Consistency
```typescript
// ❌ Problem: Inconsistent mock data
let mockCategories = []; // Empty array causes issues

// ✅ Solution: Provide realistic default data
let mockCategories = [
  createMockCategory({ name: 'Jacket' }),
  createMockCategory({ name: 'Shirt' })
];
```

### 4. Data Structure Issues

**Symptoms**:
- Type errors in tests
- "Cannot read property X of undefined"
- Unexpected data format

**Solutions**:

#### Use Factory Functions
```typescript
// ✅ Centralized test data creation
const createMockCategory = (overrides = {}) => ({
  id: 'test-id',
  name: 'Test Category',
  is_anchor_item: true,
  display_order: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

// Usage in tests
const jacketCategory = createMockCategory({ name: 'Jacket' });
```

#### Validate Test Data
```typescript
// ✅ Add validation to catch data issues early
beforeEach(() => {
  // Validate mock data structure
  mockCategories.forEach(category => {
    expect(category).toHaveProperty('id');
    expect(category).toHaveProperty('name');
  });
});
```

## Systematic Debugging Process

### Step 1: Identify Failure Type

1. **Read the error message carefully**
2. **Check the test output/stack trace**
3. **Identify which assertion failed**
4. **Determine if it's a test issue or code issue**

### Step 2: Quick Diagnosis

#### For Selector Issues:
```typescript
// Debug: Print available elements
screen.debug(); // Shows current DOM
console.log(screen.getAllByRole('button')); // Shows all buttons
```

#### For Mock Issues:
```typescript
// Debug: Check mock calls
console.log(mockFunction.mock.calls);
console.log(mockFunction.mock.results);
```

#### For Data Issues:
```typescript
// Debug: Log actual vs expected data
console.log('Expected:', expectedData);
console.log('Actual:', actualData);
console.log('Mock categories:', mockCategories);
```

### Step 3: Apply Systematic Fixes

#### 1. Update Selectors
- Make selectors more specific
- Add test IDs if needed
- Use role-based selectors

#### 2. Fix Timing
- Add waitFor for async operations
- Ensure proper cleanup between tests
- Check for race conditions

#### 3. Update Mocks
- Ensure complete mock interfaces
- Reset mocks between tests
- Verify mock data matches expected format

#### 4. Update Test Logic
- Check if test assumptions are still valid
- Update test to match new requirements
- Remove obsolete assertions

## Common Patterns and Solutions

### Pattern 1: Category Name Changes

**Problem**: Tests fail after category names change (e.g., "Jacket/Overshirt" → "Jacket", "Overshirt")

**Solution**:
```typescript
// ✅ Update test data to match new categories
const mockCategories = [
  createMockCategory({ name: 'Jacket' }),
  createMockCategory({ name: 'Overshirt' }), // Instead of 'Jacket/Overshirt'
  createMockCategory({ name: 'Shirt' })
];

// ✅ Update test assertions
expect(screen.getByText('Jacket')).toBeInTheDocument();
expect(screen.getByText('Overshirt')).toBeInTheDocument();
```

### Pattern 2: Component Interface Changes

**Problem**: Tests fail when component props or behavior changes

**Solution**:
```typescript
// ✅ Update component usage in tests
// Old: <CategoryDropdown category="Jacket/Overshirt" />
// New: <CategoryDropdown category="Jacket" />

// ✅ Update mock implementations
vi.mock('@/components/CategoryDropdown', () => ({
  CategoryDropdown: ({ category, onSelect }) => (
    <div data-testid="category-dropdown">
      <button onClick={() => onSelect('jacket-item')}>{category}</button>
    </div>
  )
}));
```

### Pattern 3: Business Logic Changes

**Problem**: Tests fail because underlying business logic changed

**Solution**:
```typescript
// ✅ Update test expectations to match new logic
// Old: Both categories map to different slots
// New: Both categories map to same slot

expect(mapCategoryToSlot('Jacket')).toBe('jacket');
expect(mapCategoryToSlot('Overshirt')).toBe('jacket'); // Same slot now
```

## Prevention Strategies

### 1. Robust Selectors

```typescript
// ✅ Use stable, semantic selectors
screen.getByRole('button', { name: /save/i });
screen.getByLabelText('Category');
screen.getByTestId('outfit-preview');

// ❌ Avoid fragile selectors
screen.getByText('Save'); // Breaks if text changes
document.querySelector('.btn-primary'); // Breaks if CSS changes
```

### 2. Flexible Assertions

```typescript
// ✅ Flexible assertions
expect(screen.getByText(/jacket/i)).toBeInTheDocument(); // Case-insensitive
expect(categories).toHaveLength(expect.any(Number)); // Any positive number
expect(result).toMatchObject({ name: expect.any(String) }); // Partial match

// ❌ Brittle assertions
expect(screen.getByText('Jacket')).toBeInTheDocument(); // Exact match only
expect(categories).toHaveLength(5); // Exact count
expect(result).toEqual(exactObject); // Exact object match
```

### 3. Test Data Management

```typescript
// ✅ Centralized test data
// test-utils/mock-data.ts
export const DEFAULT_CATEGORIES = [
  createMockCategory({ name: 'Jacket' }),
  createMockCategory({ name: 'Overshirt' }),
  createMockCategory({ name: 'Shirt' })
];

// ✅ Environment-specific data
const mockCategories = process.env.NODE_ENV === 'test' 
  ? DEFAULT_CATEGORIES 
  : PRODUCTION_CATEGORIES;
```

### 4. Test Isolation

```typescript
// ✅ Proper cleanup between tests
beforeEach(() => {
  vi.clearAllMocks();
  cleanup(); // React Testing Library cleanup
  // Reset any global state
  resetMockData();
});

afterEach(() => {
  // Additional cleanup if needed
  vi.restoreAllMocks();
});
```

## When to Update Tests vs Fix Code

### Update Tests When:
- Requirements have changed
- Test was testing implementation details
- Test assumptions are no longer valid
- UI/UX has been intentionally modified

### Fix Code When:
- Test reveals actual bug
- Business logic is incorrect
- Component behavior doesn't match requirements
- Data transformation is wrong

### Refactor Both When:
- Design has fundamentally changed
- Architecture has been updated
- New patterns are being adopted
- Performance optimizations require changes

## Documentation and Communication

### Document Fixes
When fixing tests, document:
1. **What failed**: Original error message
2. **Why it failed**: Root cause analysis
3. **How it was fixed**: Solution applied
4. **Prevention**: How to avoid similar issues

### Example Fix Documentation:
```typescript
/**
 * Fix: Updated category selectors after category split
 * 
 * Problem: Tests failed with "Found multiple elements with text: Blue Jacket"
 * Cause: Both outfit preview and item grid showed same item name
 * Solution: Used more specific selectors with roles and test IDs
 * Prevention: Added unique test IDs to all interactive elements
 */
```

## Conclusion

Effective test failure resolution requires:
1. **Systematic diagnosis**: Identify the failure type first
2. **Targeted solutions**: Apply appropriate fixes for each failure type
3. **Prevention mindset**: Write tests that are resilient to change
4. **Documentation**: Record fixes to help future debugging

Remember: Test failures are often symptoms of deeper issues. Fix the root cause, not just the symptom.