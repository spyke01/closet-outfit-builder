# Shared Library

This directory contains shared utilities, hooks, and business logic for the Next.js wardrobe application, featuring TanStack Query, Zod validation, and Immer state management.

## Architecture Overview

The data access layer is built with the following key technologies:

- **TanStack Query**: Server state management with caching, optimistic updates, and error handling
- **Zod**: Runtime type validation and schema definition
- **Immer**: Immutable state updates for complex state management
- **Supabase**: Backend database, authentication, and Edge Functions

## Core Components

### 1. Query Client Configuration (`query-client.ts`)

- Configured with proper retry logic, stale time, and cache management
- Consistent query key factory for cache invalidation
- Optimized for performance with 5-minute stale time and exponential backoff

### 2. Zod Schemas (`schemas/index.ts`)

Comprehensive validation schemas for all data models:

- `WardrobeItemSchema`: Wardrobe items with formality scores, seasons, and metadata
- `CategorySchema`: Item categories with anchor item support
- `OutfitSchema`: Complete outfits with scoring and tuck styles
- `OutfitSelectionSchema`: Real-time outfit building validation
- `UserPreferencesSchema`: User settings and preferences
- Form schemas for create/update operations

### 3. Validation Utilities (`utils/validation.ts`)

- `safeValidate()`: Safe validation with consistent error handling
- `formatZodError()`: User-friendly error message formatting
- `validateFileUpload()`: File validation with magic byte checking
- `validateMagicBytes()`: Security validation for image uploads
- Batch validation for multiple items

### 4. Immer State Management (`utils/immer-state.ts`)

- `useImmerState()`: Enhanced useState with immutable updates
- `useImmerReducer()`: Complex state management with reducers
- `immerArrayUtils`: Utility functions for array operations
- `immerObjectUtils`: Utility functions for object operations
- Memoized updaters for performance optimization

### 5. Query Validation Integration (`utils/query-validation.ts`)

- `useValidatedMutation()`: Mutations with Zod validation
- `useOptimisticMutation()`: Optimistic updates with Immer
- `useBatchMutation()`: Batch operations with validation
- `createCacheUpdaters()`: Cache management utilities
- Form mutation helpers with validation

### 6. Data Access Hooks

#### Core CRUD Hooks

- `use-wardrobe-items.ts`: Complete wardrobe item management
- `use-outfits.ts`: Outfit creation, scoring, and management
- `use-categories.ts`: Category management with ordering

#### Integrated Data Management

- `use-wardrobe-data.ts`: Comprehensive wardrobe management with UI state
- `use-wardrobe-state.ts`: Complex state management with Immer
- `use-wardrobe-mutations.ts`: Optimistic mutations with validation

### 7. Provider Setup (`providers/query-provider.tsx`)

- QueryClient provider with development tools
- Proper client instance management
- Development-only React Query DevTools

## Key Features

### Validation & Type Safety

- Runtime validation with Zod schemas
- Comprehensive error handling and user feedback
- Type-safe mutations and queries
- File upload validation with security checks

### Optimistic Updates

- Immediate UI feedback with rollback on errors
- Immer-based immutable state updates
- Cache consistency management
- Proper error boundaries

### Performance Optimization

- Intelligent caching strategies
- Query key factories for consistent invalidation
- Memoized state updaters
- Batch operations for efficiency

### Error Handling

- Structured error responses
- User-friendly error messages
- Validation error extraction
- Graceful fallbacks

## Usage Examples

### Basic Item Creation

```typescript
import { useWardrobeData } from '@/lib/hooks/use-wardrobe-data';

function CreateItemForm() {
  const { createItem, validateItemForm } = useWardrobeData();
  
  const handleSubmit = async (formData) => {
    const validation = validateItemForm(formData);
    if (validation.success) {
      await createItem.mutateAsync(validation.data);
    }
  };
}
```

### Complex State Management

```typescript
import { useImmerState } from '@/lib/utils/immer-state';

function OutfitBuilder() {
  const [state, updateState] = useImmerState({
    selection: {},
    availableItems: [],
    score: 0
  });
  
  const selectItem = (category, item) => {
    updateState(draft => {
      draft.selection[category] = item;
      draft.score = calculateScore(draft.selection);
    });
  };
}
```

### Optimistic Updates

```typescript
import { useOptimisticMutation } from '@/lib/utils/query-validation';

const updateItem = useOptimisticMutation({
  validationSchema: UpdateItemSchema,
  queryKey: ['items'],
  mutationFn: updateItemAPI,
  optimisticUpdater: (oldData, newItem) => 
    produce(oldData, draft => {
      const index = draft.findIndex(item => item.id === newItem.id);
      if (index !== -1) {
        draft[index] = { ...draft[index], ...newItem };
      }
    })
});
```

## Testing

Comprehensive test coverage includes:

- **Integration Tests**: Query client configuration and cache management
- **Validation Tests**: Zod schema validation and error handling
- **State Management Tests**: Immer state updates and immutability
- **Hook Tests**: Complete data access layer functionality
- **Mutation Tests**: Optimistic updates and error handling

### Running Tests

```bash
# Run all data layer tests
npm test -- --run lib/hooks/__tests__/data-layer-integration.test.tsx lib/utils/__tests__/zod-immer-integration.test.ts lib/hooks/__tests__/use-wardrobe-data.test.tsx

# Run specific test suites
npm test -- --run lib/hooks/__tests__/
npm test -- --run lib/utils/__tests__/
```

## Integration with Supabase

The data access layer is designed to work seamlessly with Supabase:

- **Authentication**: Automatic user ID resolution from Supabase auth
- **Database**: Type-safe queries with Row Level Security
- **Edge Functions**: Integration with business logic functions
- **Storage**: File upload with background removal processing
- **Real-time**: Ready for real-time subscriptions

## Production Ready

This implementation provides:

1. **Multi-user support** with Supabase authentication and Row Level Security
2. **Type safety** throughout the application with Zod validation
3. **Performance optimization** with intelligent caching and optimistic updates
4. **Error resilience** with proper error handling and rollback mechanisms
5. **Developer experience** with comprehensive testing and clear APIs

The shared library is production-ready and follows Next.js and React best practices for server state management, validation, and performance optimization.