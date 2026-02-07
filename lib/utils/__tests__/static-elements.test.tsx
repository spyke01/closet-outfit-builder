import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import {
  isReactElement,
  getHydrationSafeScript,
  getThemeScript,
  STATIC_ELEMENT_GUIDELINES,
  createStaticComponent,
} from '../static-elements';

describe('Static Elements Utilities', () => {
  describe('isReactElement', () => {
    it('should return true for valid React elements', () => {
      const element = <div>Test</div>;
      expect(isReactElement(element)).toBe(true);
    });

    it('should return false for non-React elements', () => {
      expect(isReactElement(null)).toBe(false);
      expect(isReactElement(undefined)).toBe(false);
      expect(isReactElement('string')).toBe(false);
      expect(isReactElement(123)).toBe(false);
      expect(isReactElement({})).toBe(false);
    });
  });

  describe('getHydrationSafeScript', () => {
    it('should wrap code in IIFE', () => {
      const code = 'console.log("test");';
      const result = getHydrationSafeScript(code);
      
      expect(result).toContain('(function(){');
      expect(result).toContain('})();');
      expect(result).toContain(code);
    });

    it('should prevent global scope pollution', () => {
      const code = 'var x = 1;';
      const result = getHydrationSafeScript(code);
      
      expect(result).toBe('(function(){var x = 1;})();');
    });
  });

  describe('getThemeScript', () => {
    it('should generate theme loading script with default key', () => {
      const script = getThemeScript();
      
      expect(script).toContain('localStorage.getItem(\'theme\')');
      expect(script).toContain('document.documentElement.classList.add');
    });

    it('should use custom storage key', () => {
      const script = getThemeScript('custom-theme');
      
      expect(script).toContain('localStorage.getItem(\'custom-theme\')');
    });

    it('should include error handling', () => {
      const script = getThemeScript();
      
      expect(script).toContain('try');
      expect(script).toContain('catch');
    });
  });

  describe('STATIC_ELEMENT_GUIDELINES', () => {
    describe('shouldHoist', () => {
      it('should return true for elements with no props', () => {
        const element = <div />;
        expect(STATIC_ELEMENT_GUIDELINES.shouldHoist(element)).toBe(true);
      });

      it('should return true for elements with only children', () => {
        const element = <div>Text</div>;
        expect(STATIC_ELEMENT_GUIDELINES.shouldHoist(element)).toBe(true);
      });

      it('should return false for non-React elements', () => {
        expect(STATIC_ELEMENT_GUIDELINES.shouldHoist('string')).toBe(false);
      });
    });

    describe('shouldNotHoist', () => {
      it('should return true for elements with event handlers', () => {
        const element = <button onClick={() => {}}>Click</button>;
        expect(STATIC_ELEMENT_GUIDELINES.shouldNotHoist(element)).toBe(true);
      });

      it('should return true for elements with dynamic className', () => {
        const element = <div className="dynamic">Test</div>;
        expect(STATIC_ELEMENT_GUIDELINES.shouldNotHoist(element)).toBe(true);
      });

      it('should return true for elements with style prop', () => {
        const element = <div style={{ color: 'red' }}>Test</div>;
        expect(STATIC_ELEMENT_GUIDELINES.shouldNotHoist(element)).toBe(true);
      });

      it('should return true for non-React elements', () => {
        expect(STATIC_ELEMENT_GUIDELINES.shouldNotHoist('string')).toBe(true);
      });
    });
  });

  describe('createStaticComponent', () => {
    it('should create memoized component', () => {
      const TestComponent = ({ text }: { text: string }) => <div>{text}</div>;
      const StaticComponent = createStaticComponent(TestComponent);
      
      expect(StaticComponent).toBeDefined();
      expect(typeof StaticComponent).toBe('object');
    });

    it('should set display name when provided', () => {
      const TestComponent = () => <div>Test</div>;
      const StaticComponent = createStaticComponent(TestComponent, 'TestComponent');
      
      expect(StaticComponent.displayName).toBe('Static(TestComponent)');
    });

    it('should render correctly', () => {
      const TestComponent = ({ text }: { text: string }) => <div>{text}</div>;
      const StaticComponent = createStaticComponent(TestComponent);
      
      const { container } = render(<StaticComponent text="Hello" />);
      expect(container.textContent).toBe('Hello');
    });
  });
});
