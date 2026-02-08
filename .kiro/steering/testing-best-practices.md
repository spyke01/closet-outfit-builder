# Testing Best Practices and Failure Resolution

This document provides guidelines for writing robust tests and efficiently resolving test failures, based on lessons learned from the category split implementation and other testing experiences.

## Test Execution Guidelines

### Avoid Watch Mode in Automated Workflows

**CRITICAL**: When running tests in automated workflows, CI/CD, or agent execution contexts, ALWAYS use `npm run test:run` instead of `npm run test`.

**Problem**: The default `npm run test` command runs Vitest in watch mode, which waits for file changes and displays:
```
PASS  Waiting for file changes...
press h to show help, press q to quit
```

This causes the process to hang indefinitely, blocking automated workflows and agent execution.

**Solution**: Use the run-once command:
```bash
# ✅ CORRECT: Run tests once and exit
npm run test:run

# ❌ WRONG: Runs in watch mode (hangs)
npm run test
```

**When to use each**:
- `npm run test:run` - CI/CD, automated workflows, agent execution, pre-commit hooks
- `npm run test` - Local development with file watching

## Property-Based Testing Guidelines

### Keep Property Tests Simple and Fast

**Problem**: Complex property tests with DOM rendering and extensive mocking can hang or timeout.

**Solution**: 
- Focus on testing pure functions and business logic rather than full component rendering
- Use simple data structures and avoid complex mocking setups
- Limit `numRuns` to 3-5 for faster execution during development
- Test the core logic separately from UI interactions

**Example**:
```typescript
// ❌ Avoid: Complex component rendering in property tests
fc.assert(fc.property(
  complexDataGenerator,
  (data) => {
    render(<ComplexComponent data={data} />);
    // Complex DOM interactions...
  }
), { numRuns: 100 }); // Too many runs

// ✅ Prefer: Simple function testing
fc.assert(fc.property(
  simpleDataGenerator,
  (data) => {
    const result = pureFunction(data);
    expect(result).toSatisfyCondition();
    return true;
  }
), { numRuns: 5 }); // Reasonable number of runs
```

### Property Test Structure

**Best Practices**:
1. **Test business logic, not UI**: Extract core logic into pure functions and test those
2. **Use meaningful generators**: Create generators that produce realistic test data
3. **Keep assertions simple**: Focus on one property per test
4. **Document the property**: Clearly state what universal property is being tested

## Unit Test Resilience

### Handling Multiple Elements with Same Text

**Problem**: Tests fail with "Found multiple elements with the text: X" when DOM contains duplicate text.

**Solutions**:
1. **Use more specific selectors**:
```typescript
// ❌ Fragile: Generic text matching
screen.getByText('Blue Jacket')

// ✅ Robust: More specific selectors
screen.getByRole('button', { name: 'Blue Jacket' })
screen.getByTestId('jacket-item-blue-jacket')
```

2. **Use getAllBy when multiple elements are expected**:
```typescript
// ❌ Assumes single element
const jacketElement = screen.getByText('Blue Jacket');

// ✅ Handles multiple elements
const jacketElements = screen.getAllByText('Blue Jacket');
const jacketElement = jacketElements[0]; // Take first one
```

3. **Add data-testid attributes for reliable selection**:
```typescript
// In component
<div data-testid={`item-${item.id}`}>{item.name}</div>

// In test
screen.getByTestId(`item-${itemId}`)
```

### Mock Management

**Best Practices**:
1. **Reset mocks between tests**: Always use `vi.clearAllMocks()` in `beforeEach`
2. **Mock at the right level**: Mock hooks rather than entire modules when possible
3. **Use consistent mock data**: Create reusable mock data generators
4. **Avoid over-mocking**: Only mock what's necessary for the test

```typescript
// ✅ Good mock setup
beforeEach(() => {
  vi.clearAllMocks();
  // Reset to default mock state
  mockCategories = defaultMockCategories;
  mockItems = defaultMockItems;
});
```

## Test Data Management

### Consistent Test Data

**Problem**: Tests break when data structures change or when using inconsistent test data.

**Solution**: Create centralized test data factories:

```typescript
// test-utils/factories.ts
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

export const createMockWardrobeItem = (overrides: Partial<WardrobeItem> = {}): WardrobeItem => ({
  id: 'test-item-id',
  user_id: 'test-user-id',
  category_id: 'test-category-id',
  name: 'Test Item',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
});
```

### Data Migration Testing

**When testing data migrations**:
1. **Test with realistic data volumes**: Use generators to create varied test data
2. **Test edge cases**: Empty data, malformed data, missing fields
3. **Verify data integrity**: Ensure no data loss during transformations
4. **Test rollback scenarios**: Verify that rollbacks work correctly

## Test Failure Resolution Process

### Systematic Debugging Approach

1. **Identify the failure type**:
   - Selector issues (element not found, multiple elements)
   - Timing issues (async operations not completing)
   - Mock/data issues (incorrect test data)
   - Logic errors (actual bugs in implementation)

2. **Quick fixes for common issues**:
   - **Multiple elements**: Use `getAllBy*` or more specific selectors
   - **Element not found**: Check if element is rendered conditionally
   - **Async issues**: Add proper `waitFor` or `await` statements
   - **Mock issues**: Verify mock setup and data consistency

3. **When to update tests vs fix code**:
   - **Update tests**: When requirements have changed or tests are testing implementation details
   - **Fix code**: When tests reveal actual bugs or incorrect behavior
   - **Refactor both**: When the design has fundamentally changed

### Test Maintenance Strategy

**Regular maintenance**:
1. **Review test failures in CI**: Don't ignore flaky tests
2. **Update tests when requirements change**: Keep tests aligned with current specs
3. **Refactor brittle tests**: Replace fragile selectors and assertions
4. **Remove obsolete tests**: Delete tests for removed features

## Performance Optimization

### Fast Test Execution

1. **Minimize DOM rendering**: Test business logic separately from UI
2. **Use shallow rendering**: When full rendering isn't necessary
3. **Parallel test execution**: Ensure tests can run in parallel
4. **Efficient generators**: Use simple, fast data generators for property tests

### CI/CD Considerations

1. **Fail fast**: Run unit tests before integration tests
2. **Timeout configuration**: Set reasonable timeouts for different test types
3. **Test categorization**: Separate fast unit tests from slow integration tests
4. **Retry policies**: Configure retries for flaky tests, but fix root causes

## Category-Specific Testing Patterns

### Testing Category Changes

When implementing category splits or changes:

1. **Test mapping logic separately**: Extract category mapping to pure functions
2. **Test UI adaptation**: Verify UI components handle new categories
3. **Test data migration**: Ensure existing data is correctly transformed
4. **Test backward compatibility**: Verify old data still works

### Testing Scoring Systems

1. **Test determinism**: Same input should always produce same output
2. **Test edge cases**: Empty selections, single items, extreme values
3. **Test consistency**: Similar items should produce similar scores
4. **Test performance**: Scoring should complete within reasonable time

## Documentation Requirements

### Test Documentation

Each test file should include:
1. **Purpose statement**: What functionality is being tested
2. **Property descriptions**: For property-based tests, clearly state the universal property
3. **Setup requirements**: Any special mock or data setup needed
4. **Known limitations**: What the test doesn't cover

### Failure Documentation

When fixing test failures:
1. **Document the root cause**: Why did the test fail?
2. **Document the solution**: What was changed and why?
3. **Update related tests**: Ensure similar tests are also updated
4. **Add regression prevention**: Consider adding tests to prevent similar failures

## Tools and Utilities

### Recommended Testing Libraries

- **Unit Testing**: Vitest with Testing Library
- **Property Testing**: fast-check
- **Mocking**: Vitest's built-in mocking
- **DOM Testing**: @testing-library/react with jsdom

### Custom Test Utilities

Create project-specific utilities:
```typescript
// test-utils/index.ts
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

export const waitForLoadingToFinish = () => 
  waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
```

## Conclusion

Following these guidelines will help create more robust, maintainable tests that are less likely to break during refactoring and easier to debug when they do fail. The key principles are:

1. **Simplicity**: Keep tests simple and focused
2. **Reliability**: Use stable selectors and proper async handling
3. **Maintainability**: Structure tests for easy updates
4. **Performance**: Optimize for fast execution
5. **Documentation**: Document test purpose and failure resolution

Remember: Tests should give confidence in the code, not become a maintenance burden.