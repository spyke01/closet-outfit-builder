# Testing Best Practices

This document provides guidelines for writing lean, fast, confidence-driven tests aligned with Vercel React best practices. The goal is to maintain a small suite of high-value tests that protect critical functionality without becoming a maintenance burden.

## Core Philosophy

### What We Test

**Primary Focus** (must have tests):
- **Business logic correctness**: Core algorithms, calculations, data transformations
- **Critical user flows**: Authentication, data persistence, payment processing
- **Data integrity and permissions**: RLS policies, authorization checks, data validation
- **API behavior and contracts**: Public API endpoints users depend on

**De-emphasized or Excluded** (avoid testing):
- Exact visual styling (colors, spacing, fonts)
- Layout precision and responsive breakpoints
- Internal component structure and private methods
- Snapshot tests that change frequently
- Redundant integration coverage

### Test Value Question

Every test should answer: **"If this breaks, would a user notice or data be at risk?"**

If the answer is "no," remove the test.

## Test Execution Guidelines

### Use Run-Once Mode in Automation

**CRITICAL**: Always use `npm run test:run` in CI/CD, automated workflows, and agent execution.

```bash
# ✅ CORRECT: Run tests once and exit
npm run test:run

# ❌ WRONG: Runs in watch mode (hangs indefinitely)
npm run test
```

**When to use each**:
- `npm run test:run` - CI/CD, automated workflows, agent execution, pre-commit hooks
- `npm run test` - Local development with file watching

## Writing Lean, Fast Tests

### Test Business Logic, Not UI Implementation

### Test Business Logic, Not UI Implementation

**Principle**: Extract business logic into pure functions and test those. Avoid testing component internals.

```typescript
// ❌ Avoid: Testing component implementation
test('component has correct internal state', () => {
  const { container } = render(<Component />);
  expect(container.querySelector('.internal-class')).toHaveLength(1);
});

// ✅ Prefer: Testing business logic
test('calculates outfit score correctly', () => {
  const outfit = { jacket: mockJacket, shirt: mockShirt };
  const score = calculateOutfitScore(outfit);
  expect(score).toBeGreaterThan(0);
  expect(score).toBeLessThanOrEqual(100);
});
```

### Use Semantic HTML and Stable Selectors (Vercel Best Practice)

```typescript
// ✅ Semantic HTML with ARIA
<button onClick={handleClick} aria-label="Delete item">
  <Trash2 aria-hidden="true" />
</button>

// ✅ Stable, accessible selectors
screen.getByRole('button', { name: 'Delete item' });
screen.getByLabelText('Email');

// ❌ Avoid: Fragile selectors
screen.getByText('Delete'); // Breaks if text changes
document.querySelector('.btn-delete'); // Breaks if CSS changes
```

### Minimize Mocking

**Principle**: Excessive mocking indicates over-testing implementation. Test at a higher level or remove the test.

```typescript
// ✅ Minimal mocking: Only external dependencies
vi.mock('@/lib/api/supabase-client');

test('saves wardrobe item', async () => {
  await saveWardrobeItem(mockItem);
  expect(mockSupabaseClient.from).toHaveBeenCalledWith('wardrobe_items');
});

// ❌ Avoid: Mocking everything (indicates test design problem)
vi.mock('@/components/Button');
vi.mock('@/lib/utils/format');
vi.mock('@/lib/hooks/use-state');
vi.mock('@/lib/hooks/use-effect');
vi.mock('@/lib/context/theme');
// ... 10 more mocks
```

### Keep Tests Fast

**Target**: <100ms per test, <10s total suite runtime

```typescript
// ✅ Fast: Test pure functions
test('formats date correctly', () => {
  expect(formatDate('2024-01-01')).toBe('Jan 1, 2024');
});

// ⚠️ Slow: Full component rendering (use sparingly)
test('renders outfit display', () => {
  render(<OutfitDisplay outfit={mockOutfit} />);
  expect(screen.getByRole('img')).toBeInTheDocument();
});

// ❌ Very slow: Database operations (avoid in unit tests)
test('saves to database', async () => {
  await database.save(item); // Use integration tests for this
});
```

## Property-Based Testing

### Keep Property Tests Simple and Fast

**Problem**: Complex property tests with DOM rendering can hang or timeout.

**Solution**: Test pure business logic with simple generators.

```typescript
// ❌ Avoid: Complex component rendering
fc.assert(fc.property(
  complexDataGenerator,
  (data) => {
    render(<ComplexComponent data={data} />);
    // Slow and fragile
  }
), { numRuns: 100 });

// ✅ Prefer: Pure function testing
fc.assert(fc.property(
  simpleDataGenerator,
  (data) => {
    const result = pureFunction(data);
    expect(result).toSatisfyCondition();
    return true;
  }
), { numRuns: 5 }); // Keep numRuns low (3-5)
```

### Property Test Best Practices

1. **Test business logic, not UI**: Extract core logic into pure functions
2. **Use realistic generators**: Create generators that produce valid test data
3. **Keep assertions simple**: Focus on one property per test
4. **Document the property**: Clearly state what universal property is being tested
5. **Limit numRuns**: 3-5 for development, 10-20 for CI

## Test Data Management

### Use Factory Functions

Create centralized, typed test data factories:

```typescript
// lib/test/factories.ts
export const createMockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'test-category-id',
  user_id: 'test-user-id',
  name: 'Test Category',
  is_anchor_item: true,
  display_order: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

// Usage
const jacketCategory = createMockCategory({ name: 'Jacket' });
```

### Mock Management

```typescript
// ✅ Clean state between tests
beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});

// ✅ Complete mock interfaces
vi.mock('@/lib/hooks/use-categories', () => ({
  useCategories: () => ({
    data: mockCategories,
    isLoading: false,
    error: null,
    refetch: vi.fn()
  })
}));
```

## Performance Optimization

### Fast Test Execution

**Strategies**:
1. **Minimize DOM rendering**: Test business logic separately
2. **Avoid unnecessary waits**: Use deterministic state checks
3. **Mock network calls consistently**: Don't hit real APIs
4. **Reduce data volume**: Use minimal test data
5. **Parallelize tests**: Ensure tests can run independently

```typescript
// ✅ Fast: Pure function test
test('calculates score', () => {
  expect(calculateScore(mockData)).toBe(85);
}); // <10ms

// ⚠️ Slower: Component rendering (use when necessary)
test('renders button', () => {
  render(<Button>Click</Button>);
  expect(screen.getByRole('button')).toBeInTheDocument();
}); // ~50ms

// ❌ Slow: Avoid in unit tests
test('fetches from API', async () => {
  const data = await fetch('/api/data'); // Use integration tests
});
```

### CI/CD Optimization

1. **Fail fast**: Run unit tests before integration tests
2. **Set reasonable timeouts**: Don't wait forever for flaky tests
3. **No retries**: Fix flaky tests immediately or remove them
4. **Keep suite lean**: Remove redundant tests regularly

## Vercel React Best Practices Integration

### Accessibility Testing

```typescript
// ✅ Test keyboard navigation
test('button is keyboard accessible', () => {
  render(<Button onClick={mockFn}>Submit</Button>);
  const button = screen.getByRole('button');
  
  button.focus();
  expect(button).toHaveFocus();
  
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(mockFn).toHaveBeenCalled();
});

// ✅ Test ARIA labels
test('icon button has accessible name', () => {
  render(
    <button aria-label="Delete item">
      <Trash2 aria-hidden="true" />
    </button>
  );
  expect(screen.getByRole('button', { name: 'Delete item' })).toBeInTheDocument();
});
```

### Server Component Testing

```typescript
// ✅ Test server components with async data
test('server component renders data', async () => {
  const data = await getData();
  const { container } = render(<ServerComponent data={data} />);
  expect(container).toHaveTextContent(data.title);
});
```

### Type Safety

```typescript
// ✅ Use TypeScript for test data
const mockItem: WardrobeItem = createMockWardrobeItem({
  name: 'Blue Jacket',
  category_id: 'jacket-category'
});

// ❌ Avoid: Untyped test data
const mockItem = {
  name: 'Blue Jacket',
  // Missing required fields, no type checking
};
```

## Test Maintenance Strategy

### Regular Audit Questions

1. **Does this test protect critical functionality?**
2. **Is this behavior already covered elsewhere?**
3. **Is this test brittle or flaky?**
4. **Does this test take too long to run?**
5. **Is this testing implementation details?**

**If any answer is problematic, remove or refactor the test.**

### When to Remove Tests

- Test checks exact styling (colors, spacing, fonts)
- Test checks internal component structure
- Test duplicates coverage from another test
- Test requires excessive mocking (5+ mocks)
- Test is flaky and can't be fixed quickly
- Test takes >1 second to run without high value
- Test breaks frequently during refactoring

### When to Keep Tests

- Test protects business logic
- Test verifies security/permissions
- Test validates critical user flows
- Test checks API contracts
- Test prevents data corruption
- Test is fast, stable, and valuable

## Decision Guide: Fix vs Refactor vs Remove

For any failing test, ask:

1. **Does it protect core functionality?**
   - Yes → Fix it
   - No → Continue evaluation

2. **Is the behavior already covered by another test?**
   - Yes → Remove it
   - No → Continue evaluation

3. **Is it asserting unstable details?** (styling, layout, internal state)
   - Yes → Remove or refactor to test behavior
   - No → Continue evaluation

4. **Can the same risk be covered with a simpler test?**
   - Yes → Replace with simpler test
   - No → Fix it

**If you can't fix it in 5 minutes, remove it.**

## Non-Negotiables

1. **Do not weaken assertions** just to make tests pass
2. **Do not add arbitrary timeouts** - use deterministic waits or remove
3. **Do not skip flaky tests** - fix immediately or remove
4. **Do not test implementation details** - test user-facing behavior only
5. **Keep runtime proportional to confidence** - slow tests must provide high value

## Recommended Testing Tools

- **Unit Testing**: Vitest with Testing Library
- **Property Testing**: fast-check (use sparingly)
- **Mocking**: Vitest's built-in mocking
- **DOM Testing**: @testing-library/react with jsdom
- **Accessibility**: @testing-library/jest-dom matchers

## Custom Test Utilities

```typescript
// lib/test/utils.ts
export const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};
```

## Conclusion

**Principles for a lean, confidence-driven test suite**:

1. **Prioritize ruthlessly**: Only test critical functionality
2. **Keep tests fast**: <100ms per test, <10s total suite
3. **Use stable selectors**: Semantic HTML with role-based queries
4. **Minimize mocking**: Test at higher levels when possible
5. **Remove liberally**: Delete low-value and brittle tests
6. **Test behavior, not implementation**: Focus on user-facing outcomes

**Remember**: A small suite of high-confidence tests beats a large suite of brittle tests. When in doubt, remove the test.