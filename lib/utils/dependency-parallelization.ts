/**
 * Dependency-based parallelization utility
 * 
 * Executes async operations in parallel when possible, respecting dependencies.
 * This is more efficient than sequential execution and more flexible than Promise.all().
 * 
 * @example
 * ```typescript
 * const result = await executeWithDependencies({
 *   user: async () => fetchUser(),
 *   posts: async ({ user }) => fetchPosts(user.id),
 *   comments: async ({ user }) => fetchComments(user.id),
 *   stats: async ({ posts, comments }) => calculateStats(posts, comments)
 * });
 * // Execution order: user → (posts, comments in parallel) → stats
 * ```
 */

type TaskFunction<TContext, TResult> = (context: TContext) => Promise<TResult>;

type TaskResults<T extends Record<string, TaskFunction<Partial<TaskResults<T>>, unknown>>> = {
  [K in keyof T]: Awaited<ReturnType<T[K]>>;
};

interface TaskNode {
  name: string;
  execute: () => Promise<unknown>;
  dependencies: string[];
  dependents: Set<string>;
}

/**
 * Executes tasks with dependency-based parallelization
 * 
 * Tasks are executed as soon as their dependencies are satisfied,
 * maximizing parallelism while respecting dependency constraints.
 * 
 * @param tasks - Object mapping task names to async functions
 * @returns Promise resolving to object with all task results
 * 
 * **Validates: Requirements 4.6, 4.7**
 */
export async function executeWithDependencies<
  T extends Record<string, TaskFunction<Partial<TaskResults<T>>, unknown>>
>(
  tasks: T
): Promise<TaskResults<T>> {
  const results: Partial<TaskResults<T>> = {};
  const taskNodes = new Map<string, TaskNode>();
  const completedTasks = new Set<keyof T>();
  const runningTasks = new Map<keyof T, Promise<unknown>>();

  // Build dependency graph
  for (const [name, taskFn] of Object.entries(tasks) as [keyof T, T[keyof T]][]) {
    const dependencies = extractDependencies(
      taskFn as TaskFunction<Partial<Record<string, unknown>>, unknown>
    );
    
    taskNodes.set(String(name), {
      name: String(name),
      execute: async () => {
        const context = buildContext(results, dependencies);
        return await taskFn(context);
      },
      dependencies,
      dependents: new Set(),
    });
  }

  // Build reverse dependency graph (dependents)
  for (const [name, node] of taskNodes.entries()) {
    for (const dep of node.dependencies) {
      const depNode = taskNodes.get(dep);
      if (depNode) {
        depNode.dependents.add(name);
      }
    }
  }

  // Execute tasks in parallel when dependencies are satisfied
  const executeTask = async (name: keyof T): Promise<void> => {
    const node = taskNodes.get(String(name));
    if (!node || completedTasks.has(name) || runningTasks.has(name)) {
      return;
    }

    // Check if all dependencies are completed
    const allDepsCompleted = node.dependencies.every(dep =>
      completedTasks.has(dep as keyof T)
    );

    if (!allDepsCompleted) {
      return;
    }

    // Start executing this task
    const taskPromise = node.execute().then(result => {
      results[name] = result as TaskResults<T>[keyof T];
      completedTasks.add(name);
      runningTasks.delete(name);

      // Trigger dependent tasks
      const readyDependents = Array.from(node.dependents)
        .map(dependent => dependent as keyof T)
        .filter(dependent => {
          const depNode = taskNodes.get(String(dependent));
          return depNode && depNode.dependencies.every(dep => completedTasks.has(dep as keyof T));
        });

      return Promise.all(readyDependents.map(executeTask));
    });

    runningTasks.set(name, taskPromise);
    await taskPromise;
  };

  // Find tasks with no dependencies and start them
  const rootTasks = Array.from(taskNodes.entries())
    .filter(([, node]) => node.dependencies.length === 0)
    .map(([name]) => name as keyof T);

  if (rootTasks.length === 0) {
    throw new Error('Circular dependency detected: no tasks without dependencies');
  }

  // Execute all root tasks in parallel
  await Promise.all(rootTasks.map(executeTask));

  // Verify all tasks completed
  if (completedTasks.size !== taskNodes.size) {
    const incomplete = Array.from(taskNodes.keys()).filter(
      name => !completedTasks.has(name as keyof T)
    );
    throw new Error(
      `Circular dependency detected: tasks ${incomplete.join(', ')} could not complete`
    );
  }

  return results as TaskResults<T>;
}

/**
 * Extract parameter names from function to determine dependencies
 */
function extractDependencies(fn: TaskFunction<Partial<Record<string, unknown>>, unknown>): string[] {
  const fnStr = fn.toString();
  
  // Match various function formats:
  // async ({ dep1, dep2 }) =>
  // async function({ dep1, dep2 })
  // ({ dep1, dep2 }) =>
  // function({ dep1, dep2 })
  
  // Match the function signature up to the arrow or opening brace
  // This avoids matching object literals in the function body
  const signatureMatch = fnStr.match(/^[^(]*\(([^)]*)\)/);
  
  if (!signatureMatch) {
    return [];
  }
  
  const params = signatureMatch[1].trim();
  
  // Check if parameters are destructured
  const destructuredMatch = params.match(/^\{\s*([^}]*)\s*\}$/);
  
  if (destructuredMatch) {
    const paramList = destructuredMatch[1];
    return paramList
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
  
  // If no destructured parameters, the function has no dependencies
  return [];
}

/**
 * Build context object with only the required dependencies
 */
function buildContext<T extends Record<string, unknown>>(
  results: Partial<T>,
  dependencies: string[]
): Partial<T> {
  const context: Partial<T> = {};
  for (const dep of dependencies) {
    if (dep in results) {
      context[dep as keyof T] = results[dep as keyof T];
    }
  }
  return context;
}

/**
 * Simplified API for common patterns
 */
export class DependencyExecutor<TContext extends Record<string, unknown> = Record<string, unknown>> {
  private tasks: Record<string, TaskFunction<Partial<TContext>, unknown>> = {};

  /**
   * Add a task with no dependencies
   */
  add<K extends string, R>(
    name: K,
    task: () => Promise<R>
  ): DependencyExecutor<TContext & Record<K, R>> {
    this.tasks[name] = task as TaskFunction<Partial<TContext>, unknown>;
    return this as DependencyExecutor<TContext & Record<K, R>>;
  }

  /**
   * Add a task that depends on other tasks
   */
  addDependent<K extends string, R, D extends Partial<TContext>>(
    name: K,
    task: (deps: D) => Promise<R>
  ): DependencyExecutor<TContext & Record<K, R>> {
    this.tasks[name] = task as TaskFunction<Partial<TContext>, unknown>;
    return this as DependencyExecutor<TContext & Record<K, R>>;
  }

  /**
   * Execute all tasks with dependency-based parallelization
   */
  async execute(): Promise<TContext> {
    return executeWithDependencies(
      this.tasks as Record<string, TaskFunction<Partial<Record<string, unknown>>, unknown>>
    ) as Promise<TContext>;
  }
}

/**
 * Create a new dependency executor
 */
export function createExecutor<T extends Record<string, unknown> = Record<string, unknown>>(): DependencyExecutor<T> {
  return new DependencyExecutor<T>();
}
