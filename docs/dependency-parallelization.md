# Dependency-Based Parallelization

This document explains how to use the dependency-based parallelization utility to optimize async operations in API routes and server components.

## Overview

Traditional approaches to async operations have limitations:
- **Sequential execution**: Slow, but simple
- **Promise.all()**: Fast, but requires complete independence

**Dependency-based parallelization** provides the best of both worlds:
- Executes operations in parallel when possible
- Respects dependencies between operations
- Automatically determines optimal execution order

## Basic Usage

### Simple Example

```typescript
import { executeWithDependencies } from '@/lib/utils/dependency-parallelization';

const result = await executeWithDependencies({
  // No dependencies - runs immediately
  user: async () => fetchUser(),
  
  // Depends on user - runs after user completes
  posts: async ({ user }) => fetchPosts(user.id),
  
  // Depends on user - runs in parallel with posts
  comments: async ({ user }) => fetchComments(user.id),
  
  // Depends on both posts and comments - runs after both complete
  stats: async ({ posts, comments }) => ({
    postCount: posts.length,
    commentCount: comments.length
  })
});

// Execution order: user → (posts, comments in parallel) → stats
// Result: { user, posts, comments, stats }
```

### Fluent API

```typescript
import { createExecutor } from '@/lib/utils/dependency-parallelization';

const result = await createExecutor()
  .add('config', async () => loadConfig())
  .addDependent('auth', async ({ config }) => authenticate(config))
  .addDependent('data', async ({ auth }) => fetchData(auth))
  .execute();
```

## Real-World Examples

### API Route Optimization

**Before: Sequential execution (slow)**
```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const items = await supabase.from('wardrobe_items').select('*');
  const categories = await supabase.from('categories').select('*');
  const preferences = await supabase.from('user_preferences').select('*');
  
  return NextResponse.json({ items, categories, preferences });
}
```

**After: Dependency-based parallelization (fast)**
```typescript
import { executeWithDependencies } from '@/lib/utils/dependency-parallelization';

export async function GET(request: NextRequest) {
  try {
    const result = await executeWithDependencies({
      // Authentication check (no dependencies)
      auth: async () => {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) throw new Error('Unauthorized');
        return { supabase, user };
      },
      
      // These three queries run in parallel after auth completes
      items: async ({ auth }) => {
        const { data } = await auth.supabase
          .from('wardrobe_items')
          .select('*')
          .eq('user_id', auth.user.id);
        return data;
      },
      
      categories: async ({ auth }) => {
        const { data } = await auth.supabase
          .from('categories')
          .select('*')
          .eq('user_id', auth.user.id);
        return data;
      },
      
      preferences: async ({ auth }) => {
        const { data } = await auth.supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', auth.user.id);
        return data;
      },
    });
    
    return NextResponse.json({
      items: result.items,
      categories: result.categories,
      preferences: result.preferences,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}
```

### Complex Dependency Chains

```typescript
const result = await executeWithDependencies({
  // Level 1: No dependencies
  config: async () => loadConfig(),
  
  // Level 2: Depends on config
  auth: async ({ config }) => authenticate(config),
  
  // Level 3: Depends on auth (runs in parallel)
  user: async ({ auth }) => fetchUser(auth.token),
  profile: async ({ auth }) => fetchProfile(auth.token),
  settings: async ({ auth }) => fetchSettings(auth.token),
  
  // Level 4: Depends on multiple level 3 tasks
  dashboard: async ({ user, profile, settings }) => ({
    userName: user.name,
    avatar: profile.avatar,
    theme: settings.theme,
  }),
});
```

### Image Upload with Validation

```typescript
export async function POST(request: NextRequest) {
  const result = await executeWithDependencies({
    // Start parsing form data immediately
    formData: async () => request.formData(),
    
    // Start auth check in parallel
    auth: async () => {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw new Error('Unauthorized');
      return { supabase, user };
    },
    
    // Validate file after form data is parsed
    file: async ({ formData }) => {
      const imageFile = formData.get('image') as File;
      if (!imageFile) throw new Error('No image provided');
      
      // Validate file properties
      FileValidationSchema.parse({
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type,
      });
      
      return imageFile;
    },
    
    // Process image after both auth and file validation complete
    processed: async ({ auth, file }) => {
      const { data } = await auth.supabase.functions.invoke('process-image', {
        body: file,
      });
      return data;
    },
  });
  
  return NextResponse.json(result.processed);
}
```

## Performance Benefits

### Execution Time Comparison

**Sequential execution:**
```
Task A (100ms) → Task B (100ms) → Task C (100ms) = 300ms total
```

**Promise.all() (all independent):**
```
Task A (100ms) ┐
Task B (100ms) ├─ = 100ms total
Task C (100ms) ┘
```

**Dependency-based parallelization:**
```
Task A (100ms) → Task B (100ms) ┐
                 Task C (100ms) ┘ = 200ms total
```

### Real-World Impact

For a typical API route with:
- 1 auth check (50ms)
- 3 database queries (100ms each)

**Sequential:** 50ms + 100ms + 100ms + 100ms = **350ms**
**Parallelized:** 50ms + 100ms = **150ms** (2.3× faster)

## Best Practices

### 1. Identify Dependencies Correctly

```typescript
// ✅ Good: Clear dependencies
{
  user: async () => fetchUser(),
  posts: async ({ user }) => fetchPosts(user.id),  // Needs user.id
}

// ❌ Bad: Hidden dependencies
{
  user: async () => fetchUser(),
  posts: async () => fetchPosts(globalUserId),  // Uses global state
}
```

### 2. Handle Errors Appropriately

```typescript
try {
  const result = await executeWithDependencies({
    auth: async () => {
      const user = await authenticate();
      if (!user) throw new Error('Unauthorized');
      return user;
    },
    data: async ({ auth }) => fetchData(auth.id),
  });
} catch (error) {
  // Handle errors from any task
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
  );
}
```

### 3. Keep Tasks Focused

```typescript
// ✅ Good: Small, focused tasks
{
  user: async () => fetchUser(),
  posts: async ({ user }) => fetchPosts(user.id),
  comments: async ({ user }) => fetchComments(user.id),
}

// ❌ Bad: Large, monolithic tasks
{
  everything: async () => {
    const user = await fetchUser();
    const posts = await fetchPosts(user.id);
    const comments = await fetchComments(user.id);
    return { user, posts, comments };
  }
}
```

### 4. Use Early Returns for Validation

```typescript
{
  auth: async () => {
    const user = await authenticate();
    if (!user) throw new Error('Unauthorized');  // Early return
    return user;
  },
  
  data: async ({ auth }) => {
    // Only runs if auth succeeds
    return fetchData(auth.id);
  },
}
```

## TypeScript Support

The utility provides full TypeScript support with type inference:

```typescript
const result = await executeWithDependencies({
  user: async () => ({ id: '123', name: 'John' }),
  posts: async ({ user }) => {
    // TypeScript knows user has { id: string, name: string }
    return fetchPosts(user.id);
  },
});

// TypeScript knows result has:
// {
//   user: { id: string, name: string },
//   posts: Post[]
// }
```

## When to Use

### ✅ Use dependency-based parallelization when:
- You have multiple async operations with partial dependencies
- Operations can be parallelized but have some ordering constraints
- You want to optimize API route performance
- You need to maximize throughput while respecting dependencies

### ❌ Don't use when:
- All operations are completely independent (use `Promise.all()`)
- Operations must run sequentially (use `await`)
- The overhead isn't worth it (< 3 operations)

## Migration Guide

### From Sequential to Parallelized

**Step 1: Identify operations**
```typescript
// Current sequential code
const user = await fetchUser();
const posts = await fetchPosts(user.id);
const comments = await fetchComments(user.id);
const stats = await calculateStats(posts, comments);
```

**Step 2: Map dependencies**
- `user`: no dependencies
- `posts`: depends on `user`
- `comments`: depends on `user`
- `stats`: depends on `posts` and `comments`

**Step 3: Convert to parallelized**
```typescript
const result = await executeWithDependencies({
  user: async () => fetchUser(),
  posts: async ({ user }) => fetchPosts(user.id),
  comments: async ({ user }) => fetchComments(user.id),
  stats: async ({ posts, comments }) => calculateStats(posts, comments),
});
```

## Troubleshooting

### Circular Dependencies

If you see "Circular dependency detected", check for cycles:

```typescript
// ❌ Circular dependency
{
  a: async ({ b }) => processA(b),
  b: async ({ a }) => processB(a),  // Can't resolve!
}
```

### Missing Dependencies

If a task doesn't receive expected data, check parameter names:

```typescript
// ❌ Wrong parameter name
{
  user: async () => fetchUser(),
  posts: async ({ usr }) => fetchPosts(usr.id),  // Should be 'user'
}

// ✅ Correct parameter name
{
  user: async () => fetchUser(),
  posts: async ({ user }) => fetchPosts(user.id),
}
```

## Performance Monitoring

Track execution time to verify improvements:

```typescript
const start = Date.now();
const result = await executeWithDependencies({
  // ... tasks
});
const duration = Date.now() - start;

console.log(`Execution completed in ${duration}ms`);
```

## Conclusion

Dependency-based parallelization is a powerful optimization technique that:
- Reduces API response times by 2-10×
- Maintains code clarity and type safety
- Automatically handles complex dependency chains
- Provides better performance than sequential execution
- Offers more flexibility than `Promise.all()`

Use it in API routes, server components, and anywhere you have async operations with partial dependencies.
