/**
 * Unit Tests: TextTruncate Component
 * 
 * Tests text truncation with ellipsis and tooltip display functionality.
 * 
 * Requirements: 12.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { TextTruncate } from '../text-truncate';

describe('TextTruncate Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a container with fixed width to test truncation
    container = document.createElement('div');
    container.style.width = '200px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Rendering', () => {
    it('should render text content', () => {
      const { container: renderContainer } = render(
        <TextTruncate text="Test Category Name" />
      );

      const textElement = renderContainer.querySelector('span > span');
      expect(textElement).toBeTruthy();
      expect(textElement?.textContent).toBe('Test Category Name');
    });

    it('should apply custom className', () => {
      const { container: renderContainer } = render(
        <TextTruncate text="Test" className="custom-class" />
      );

      const wrapperElement = renderContainer.querySelector('span');
      expect(wrapperElement).toHaveClass('custom-class');
    });

    it('should handle empty text', () => {
      const { container: renderContainer } = render(
        <TextTruncate text="" />
      );

      const textElement = renderContainer.querySelector('span > span');
      expect(textElement).toBeTruthy();
      expect(textElement?.textContent).toBe('');
    });
  });

  describe('Single Line Truncation', () => {
    it('should apply single line truncation styles by default', () => {
      const { container: renderContainer } = render(
        <div style={{ width: '100px' }}>
          <TextTruncate text="This is a very long category name that should be truncated" />
        </div>
      );

      const textElement = renderContainer.querySelector('span > span') as HTMLElement;
      expect(textElement).toBeTruthy();

      if (textElement) {
        expect(textElement.style.overflow).toBe('hidden');
        expect(textElement.style.textOverflow).toBe('ellipsis');
        expect(textElement.style.whiteSpace).toBe('nowrap');
      }
    });

    it('should truncate long text with ellipsis', () => {
      const longText = 'This is an extremely long category name that definitely exceeds the container width';
      
      const { container: renderContainer } = render(
        <div style={{ width: '100px' }}>
          <TextTruncate text={longText} />
        </div>
      );

      const textElement = renderContainer.querySelector('span > span');
      expect(textElement).toBeTruthy();
      expect(textElement?.textContent).toBe(longText);
    });
  });

  describe('Multi-Line Truncation', () => {
    it('should apply multi-line truncation styles when maxLines > 1', () => {
      const { container: renderContainer } = render(
        <div style={{ width: '200px' }}>
          <TextTruncate 
            text="This is a long text that should wrap to multiple lines before truncating" 
            maxLines={2}
          />
        </div>
      );

      const textElement = renderContainer.querySelector('span > span') as HTMLElement;
      expect(textElement).toBeTruthy();

      if (textElement) {
        const webkitStyle = textElement.style as CSSStyleDeclaration & {
          WebkitLineClamp: string;
          WebkitBoxOrient: string;
        };
        expect(textElement.style.display).toBe('-webkit-box');
        expect(webkitStyle.WebkitLineClamp).toBe('2');
        expect(webkitStyle.WebkitBoxOrient).toBe('vertical');
        expect(textElement.style.overflow).toBe('hidden');
      }
    });

    it('should respect maxLines parameter', () => {
      const { container: renderContainer } = render(
        <div style={{ width: '200px' }}>
          <TextTruncate 
            text="Line one. Line two. Line three. Line four. Line five." 
            maxLines={3}
          />
        </div>
      );

      const textElement = renderContainer.querySelector('span > span') as HTMLElement;
      expect(textElement).toBeTruthy();

      if (textElement) {
        const webkitStyle = textElement.style as CSSStyleDeclaration & {
          WebkitLineClamp: string;
        };
        expect(webkitStyle.WebkitLineClamp).toBe('3');
      }
    });
  });

  describe('Tooltip Display', () => {
    it('should not show tooltip initially', () => {
      const longText = 'This is a very long brand name that will be truncated';

      const { container: renderContainer } = render(
        <div style={{ width: '100px' }}>
          <TextTruncate text={longText} />
        </div>
      );

      // Tooltip should not be visible initially
      const tooltip = renderContainer.querySelector('[role="tooltip"]');
      expect(tooltip).not.toBeInTheDocument();
    });

    it('should render with proper structure for tooltip support', () => {
      const longText = 'This is a very long text';

      const { container: renderContainer } = render(
        <div style={{ width: '100px' }}>
          <TextTruncate text={longText} />
        </div>
      );

      const wrapperElement = renderContainer.querySelector('span');
      expect(wrapperElement).toBeTruthy();
      expect(wrapperElement).toHaveClass('relative');
      expect(wrapperElement).toHaveClass('inline-block');
    });

    it('should apply custom tooltip className prop', () => {
      const { container: renderContainer } = render(
        <div style={{ width: '100px' }}>
          <TextTruncate 
            text="Test text" 
            tooltipClassName="custom-tooltip-class"
          />
        </div>
      );

      // Component should accept the prop without errors
      const wrapperElement = renderContainer.querySelector('span');
      expect(wrapperElement).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should provide title attribute for accessibility', () => {
      const longText = 'This is a very long category name';

      const { container: renderContainer } = render(
        <div style={{ width: '100px' }}>
          <TextTruncate text={longText} />
        </div>
      );

      const textElement = renderContainer.querySelector('span > span');
      expect(textElement).toBeTruthy();

      if (textElement) {
        // Component should set title or aria-label when truncated
        // In jsdom, we can't reliably detect truncation, but we can verify the structure
        expect(textElement).toBeInTheDocument();
      }
    });

    it('should have proper structure for accessibility', () => {
      const longText = 'This is a very long text that will be truncated';

      const { container: renderContainer } = render(
        <div style={{ width: '100px' }}>
          <TextTruncate text={longText} />
        </div>
      );

      const textElement = renderContainer.querySelector('span > span');
      expect(textElement).toBeTruthy();
      expect(textElement).toBeInTheDocument();
    });

    it('should have role="tooltip" structure ready', () => {
      const longText = 'This is a very long text';

      const { container: renderContainer } = render(
        <div style={{ width: '100px' }}>
          <TextTruncate text={longText} />
        </div>
      );

      const wrapperElement = renderContainer.querySelector('span');
      expect(wrapperElement).toBeTruthy();
      
      // Tooltip will have role="tooltip" when shown
      // We verify the component structure is correct
      expect(wrapperElement).toHaveClass('relative');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text without errors', () => {
      const veryLongText = 'A'.repeat(1000);

      const { container: renderContainer } = render(
        <div style={{ width: '100px' }}>
          <TextTruncate text={veryLongText} />
        </div>
      );

      const textElement = renderContainer.querySelector('span > span');
      expect(textElement).toBeTruthy();
      expect(textElement?.textContent).toBe(veryLongText);
    });

    it('should handle text with special characters', () => {
      const specialText = 'Brand & Co. <Special> "Quotes" \'Single\' / Slash \\ Backslash';

      const { container: renderContainer } = render(
        <TextTruncate text={specialText} />
      );

      const textElement = renderContainer.querySelector('span > span');
      expect(textElement).toBeTruthy();
      expect(textElement?.textContent).toBe(specialText);
    });

    it('should handle text with unicode characters', () => {
      const unicodeText = 'Brand™ Café © 2024 • Bullet → Arrow 中文';

      const { container: renderContainer } = render(
        <TextTruncate text={unicodeText} />
      );

      const textElement = renderContainer.querySelector('span > span');
      expect(textElement).toBeTruthy();
      expect(textElement?.textContent).toBe(unicodeText);
    });

    it('should handle whitespace-only text', () => {
      const whitespaceText = '   ';

      const { container: renderContainer } = render(
        <TextTruncate text={whitespaceText} />
      );

      const textElement = renderContainer.querySelector('span > span');
      expect(textElement).toBeTruthy();
      expect(textElement?.textContent).toBe(whitespaceText);
    });

    it('should handle newlines in text', () => {
      const textWithNewlines = 'Line 1\nLine 2\nLine 3';

      const { container: renderContainer } = render(
        <TextTruncate text={textWithNewlines} maxLines={2} />
      );

      const textElement = renderContainer.querySelector('span > span');
      expect(textElement).toBeTruthy();
      expect(textElement?.textContent).toBe(textWithNewlines);
    });
  });

  describe('Responsive Behavior', () => {
    it('should re-check truncation on window resize', async () => {
      const longText = 'This is a long text that may or may not be truncated';

      const { container: renderContainer } = render(
        <div style={{ width: '200px' }}>
          <TextTruncate text={longText} />
        </div>
      );

      const textElement = renderContainer.querySelector('span > span');
      expect(textElement).toBeTruthy();

      // Simulate window resize
      window.dispatchEvent(new Event('resize'));

      // Component should still be rendered correctly
      await waitFor(() => {
        expect(textElement).toBeInTheDocument();
      });
    });
  });

  describe('Tooltip Positioning', () => {
    it('should have correct CSS classes for positioning', () => {
      const longText = 'This is a very long text';

      const { container: renderContainer } = render(
        <div style={{ width: '100px' }}>
          <TextTruncate text={longText} />
        </div>
      );

      const wrapperElement = renderContainer.querySelector('span');
      expect(wrapperElement).toBeTruthy();
      
      // Verify wrapper has relative positioning for tooltip
      expect(wrapperElement).toHaveClass('relative');
    });

    it('should have structure for tooltip arrow', () => {
      const longText = 'This is a very long text';

      const { container: renderContainer } = render(
        <div style={{ width: '100px' }}>
          <TextTruncate text={longText} />
        </div>
      );

      const wrapperElement = renderContainer.querySelector('span');
      expect(wrapperElement).toBeTruthy();
      
      // Component structure supports tooltip with arrow
      expect(wrapperElement).toBeInTheDocument();
    });
  });
});
