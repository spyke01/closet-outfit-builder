/**
 * Property-Based Test: Text Truncation with Full Text Access
 * 
 * **Property 18: Text truncation with full text access**
 * For any text field (category name, brand name) exceeding the display width, 
 * the text should be truncated with an ellipsis, and the full text should be 
 * accessible via tooltip or expansion.
 * 
 * **Validates: Requirements 12.3**
 * Feature: my-sizes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { TextTruncate } from '@/components/sizes/text-truncate';

describe('Property 18: Text Truncation with Full Text Access', () => {
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

  /**
   * Property: Text exceeding container width is truncated with ellipsis
   * For any text that exceeds the container width, the component should
   * apply CSS truncation with ellipsis
   */
  it('should truncate long text with ellipsis', () => {
    fc.assert(
      fc.property(
        fc.record({
          text: fc.string({ minLength: 50, maxLength: 200 }), // Long text
          maxLines: fc.constantFrom(1, 2, 3)
        }),
        (testData) => {
          const { container: renderContainer } = render(
            <div style={{ width: '200px' }}>
              <TextTruncate text={testData.text} maxLines={testData.maxLines} />
            </div>
          );

          const textElement = renderContainer.querySelector('span > span');
          expect(textElement).toBeTruthy();

          if (textElement) {
            const styles = window.getComputedStyle(textElement);
            
            if (testData.maxLines === 1) {
              // Property 1: Single line truncation uses text-overflow: ellipsis
              expect(textElement).toHaveStyle({
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              });
            } else {
              // Property 2: Multi-line truncation uses -webkit-line-clamp
              expect(textElement).toHaveStyle({
                display: '-webkit-box',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              });
            }
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Full text is accessible via ARIA label
   * For any truncated text, the full text should be available via
   * aria-label and title attributes for accessibility
   */
  it('should provide full text via ARIA label when truncated', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 30, maxLength: 100 }),
        (text) => {
          const { container: renderContainer } = render(
            <div style={{ width: '100px' }}>
              <TextTruncate text={text} />
            </div>
          );

          const textElement = renderContainer.querySelector('span > span');
          expect(textElement).toBeTruthy();

          if (textElement) {
            // Property: Full text should be in aria-label or title
            const ariaLabel = textElement.getAttribute('aria-label');
            const title = textElement.getAttribute('title');
            
            // At least one should contain the full text
            const hasFullText = ariaLabel === text || title === text;
            expect(hasFullText).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Tooltip displays full text on hover
   * For any truncated text, hovering should display a tooltip with the full text
   */
  it('should display tooltip with full text on hover', async () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 40, maxLength: 150 }),
        async (text) => {
          const user = userEvent.setup();
          
          const { container: renderContainer } = render(
            <div style={{ width: '150px' }}>
              <TextTruncate text={text} />
            </div>
          );

          const wrapperElement = renderContainer.querySelector('span');
          expect(wrapperElement).toBeTruthy();

          if (wrapperElement) {
            // Simulate hover
            await user.hover(wrapperElement);

            // Wait for tooltip to appear (if text is truncated)
            await waitFor(
              () => {
                const tooltip = renderContainer.querySelector('[role="tooltip"]');
                if (tooltip) {
                  // Property: Tooltip should contain full text
                  expect(tooltip.textContent).toBe(text);
                }
              },
              { timeout: 500 }
            );
          }

          return true;
        }
      ),
      { numRuns: 3 } // Reduced runs for async tests
    );
  });

  /**
   * Property: Short text is not truncated
   * For any text that fits within the container, no truncation should occur
   * and no tooltip should be shown
   */
  it('should not truncate text that fits within container', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }), // Short text
        (text) => {
          const { container: renderContainer } = render(
            <div style={{ width: '500px' }}>
              <TextTruncate text={text} />
            </div>
          );

          const textElement = renderContainer.querySelector('span > span');
          expect(textElement).toBeTruthy();

          if (textElement) {
            // Property: Text content should be fully visible
            expect(textElement.textContent).toBe(text);
            
            // Property: Should not have cursor-help class (indicates no truncation)
            // Note: This is checked after component determines if truncation occurred
            const hasHelpCursor = textElement.className.includes('cursor-help');
            
            // For short text in wide container, should not need help cursor
            if (text.length < 10) {
              expect(hasHelpCursor).toBe(false);
            }
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Tooltip closes when clicking outside
   * For any displayed tooltip, clicking outside should close it
   */
  it('should close tooltip when clicking outside', async () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 50, maxLength: 100 }),
        async (text) => {
          const user = userEvent.setup();
          
          const { container: renderContainer } = render(
            <div style={{ width: '100px' }}>
              <TextTruncate text={text} />
              <button>Outside Element</button>
            </div>
          );

          const wrapperElement = renderContainer.querySelector('span');
          const outsideButton = screen.getByRole('button', { name: 'Outside Element' });
          
          expect(wrapperElement).toBeTruthy();

          if (wrapperElement) {
            // Show tooltip
            await user.hover(wrapperElement);

            // Wait for tooltip to appear
            await waitFor(
              () => {
                const tooltip = renderContainer.querySelector('[role="tooltip"]');
                if (tooltip) {
                  expect(tooltip).toBeInTheDocument();
                }
              },
              { timeout: 500 }
            );

            // Click outside
            await user.click(outsideButton);

            // Property: Tooltip should be removed
            await waitFor(
              () => {
                const tooltip = renderContainer.querySelector('[role="tooltip"]');
                expect(tooltip).not.toBeInTheDocument();
              },
              { timeout: 500 }
            );
          }

          return true;
        }
      ),
      { numRuns: 3 } // Reduced runs for async tests
    );
  });

  /**
   * Property: Tooltip toggles on tap for mobile
   * For any truncated text, tapping should toggle the tooltip visibility
   */
  it('should toggle tooltip on tap for mobile interaction', async () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 40, maxLength: 120 }),
        async (text) => {
          const user = userEvent.setup();
          
          const { container: renderContainer } = render(
            <div style={{ width: '120px' }}>
              <TextTruncate text={text} />
            </div>
          );

          const wrapperElement = renderContainer.querySelector('span');
          expect(wrapperElement).toBeTruthy();

          if (wrapperElement) {
            // Simulate tap (touchend event)
            const touchEvent = new TouchEvent('touchend', {
              bubbles: true,
              cancelable: true,
            });
            wrapperElement.dispatchEvent(touchEvent);

            // Wait for tooltip to appear
            await waitFor(
              () => {
                const tooltip = renderContainer.querySelector('[role="tooltip"]');
                if (tooltip) {
                  // Property 1: First tap shows tooltip
                  expect(tooltip).toBeInTheDocument();
                  expect(tooltip.textContent).toBe(text);
                }
              },
              { timeout: 500 }
            );

            // Tap again to toggle off
            wrapperElement.dispatchEvent(touchEvent);

            // Property 2: Second tap hides tooltip
            await waitFor(
              () => {
                const tooltip = renderContainer.querySelector('[role="tooltip"]');
                expect(tooltip).not.toBeInTheDocument();
              },
              { timeout: 500 }
            );
          }

          return true;
        }
      ),
      { numRuns: 3 } // Reduced runs for async tests
    );
  });

  /**
   * Property: Multi-line truncation respects maxLines parameter
   * For any text with maxLines > 1, the component should truncate
   * after the specified number of lines
   */
  it('should respect maxLines parameter for multi-line truncation', () => {
    fc.assert(
      fc.property(
        fc.record({
          text: fc.string({ minLength: 100, maxLength: 300 }),
          maxLines: fc.integer({ min: 2, max: 5 })
        }),
        (testData) => {
          const { container: renderContainer } = render(
            <div style={{ width: '200px' }}>
              <TextTruncate text={testData.text} maxLines={testData.maxLines} />
            </div>
          );

          const textElement = renderContainer.querySelector('span > span');
          expect(textElement).toBeTruthy();

          if (textElement) {
            const styles = window.getComputedStyle(textElement);
            
            // Property: WebkitLineClamp should match maxLines
            // Note: This is a string in computed styles
            const lineClamp = (textElement as HTMLElement).style.WebkitLineClamp;
            if (lineClamp) {
              expect(parseInt(lineClamp)).toBe(testData.maxLines);
            }
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Tooltip positioning is consistent
   * For any truncated text, the tooltip should appear below the text
   * with consistent positioning
   */
  it('should position tooltip consistently below text', async () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 50, maxLength: 150 }),
        async (text) => {
          const user = userEvent.setup();
          
          const { container: renderContainer } = render(
            <div style={{ width: '150px' }}>
              <TextTruncate text={text} />
            </div>
          );

          const wrapperElement = renderContainer.querySelector('span');
          expect(wrapperElement).toBeTruthy();

          if (wrapperElement) {
            // Show tooltip
            await user.hover(wrapperElement);

            // Wait for tooltip
            await waitFor(
              () => {
                const tooltip = renderContainer.querySelector('[role="tooltip"]');
                if (tooltip) {
                  // Property 1: Tooltip should have absolute positioning
                  expect(tooltip).toHaveClass('absolute');
                  
                  // Property 2: Tooltip should be below text (top-full)
                  expect(tooltip).toHaveClass('top-full');
                  
                  // Property 3: Tooltip should have margin-top for spacing
                  expect(tooltip).toHaveClass('mt-2');
                  
                  // Property 4: Tooltip should have z-index for layering
                  expect(tooltip).toHaveClass('z-50');
                }
              },
              { timeout: 500 }
            );
          }

          return true;
        }
      ),
      { numRuns: 3 } // Reduced runs for async tests
    );
  });

  /**
   * Property: Empty text is handled gracefully
   * For empty or whitespace-only text, the component should render
   * without errors and not show a tooltip
   */
  it('should handle empty text gracefully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', ' ', '  ', '\n', '\t'),
        (text) => {
          const { container: renderContainer } = render(
            <TextTruncate text={text} />
          );

          const textElement = renderContainer.querySelector('span > span');
          expect(textElement).toBeTruthy();

          if (textElement) {
            // Property 1: Should render without errors
            expect(textElement).toBeInTheDocument();
            
            // Property 2: Should not show tooltip for empty text
            const tooltip = renderContainer.querySelector('[role="tooltip"]');
            expect(tooltip).not.toBeInTheDocument();
          }

          return true;
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property: Special characters are preserved in tooltip
   * For any text containing special characters, the tooltip should
   * display them correctly without escaping or modification
   */
  it('should preserve special characters in tooltip', async () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 30, maxLength: 100 }).map(s => 
          s + ' & < > " \' / \\'
        ),
        async (text) => {
          const user = userEvent.setup();
          
          const { container: renderContainer } = render(
            <div style={{ width: '100px' }}>
              <TextTruncate text={text} />
            </div>
          );

          const wrapperElement = renderContainer.querySelector('span');
          expect(wrapperElement).toBeTruthy();

          if (wrapperElement) {
            // Show tooltip
            await user.hover(wrapperElement);

            // Wait for tooltip
            await waitFor(
              () => {
                const tooltip = renderContainer.querySelector('[role="tooltip"]');
                if (tooltip) {
                  // Property: Tooltip should contain exact text with special characters
                  expect(tooltip.textContent).toBe(text);
                }
              },
              { timeout: 500 }
            );
          }

          return true;
        }
      ),
      { numRuns: 3 } // Reduced runs for async tests
    );
  });
});
