import { useCallback, useState } from 'react';
import { produce, Draft } from 'immer';

/**
 * Enhanced useState hook with Immer for immutable updates
 */
export function useImmerState<T>(initialState: T | (() => T)) {
  const [state, setState] = useState(initialState);
  
  const updateState = useCallback((updater: (draft: Draft<T>) => void) => {
    setState(current => produce(current, updater));
  }, []);
  
  const replaceState = useCallback((newState: T) => {
    setState(newState);
  }, []);
  
  return [state, updateState, replaceState] as const;
}

/**
 * Immer-based reducer hook for complex state management
 */
export function useImmerReducer<T, A>(
  reducer: (draft: Draft<T>, action: A) => void,
  initialState: T
) {
  const [state, setState] = useState(initialState);
  
  const dispatch = useCallback((action: A) => {
    setState(current => produce(current, draft => reducer(draft, action)));
  }, [reducer]);
  
  return [state, dispatch] as const;
}

/**
 * Create an Immer-based state updater function
 */
export function createImmerUpdater<T>(
  setState: React.Dispatch<React.SetStateAction<T>>
) {
  return useCallback((updater: (draft: Draft<T>) => void) => {
    setState(current => produce(current, updater));
  }, [setState]);
}

/**
 * Utility for creating immutable array operations
 */
export const immerArrayUtils = {
  /**
   * Add item to array
   */
  addItem: <T>(array: T[], item: T): T[] => 
    produce(array, draft => {
      (draft as T[]).push(item);
    }),
  
  /**
   * Remove item by index
   */
  removeByIndex: <T>(array: T[], index: number): T[] =>
    produce(array, draft => {
      (draft as T[]).splice(index, 1);
    }),
  
  /**
   * Remove item by predicate
   */
  removeBy: <T>(array: T[], predicate: (item: T) => boolean): T[] =>
    produce(array, draft => {
      const index = (draft as T[]).findIndex(predicate);
      if (index !== -1) {
        (draft as T[]).splice(index, 1);
      }
    }),
  
  /**
   * Update item by index
   */
  updateByIndex: <T>(array: T[], index: number, updater: (draft: Draft<T>) => void): T[] =>
    produce(array, draft => {
      if ((draft as T[])[index]) {
        updater((draft as T[])[index] as Draft<T>);
      }
    }),
  
  /**
   * Update item by predicate
   */
  updateBy: <T>(array: T[], predicate: (item: T) => boolean, updater: (draft: Draft<T>) => void): T[] =>
    produce(array, draft => {
      const index = (draft as T[]).findIndex(predicate);
      if (index !== -1) {
        updater((draft as T[])[index] as Draft<T>);
      }
    }),
  
  /**
   * Replace item by predicate
   */
  replaceBy: <T>(array: T[], predicate: (item: T) => boolean, newItem: T): T[] =>
    produce(array, draft => {
      const index = (draft as T[]).findIndex(predicate);
      if (index !== -1) {
        (draft as T[])[index] = newItem;
      }
    }),
  
  /**
   * Toggle item in array (add if not present, remove if present)
   */
  toggle: <T>(array: T[], item: T, compareFn?: (a: T, b: T) => boolean): T[] =>
    produce(array, draft => {
      const compare = compareFn || ((a, b) => a === b);
      const index = (draft as T[]).findIndex(existing => compare(existing, item));
      
      if (index !== -1) {
        (draft as T[]).splice(index, 1);
      } else {
        (draft as T[]).push(item);
      }
    }),
};

/**
 * Utility for creating immutable object operations
 */
export const immerObjectUtils = {
  /**
   * Deep merge objects
   */
  merge: <T extends Record<string, any>>(target: T, source: Partial<T>): T =>
    produce(target, draft => {
      // Deep merge logic
      function deepMerge(target: any, source: any) {
        for (const key in source) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key] || typeof target[key] !== 'object') {
              target[key] = {};
            }
            deepMerge(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        }
      }
      deepMerge(draft, source);
    }),
  
  /**
   * Set nested property
   */
  setNested: <T>(obj: T, path: string[], value: any): T =>
    produce(obj, draft => {
      let current: any = draft;
      for (let i = 0; i < path.length - 1; i++) {
        if (!(path[i] in current)) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
    }),
  
  /**
   * Delete property
   */
  deleteProperty: <T extends Record<string, any>>(obj: T, key: keyof T): T =>
    produce(obj, draft => {
      delete (draft as any)[key];
    }),
  
  /**
   * Update property if it exists
   */
  updateProperty: <T extends Record<string, any>, K extends keyof T>(
    obj: T,
    key: K,
    updater: (value: T[K]) => T[K]
  ): T =>
    produce(obj, draft => {
      if (key in draft) {
        (draft as any)[key] = updater((draft as any)[key]);
      }
    }),
};

/**
 * Create a memoized Immer updater for performance
 */
export function createMemoizedImmerUpdater<T, Args extends any[]>(
  updaterFactory: (...args: Args) => (draft: Draft<T>) => void
) {
  return useCallback(
    (state: T, ...args: Args): T => {
      const updater = updaterFactory(...args);
      return produce(state, updater);
    },
    [updaterFactory]
  );
}

/**
 * Batch multiple Immer operations
 */
export function batchImmerUpdates<T>(
  initialState: T,
  operations: Array<(draft: Draft<T>) => void>
): T {
  return produce(initialState, draft => {
    operations.forEach(operation => operation(draft));
  });
}

/**
 * Create a state machine with Immer
 */
export function createImmerStateMachine<State, Action>(
  initialState: State,
  transitions: Record<string, (draft: Draft<State>, action: Action) => void>
) {
  return function useStateMachine() {
    const [state, setState] = useState(initialState);
    
    const dispatch = useCallback((action: Action & { type: string }) => {
      const transition = transitions[action.type];
      if (transition) {
        setState(current => produce(current, draft => transition(draft, action)));
      }
    }, []);
    
    return [state, dispatch] as const;
  };
}