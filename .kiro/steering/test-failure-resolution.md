# Test Failure Resolution Guide

This document provides systematic approaches to diagnosing and fixing test failures quickly. The goal is fast resolution with minimal overhead while maintaining confidence in critical functionality.

## Core Philosophy

**Fix, Refactor, or Remove**: Every failing test should be evaluated against these criteria:
1. Does it protect core functionality (business logic, security, critical workflows)?
2. Is the behavior already covered by another test?
3. Is it asserting unstable details (layout, styling, implementation)?
4. Can the same risk be covered with a simpler test?

**If the answer trends toward "no," remove it rather than fixing it.**

## Quick Decision Tree

When a test fails:
1. **Is this testing core functionality?** (business logic, security, data integrity, API contracts)
   - Yes → Fix the test or code
   - No → Consider removing the test

2. **Is this already covered elsewhere?**
   - Yes → Remove the duplicate test
   - No → Continue evaluation

3. **Is this asserting implementation details?** (exact styling, internal state, private methods)
   - Yes → Remove or refactor to test behavior
   - No → Fix appropriately

4. **Is the test brittle or flaky?**
   - Yes → Can it be simplified? If not, remove it
   - No → Fix the underlying issue

## Failure Classification

### 0. Suite Hang / Worker Crash

**Symptoms**:
- Test run stalls after a passing test line
- Unhandled rejection with `Channel closed` / `ERR_IPC_CHANNEL_CLOSED`
- Random file appears to be "the problem" on each run

**Common Causes**:
- Leaked timers, intervals, event listeners, or unresolved async tasks
- Global `window`/`document`/`globalThis` mutation not restored
- Runtime mismatch (Deno-style imports/tests running in Vitest)
- Async completion trying to update React state after component unmount/teardown
- Query/cache instances left alive after test completion

**Fast Resolution**:
1. Re-run in run-once mode: `npm run test:run`
2. Isolate file: `npm run test:run -- <path-to-test>`
3. Add/verify `afterEach` cleanup (`vi.restoreAllMocks`, `vi.useRealTimers`)
4. Remove Deno-only imports (`https://...`) from Vitest test paths
5. Ensure async loaders/effects ignore late completion after unmount
6. Clear local query/cache clients created in the test
7. If still hanging, bisect test files by directory until offending file is isolated

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

// ✅ Solution 1: Use role-based selectors (preferred)
screen.getByRole('button', { name: 'Blue Jacket' });

// ✅ Solution 2: Use test IDs for unique identification
screen.getByTestId(`item-${itemId}`);

// ⚠️ Last resort: Use getAllBy (indicates potential test design issue)
const jacketElements = screen.getAllByText('Blue Jacket');
const firstJacket = jacketElements[0];
```

#### Element Not Found
```typescript
// First: Verify the test is valuable
// Is this testing core functionality or just implementation details?

// ❌ Problem: Element rendered conditionally
screen.getByText('Save Button'); // Fails if button is disabled/hidden

// ✅ Solution 1: Use semantic, stable selectors
screen.getByRole('button', { name: /save/i }); // Case-insensitive, flexible

// ✅ Solution 2: Wait for async operations (only when necessary)
await waitFor(() => {
  expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
});

// ⚠️ Avoid: Conditional checks that hide real issues
const saveButton = screen.queryByText('Save Button');
if (saveButton) {
  fireEvent.click(saveButton); // This masks problems
}
```

### 2. Timing Issues

**Symptoms**:
- Tests pass sometimes, fail other times (flaky tests)
- "Element not found" in async operations
- "Expected element to be in document"

**Decision**: Flaky tests are expensive. Fix once, or remove.

**Solutions**:

#### Async Operations
```typescript
// ❌ Problem: Not waiting for async operations
fireEvent.click(submitButton);
expect(screen.getByText('Success')).toBeInTheDocument(); // Fails

// ✅ Solution: Use waitFor with deterministic checks
fireEvent.click(submitButton);
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// ⚠️ Avoid: Arbitrary timeouts
await new Promise(resolve => setTimeout(resolve, 1000)); // Brittle
```

#### Post-Teardown Async Errors
```typescript
// Symptom: "window is not defined" or setState warnings after tests finish
// Cause: async completion runs after component unmount / test teardown

// ✅ Fix in component code: ignore late completions
const isMountedRef = useRef(true);
useEffect(() => () => { isMountedRef.current = false; }, []);
// Before setState in async completion:
if (!isMountedRef.current) return;
```

#### State Updates
```typescript
// ✅ Wait for state updates with Testing Library utilities
fireEvent.change(input, { target: { value: 'new value' } });
await waitFor(() => {
  expect(input).toHaveValue('new value');
});

// ⚠️ Avoid: Testing React internals
// Don't test state directly, test observable behavior
```

### 3. Mock Issues

**Symptoms**:
- "Cannot read property of undefined"
- Unexpected function calls
- Mock functions not being called

**Decision**: Excessive mocking indicates over-testing implementation. Consider testing at a higher level or removing the test.

**Solutions**:

#### Mock Setup
```typescript
// ✅ Complete, realistic mock interfaces
vi.mock('@/lib/hooks/use-categories', () => ({
  useCategories: () => ({
    data: mockCategories,
    isLoading: false,
    error: null,
    refetch: vi.fn()
  })
}));

// ⚠️ Avoid: Mocking everything
// If you're mocking 5+ dependencies, reconsider the test design
```

#### Mock Data Consistency
```typescript
// ✅ Provide realistic default data with factory functions
const createMockCategory = (overrides = {}) => ({
  id: 'test-id',
  name: 'Test Category',
  is_anchor_item: true,
  display_order: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});

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
// ✅ Centralized test data creation with TypeScript types
const createMockCategory = (overrides: Partial<Category> = {}): Category => ({
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

### 5. Framework Warning Floods

**Symptoms**:
- Repeated warning lines drown out useful failure output
- Typical example: Next.js image quality misconfiguration warning

**Resolution**:
- Treat warning floods as failures to fix, not noise to ignore.
- Align config and test inputs so warnings are not emitted.
- For `next/image` quality warnings, either:
  - add the used quality values to `next.config` `images.qualities`, or
  - update tests/components to use configured values only.
- Keep one-time known warning filtering in global test setup only when upstream behavior cannot be changed.

## Fast Debugging Process

### Step 1: Evaluate Test Value (30 seconds)

Ask yourself:
1. **Does this test protect critical functionality?** (business logic, security, data integrity, API contracts)
2. **Would a user notice if this broke?**
3. **Is this testing implementation details?** (styling, internal state, component structure)

**If answers are "no," delete the test immediately. Don't waste time fixing low-value tests.**

### Step 2: Quick Diagnosis (1-2 minutes)

#### For Selector Issues:
```typescript
// Debug: See what's actually rendered
screen.debug();
screen.logTestingPlaygroundURL(); // Get better selector suggestions
```

#### For Mock Issues:
```typescript
// Debug: Verify mock behavior
console.log(mockFunction.mock.calls);
```

#### For Data Issues:
```typescript
// Debug: Compare expected vs actual
console.log({ expected: expectedData, actual: actualData });
```

### Step 3: Apply Fast Fix or Remove (5 minutes max)

**If you can't fix it in 5 minutes, remove it.**

For suite-level hangs, this rule applies after isolation: remove or rewrite the offending low-value test rather than leaving the suite unstable.

#### Priority 1: Use Stable Selectors
```typescript
// ✅ Semantic, stable selectors
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText('Email');
```

#### Priority 2: Fix Timing
```typescript
// ✅ Deterministic async handling
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

#### Priority 3: Simplify or Remove
- If the test requires complex mocking, consider testing at a higher level
- If the test is brittle, remove it and add a simpler integration test
- If the test duplicates coverage, remove it

## Common Patterns and Fast Solutions

### Pattern 1: Requirements Changed

**Problem**: Tests fail after feature changes

**Decision Tree**:
1. Is the old behavior still required? → No → **Remove test**
2. Is the new behavior critical? → Yes → **Update test**
3. Is this covered elsewhere? → Yes → **Remove test**

```typescript
// ✅ Update test data to match new requirements
const mockCategories = [
  createMockCategory({ name: 'Jacket' }),
  createMockCategory({ name: 'Overshirt' })
];

// ✅ Update assertions
expect(screen.getByText('Jacket')).toBeInTheDocument();
```

### Pattern 2: Component Refactored

**Problem**: Tests fail after component restructuring

**Decision**: If you're testing implementation details, remove the test.

```typescript
// ❌ Remove: Testing internal structure
expect(wrapper.find('.internal-class')).toHaveLength(1);

// ✅ Keep: Testing user-facing behavior
expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
```

### Pattern 3: Business Logic Changed

**Problem**: Tests fail because core logic changed

**Decision**: Update tests to match new business rules.

```typescript
// ✅ Update expectations to match new logic
expect(calculateScore(outfit)).toBe(expectedNewScore);
expect(mapCategoryToSlot('Jacket')).toBe('jacket');
```

## Prevention: Write Better Tests

### 1. Stable Selectors (Vercel Best Practice)

```typescript
// ✅ Semantic HTML with role-based selectors
<button onClick={handleClick}>Submit</button>
screen.getByRole('button', { name: /submit/i });

// ✅ Proper labels for form controls
<label htmlFor="email">Email</label>
<input id="email" type="email" />
screen.getByLabelText('Email');

// ❌ Avoid: Fragile selectors
screen.getByText('Submit'); // Breaks if text changes
document.querySelector('.btn-primary'); // Breaks if CSS changes
```

### 2. Behavior-Based Assertions

```typescript
// ✅ Test observable behavior
expect(screen.getByRole('button')).toBeEnabled();
expect(screen.getByText(/success/i)).toBeInTheDocument();

// ❌ Avoid: Implementation details
expect(component.state.isLoading).toBe(false);
expect(wrapper.find('.internal-class')).toHaveLength(1);
```

### 3. Minimal Mocking

```typescript
// ✅ Mock only external dependencies
vi.mock('@/lib/api/client');

// ❌ Avoid: Mocking everything
vi.mock('@/components/Button');
vi.mock('@/lib/utils/format');
vi.mock('@/lib/hooks/use-state');
// ... 10 more mocks (indicates test design problem)
```

### 4. Test Isolation

```typescript
// ✅ Clean state between tests
beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});

// ✅ Avoid shared mutable state
// Each test should be independent
```

## Fix vs Remove Decision Matrix

| Scenario | Action | Rationale |
|----------|--------|-----------|
| Test protects business logic | **Fix** | Core functionality must be verified |
| Test protects security/permissions | **Fix** | Critical for data safety |
| Test protects API contracts | **Fix** | Users depend on stable APIs |
| Test checks exact styling | **Remove** | Implementation detail, not user-facing behavior |
| Test checks internal state | **Remove** | Implementation detail, brittle |
| Test duplicates another test | **Remove** | Redundant coverage |
| Test requires 5+ mocks | **Refactor or Remove** | Over-testing implementation |
| Test is flaky (timing issues) | **Fix once or Remove** | Flaky tests are expensive |
| Test takes >1 second | **Optimize or Remove** | Slow tests reduce confidence |
| Test fails after refactor | **Evaluate** | Is it testing behavior or implementation? |

## Non-Negotiables

1. **Never weaken assertions to make tests pass** - Fix the root cause or remove the test
2. **Never add arbitrary timeouts** - Use deterministic waits or remove the test
3. **Never skip flaky tests** - Fix immediately or remove
4. **Never test implementation details** - Test user-facing behavior only
5. **Keep test runtime proportional to confidence gained** - Slow tests must provide high value

## Conclusion

**Speed is a feature.** Fast failure resolution requires:
1. **Ruthless prioritization**: Only test what matters
2. **Quick decisions**: Fix in 5 minutes or remove
3. **Stable patterns**: Use semantic selectors and behavior-based assertions
4. **Lean suite**: Remove redundant and low-value tests

**Remember**: A small suite of high-confidence tests is better than a large suite of brittle tests. When in doubt, remove the test.
