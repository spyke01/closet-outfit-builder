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

type TaskDefinitions<TContext = any> = {
  [K: string]: TaskFunction<Partial<TContext>, any>;
};

type TaskResults<T extends TaskDefinitions> = {
  [K in keyof T]: Awaited<ReturnType<T[K]>>;
};

interface TaskNode {
  name: string;
  execute: () => Promise<any>;
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
export async function executeWithDependencies<T extends TaskDefinitions>(
  tasks: T
): Promise<TaskResults<T>> {
  const results: Partial<TaskResults<T>> = {};
  const taskNodes = new Map<string, TaskNode>();
  const completedTasks = new Set<string>();
  const runningTasks = new Map<string, Promise<any>>();

  // Build dependency graph
  for (const [name, taskFn] of Object.entries(tasks)) {
    const dependencies = extractDependencies(taskFn);
    
    taskNodes.set(name, {
      name,
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
  const executeTask = async (name: string): Promise<void> => {
    const node = taskNodes.get(name);
    if (!node || completedTasks.has(name) || runningTasks.has(name)) {
      return;
    }

    // Check if all dependencies are completed
    const allDepsCompleted = node.dependencies.every(dep => 
      completedTasks.has(dep)
    );

    if (!allDepsCompleted) {
      return;
    }

    // Start executing this task
    const taskPromise = node.execute().then(result => {
      results[name as keyof T] = result;
      completedTasks.add(name);
      runningTasks.delete(name);

      // Trigger dependent tasks
      const readyDependents = Array.from(node.dependents).filter(dependent => {
        const depNode = taskNodes.get(dependent);
        return depNode && depNode.dependencies.every(dep => completedTasks.has(dep));
      });

      return Promise.all(readyDependents.map(executeTask));
    });

    runningTasks.set(name, taskPromise);
    await taskPromise;
  };

  // Find tasks with no dependencies and start them
  const rootTasks = Array.from(taskNodes.entries())
    .filter(([_, node]) => node.dependencies.length === 0)
    .map(([name]) => name);

  if (rootTasks.length === 0) {
    throw new Error('Circular dependency detected: no tasks without dependencies');
  }

  // Execute all root tasks in parallel
  await Promise.all(rootTasks.map(executeTask));

  // Verify all tasks completed
  if (completedTasks.size !== taskNodes.size) {
    const incomplete = Array.from(taskNodes.keys()).filter(
      name => !completedTasks.has(name)
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
function extractDependencies(fn: Function): string[] {
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
function buildContext<T>(results: Partial<T>, dependencies: string[]): Partial<T> {
  const context: any = {};
  for (const dep of dependencies) {
    if (dep in results) {
      context[dep] = results[dep as keyof T];
    }
  }
  return context;
}

/**
 * Simplified API for common patterns
 */
export class DependencyExecutor<TContext = any> {
  private tasks: TaskDefinitions<TContext> = {};

  /**
   * Add a task with no dependencies
   */
  add<K extends string, R>(
    name: K,
    task: () => Promise<R>
  ): DependencyExecutor<TContext & Record<K, R>> {
    this.tasks[name] = task as any;
    return this as any;
  }

  /**
   * Add a task that depends on other tasks
   */
  addDependent<K extends string, R, D extends Partial<TContext>>(
    name: K,
    task: (deps: D) => Promise<R>
  ): DependencyExecutor<TContext & Record<K, R>> {
    this.tasks[name] = task as any;
    return this as any;
  }

  /**
   * Execute all tasks with dependency-based parallelization
   */
  async execute(): Promise<TContext> {
    return executeWithDependencies(this.tasks) as Promise<TContext>;
  }
}

/**
 * Create a new dependency executor
 */
export function createExecutor<T = {}>(): DependencyExecutor<T> {
  return new DependencyExecutor<T>();
}
