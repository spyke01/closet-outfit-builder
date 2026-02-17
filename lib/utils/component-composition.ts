/**
 * Component Composition Optimization Utilities
 * 
 * These utilities help structure Server Components for parallel execution
 * and provide patterns for non-blocking operations.
 * 
 * **Validates: Requirements 5.5, 5.6**
 */
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ component: 'component-composition' });

/**
 * Parallel data fetching pattern for Server Components
 * 
 * Instead of sequential awaits, this pattern enables parallel execution
 * by starting all promises before awaiting any of them.
 */
export async function fetchInParallel<T extends Record<string, Promise<unknown>>>(
  promises: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const keys = Object.keys(promises) as (keyof T)[];
  const values = await Promise.all(keys.map(key => promises[key]));
  
  return keys.reduce((acc, key, index) => {
    acc[key] = values[index];
    return acc;
  }, {} as { [K in keyof T]: Awaited<T[K]> });
}

/**
 * Composition pattern for Server Components
 * 
 * Example usage:
 * 
 * // ❌ Bad: Sequential rendering
 * async function Page() {
 *   const user = await fetchUser();
 *   const posts = await fetchPosts();
 *   return (
 *     <div>
 *       <UserProfile user={user} />
 *       <PostList posts={posts} />
 *     </div>
 *   );
 * }
 * 
 * // ✅ Good: Parallel execution with composition
 * async function Page() {
 *   return (
 *     <div>
 *       <Suspense fallback={<UserSkeleton />}>
 *         <UserProfile />
 *       </Suspense>
 *       <Suspense fallback={<PostsSkeleton />}>
 *         <PostList />
 *       </Suspense>
 *     </div>
 *   );
 * }
 * 
 * async function UserProfile() {
 *   const user = await fetchUser();
 *   return <div>{user.name}</div>;
 * }
 * 
 * async function PostList() {
 *   const posts = await fetchPosts();
 *   return <div>{posts.map(renderPost)}</div>;
 * }
 */

/**
 * Type-safe wrapper for non-blocking operations
 * 
 * Note: Next.js after() is available in Next.js 15+
 * For older versions, use this pattern with fire-and-forget
 */
export function runNonBlocking(operation: () => Promise<void>): void {
  // Check if Next.js after() is available
  const maybeAfter = globalThis as typeof globalThis & {
    after?: (op: () => Promise<void>) => void;
  };

  if (typeof maybeAfter.after === 'function') {
    maybeAfter.after(operation);
  } else {
    // Fallback: Fire and forget (not recommended for production)
    operation().catch(error => {
      logger.error('Non-blocking operation failed:', error);
    });
  }
}

/**
 * Logging helper for non-blocking operations
 */
export function logAsync(message: string, data?: unknown): void {
  runNonBlocking(async () => {
    logger.debug(message, { data });
  });
}

/**
 * Analytics helper for non-blocking operations
 */
export function trackEventAsync(event: string, properties?: Record<string, unknown>): void {
  runNonBlocking(async () => {
    logger.debug('Analytics event', { event, properties });
  });
}

/**
 * Example patterns for component composition
 */

// Pattern 1: Parallel data fetching in Server Component
// async function DashboardPage() {
//   const data = await fetchInParallel({
//     user: fetchUser(),
//     stats: fetchStats(),
//     notifications: fetchNotifications(),
//   });
//   
//   return (
//     <div>
//       <UserHeader user={data.user} />
//       <StatsPanel stats={data.stats} />
//       <NotificationList notifications={data.notifications} />
//     </div>
//   );
// }

// Pattern 2: Composition with Suspense boundaries
// function DashboardPage() {
//   return (
//     <div>
//       <Suspense fallback={<HeaderSkeleton />}>
//         <UserHeader />
//       </Suspense>
//       <Suspense fallback={<StatsSkeleton />}>
//         <StatsPanel />
//       </Suspense>
//       <Suspense fallback={<NotificationsSkeleton />}>
//         <NotificationList />
//       </Suspense>
//     </div>
//   );
// }

// Pattern 3: Non-blocking operations
// async function createPost(data: PostData) {
//   const post = await db.posts.create(data);
//   
//   // Non-blocking operations
//   logAsync('Post created', { postId: post.id });
//   trackEventAsync('post_created', { postId: post.id });
//   
//   return post;
// }
