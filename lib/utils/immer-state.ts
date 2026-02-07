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
 * Utility functions for working with arrays in Immer
 */
export const immerArrayUtils = {
  /**
   * Add item to array if it doesn't exist
   */
  addUnique: <T>(array: T[], item: T, compareFn?: (a: T, b: T) => boolean) => {
    const exists = compareFn 
      ? array.some(existing => compareFn(existing, item))
      : array.includes(item);
    
    if (!exists) {
      array.push(item);
    }
  },

  /**
   * Remove item from array
   */
  remove: <T>(array: T[], predicate: (item: T) => boolean) => {
    const index = array.findIndex(predicate);
    if (index !== -1) {
      array.splice(index, 1);
    }
  },

  /**
   * Update item in array
   */
  update: <T>(array: T[], predicate: (item: T) => boolean, updater: (draft: Draft<T>) => void) => {
    const index = array.findIndex(predicate);
    if (index !== -1) {
      updater(array[index] as Draft<T>);
    }
  },

  /**
   * Replace item in array
   */
  replace: <T>(array: T[], predicate: (item: T) => boolean, newItem: T) => {
    const index = array.findIndex(predicate);
    if (index !== -1) {
      array[index] = newItem;
    }
  }
};

/**
 * Utility functions for working with objects in Immer
 * Note: These are simplified versions to avoid complex Draft type issues
 */
export const immerObjectUtils = {
  /**
   * Merge objects deeply - simplified version
   */
  merge: <T extends Record<string, unknown>>(target: Record<string, unknown>, source: Partial<T>) => {
    Object.keys(source).forEach(key => {
      const sourceValue = source[key as keyof T];
      if (sourceValue !== undefined) {
        if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          immerObjectUtils.merge(target[key] as Record<string, unknown>, sourceValue as Record<string, unknown>);
        } else {
          target[key] = sourceValue;
        }
      }
    });
  },

  /**
   * Set nested property safely - simplified version
   */
  setNested: (obj: Record<string, unknown>, path: string, value: unknown) => {
    const keys = path.split('.');
    let current: Record<string, unknown> = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    
    current[keys[keys.length - 1]] = value;
  },

  /**
   * Delete nested property safely - simplified version
   */
  deleteNested: (obj: Record<string, unknown>, path: string) => {
    const keys = path.split('.');
    let current: Record<string, unknown> = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        return; // Path doesn't exist
      }
      current = current[key] as Record<string, unknown>;
    }
    
    delete current[keys[keys.length - 1]];
  }
};

