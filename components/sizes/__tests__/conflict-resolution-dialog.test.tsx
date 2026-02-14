/**
 * Unit tests for ConflictResolutionDialog component
 * 
 * Tests:
 * - Conflict display
 * - Resolution options
 * - Side-by-side comparison
 * - Multiple conflicts handling
 * 
 * Requirements: 12.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConflictResolutionDialog } from '../conflict-resolution-dialog';
import type { SyncConflict } from '@/lib/utils/offline-sync';

describe('ConflictResolutionDialog', () => {
  const mockOnResolve = vi.fn();
  const mockOnClose = vi.fn();

  const singleConflict: SyncConflict = {
    id: 'cat-1',
    entity: 'category',
    localData: {
      id: 'cat-1',
      name: 'My Local Category',
      updated_at: '2024-01-01T10:00:00Z',
    },
    serverData: {
      id: 'cat-1',
      name: 'Server Category',
      updated_at: '2024-01-01T11:00:00Z',
    },
    localTimestamp: new Date('2024-01-01T10:00:00Z').getTime(),
    serverTimestamp: new Date('2024-01-01T11:00:00Z').getTime(),
  };

  const multipleConflicts: SyncConflict[] = [
    singleConflict,
    {
      id: 'size-1',
      entity: 'standard_size',
      localData: {
        id: 'size-1',
        primary_size: 'M',
        updated_at: '2024-01-01T10:00:00Z',
      },
      serverData: {
        id: 'size-1',
        primary_size: 'L',
        updated_at: '2024-01-01T11:00:00Z',
      },
      localTimestamp: new Date('2024-01-01T10:00:00Z').getTime(),
      serverTimestamp: new Date('2024-01-01T11:00:00Z').getTime(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Display', () => {
    it('should not render when closed', () => {
      render(
        <ConflictResolutionDialog
          isOpen={false}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Sync Conflict Detected')).not.toBeInTheDocument();
    });

    it('should render when open with conflicts', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Sync Conflict Detected')).toBeInTheDocument();
    });

    it('should not render when conflicts array is empty', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Sync Conflict Detected')).not.toBeInTheDocument();
    });

    it('should display conflict entity type', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      // Check that the entity type is displayed in the alert message
      expect(screen.getByText(/was modified both locally and on the server/i)).toBeInTheDocument();
    });

    it('should display conflict count for multiple conflicts', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={multipleConflicts}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/\(1 of 2\)/i)).toBeInTheDocument();
    });
  });

  describe('Conflict Data Display', () => {
    it('should display local changes', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Your Changes')).toBeInTheDocument();
      expect(screen.getByText('My Local Category')).toBeInTheDocument();
    });

    it('should display server version', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Server Version')).toBeInTheDocument();
      expect(screen.getByText('Server Category')).toBeInTheDocument();
    });

    it('should display timestamps', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      // Check that timestamps are displayed (format may vary by locale)
      const timestamps = screen.getAllByText(/Modified:/i);
      expect(timestamps).toHaveLength(2); // One for local, one for server
    });
  });

  describe('Resolution Options', () => {
    it('should display all three resolution buttons', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('button', { name: /keep my changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use server version/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view both/i })).toBeInTheDocument();
    });

    it('should call onResolve with keep-local when Keep My Changes is clicked', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      const keepButton = screen.getByRole('button', { name: /keep my changes/i });
      fireEvent.click(keepButton);

      expect(mockOnResolve).toHaveBeenCalledWith('cat-1', 'keep-local');
    });

    it('should call onResolve with use-server when Use Server Version is clicked', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      const serverButton = screen.getByRole('button', { name: /use server version/i });
      fireEvent.click(serverButton);

      expect(mockOnResolve).toHaveBeenCalledWith('cat-1', 'use-server');
    });

    it('should close dialog after resolving last conflict', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      const keepButton = screen.getByRole('button', { name: /keep my changes/i });
      fireEvent.click(keepButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('View Both Mode', () => {
    it('should show side-by-side comparison when View Both is clicked', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      const viewBothButton = screen.getByRole('button', { name: /view both/i });
      fireEvent.click(viewBothButton);

      expect(screen.getByText('Side-by-Side Comparison')).toBeInTheDocument();
    });

    it('should display comparison table in view both mode', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      const viewBothButton = screen.getByRole('button', { name: /view both/i });
      fireEvent.click(viewBothButton);

      // Check for table headers
      expect(screen.getByText('Field')).toBeInTheDocument();
      expect(screen.getByText('Your Changes')).toBeInTheDocument();
      expect(screen.getByText('Server Version')).toBeInTheDocument();
    });

    it('should show back button in view both mode', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      const viewBothButton = screen.getByRole('button', { name: /view both/i });
      fireEvent.click(viewBothButton);

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should return to normal view when back button is clicked', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      // Enter view both mode
      const viewBothButton = screen.getByRole('button', { name: /view both/i });
      fireEvent.click(viewBothButton);

      // Click back
      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      // Should be back to normal view
      expect(screen.queryByText('Side-by-Side Comparison')).not.toBeInTheDocument();
      expect(screen.getByText('Your Changes')).toBeInTheDocument();
    });

    it('should allow resolution from view both mode', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      // Enter view both mode
      const viewBothButton = screen.getByRole('button', { name: /view both/i });
      fireEvent.click(viewBothButton);

      // Resolve from view both mode
      const keepButton = screen.getByRole('button', { name: /keep my changes/i });
      fireEvent.click(keepButton);

      expect(mockOnResolve).toHaveBeenCalledWith('cat-1', 'keep-local');
    });
  });

  describe('Multiple Conflicts', () => {
    it('should show first conflict initially', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={multipleConflicts}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('My Local Category')).toBeInTheDocument();
      expect(screen.queryByText(/primary_size/i)).not.toBeInTheDocument();
    });

    it('should advance to next conflict after resolving', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={multipleConflicts}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      // Resolve first conflict
      const keepButton = screen.getByRole('button', { name: /keep my changes/i });
      fireEvent.click(keepButton);

      // Should show second conflict
      expect(screen.getByText(/\(2 of 2\)/i)).toBeInTheDocument();
    });

    it('should show remaining conflicts count', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={multipleConflicts}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/1 more conflict to resolve/i)).toBeInTheDocument();
    });

    it('should not close dialog until all conflicts are resolved', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={multipleConflicts}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      // Resolve first conflict
      const keepButton = screen.getByRole('button', { name: /keep my changes/i });
      fireEvent.click(keepButton);

      // Dialog should still be open
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.getByText('Sync Conflict Detected')).toBeInTheDocument();
    });

    it('should close dialog after resolving all conflicts', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={multipleConflicts}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      // Resolve first conflict
      const keepButton1 = screen.getByRole('button', { name: /keep my changes/i });
      fireEvent.click(keepButton1);

      // Resolve second conflict
      const keepButton2 = screen.getByRole('button', { name: /keep my changes/i });
      fireEvent.click(keepButton2);

      // Dialog should close
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog role', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have accessible button labels', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('button', { name: /keep my changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /use server version/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view both/i })).toBeInTheDocument();
    });

    it('should have descriptive dialog title', () => {
      render(
        <ConflictResolutionDialog
          isOpen={true}
          conflicts={[singleConflict]}
          onResolve={mockOnResolve}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Sync Conflict Detected')).toBeInTheDocument();
    });
  });
});
