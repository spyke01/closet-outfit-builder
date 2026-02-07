import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  renderIf,
  renderIfElse,
  renderNumber,
  renderArray,
  Activity,
  isSafeToRender,
  safeRender,
} from '../conditional-rendering';

describe('Conditional Rendering Utilities', () => {
  describe('renderIf', () => {
    it('should render element when condition is true', () => {
      const result = renderIf(true, <div>Content</div>);
      expect(result).not.toBeNull();
    });

    it('should return null when condition is false', () => {
      const result = renderIf(false, <div>Content</div>);
      expect(result).toBeNull();
    });
  });

  describe('renderIfElse', () => {
    it('should render true element when condition is true', () => {
      const result = renderIfElse(
        true,
        <div>True</div>,
        <div>False</div>
      );
      
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('True');
    });

    it('should render false element when condition is false', () => {
      const result = renderIfElse(
        false,
        <div>True</div>,
        <div>False</div>
      );
      
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('False');
    });
  });

  describe('renderNumber', () => {
    it('should render when number is positive', () => {
      const result = renderNumber(5, (n) => <div>{n}</div>);
      expect(result).not.toBeNull();
    });

    it('should not render when number is 0', () => {
      const result = renderNumber(0, (n) => <div>{n}</div>);
      expect(result).toBeNull();
    });

    it('should not render when number is NaN', () => {
      const result = renderNumber(NaN, (n) => <div>{n}</div>);
      expect(result).toBeNull();
    });

    it('should not render when value is null', () => {
      const result = renderNumber(null, (n) => <div>{n}</div>);
      expect(result).toBeNull();
    });

    it('should not render when value is undefined', () => {
      const result = renderNumber(undefined, (n) => <div>{n}</div>);
      expect(result).toBeNull();
    });

    it('should render negative numbers', () => {
      const result = renderNumber(-5, (n) => <div>{n}</div>);
      expect(result).not.toBeNull();
    });
  });

  describe('renderArray', () => {
    it('should render when array has items', () => {
      const result = renderArray([1, 2, 3], (arr) => <div>{arr.length}</div>);
      expect(result).not.toBeNull();
    });

    it('should not render when array is empty', () => {
      const result = renderArray([], (arr) => <div>{arr.length}</div>);
      expect(result).toBeNull();
    });

    it('should not render when array is null', () => {
      const result = renderArray(null, (arr) => <div>{arr.length}</div>);
      expect(result).toBeNull();
    });

    it('should not render when array is undefined', () => {
      const result = renderArray(undefined, (arr) => <div>{arr.length}</div>);
      expect(result).toBeNull();
    });
  });

  describe('Activity', () => {
    it('should render children when show is true', () => {
      render(
        <Activity show={true}>
          <div data-testid="content">Content</div>
        </Activity>
      );
      
      const content = screen.getByTestId('content');
      expect(content).toBeInTheDocument();
      expect(content.parentElement).toHaveStyle({ visibility: 'visible' });
    });

    it('should hide children when show is false', () => {
      render(
        <Activity show={false}>
          <div data-testid="content">Content</div>
        </Activity>
      );
      
      const content = screen.getByTestId('content');
      expect(content).toBeInTheDocument();
      expect(content.parentElement).toHaveStyle({ visibility: 'hidden' });
    });

    it('should preserve DOM when hidden by default', () => {
      const { rerender } = render(
        <Activity show={true}>
          <div data-testid="content">Content</div>
        </Activity>
      );
      
      const content = screen.getByTestId('content');
      expect(content).toBeInTheDocument();
      
      rerender(
        <Activity show={false}>
          <div data-testid="content">Content</div>
        </Activity>
      );
      
      // Content should still be in DOM
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should use display none when preserveDOM is false', () => {
      render(
        <Activity show={false} preserveDOM={false}>
          <div data-testid="content">Content</div>
        </Activity>
      );
      
      const content = screen.getByTestId('content');
      expect(content.parentElement).toHaveStyle({ display: 'none' });
    });

    it('should apply custom className', () => {
      render(
        <Activity show={true} className="custom-class">
          <div data-testid="content">Content</div>
        </Activity>
      );
      
      const content = screen.getByTestId('content');
      expect(content.parentElement).toHaveClass('custom-class');
    });

    it('should disable pointer events when hidden', () => {
      render(
        <Activity show={false}>
          <div data-testid="content">Content</div>
        </Activity>
      );
      
      const content = screen.getByTestId('content');
      expect(content.parentElement).toHaveStyle({ pointerEvents: 'none' });
    });
  });

  describe('isSafeToRender', () => {
    it('should return false for 0', () => {
      expect(isSafeToRender(0)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(isSafeToRender(NaN)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isSafeToRender('')).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(isSafeToRender([])).toBe(false);
    });

    it('should return false for null', () => {
      expect(isSafeToRender(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isSafeToRender(undefined)).toBe(false);
    });

    it('should return false for boolean false', () => {
      expect(isSafeToRender(false)).toBe(false);
    });

    it('should return true for positive numbers', () => {
      expect(isSafeToRender(1)).toBe(true);
      expect(isSafeToRender(42)).toBe(true);
    });

    it('should return true for negative numbers', () => {
      expect(isSafeToRender(-1)).toBe(true);
    });

    it('should return true for non-empty strings', () => {
      expect(isSafeToRender('text')).toBe(true);
    });

    it('should return true for non-empty arrays', () => {
      expect(isSafeToRender([1, 2, 3])).toBe(true);
    });

    it('should return true for boolean true', () => {
      expect(isSafeToRender(true)).toBe(true);
    });

    it('should return true for objects', () => {
      expect(isSafeToRender({})).toBe(true);
      expect(isSafeToRender({ key: 'value' })).toBe(true);
    });
  });

  describe('safeRender', () => {
    it('should render when condition is safe', () => {
      const result = safeRender(5, <div>Content</div>);
      expect(result).not.toBeNull();
    });

    it('should not render when condition is 0', () => {
      const result = safeRender(0, <div>Content</div>);
      expect(result).toBeNull();
    });

    it('should not render when condition is NaN', () => {
      const result = safeRender(NaN, <div>Content</div>);
      expect(result).toBeNull();
    });

    it('should not render when condition is empty string', () => {
      const result = safeRender('', <div>Content</div>);
      expect(result).toBeNull();
    });

    it('should not render when condition is empty array', () => {
      const result = safeRender([], <div>Content</div>);
      expect(result).toBeNull();
    });
  });
});
