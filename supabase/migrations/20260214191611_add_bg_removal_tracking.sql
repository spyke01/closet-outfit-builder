-- Add background removal tracking columns to wardrobe_items
-- Feature: Mobile Camera Capture & Background Removal
-- Created: 2026-02-14

-- Add columns for tracking background removal processing status
ALTER TABLE wardrobe_items
  ADD COLUMN bg_removal_status text NOT NULL DEFAULT 'pending'
    CHECK (bg_removal_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN bg_removal_started_at timestamptz,
  ADD COLUMN bg_removal_completed_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN wardrobe_items.bg_removal_status IS 'Processing state: pending (queued), processing (in progress), completed (success), failed (error or timeout)';
COMMENT ON COLUMN wardrobe_items.bg_removal_started_at IS 'Timestamp when background removal processing began';
COMMENT ON COLUMN wardrobe_items.bg_removal_completed_at IS 'Timestamp when background removal finished (success or failure)';

-- Enable Realtime on wardrobe_items for live status updates
-- This allows clients to subscribe to changes and update UI without page refresh
ALTER PUBLICATION supabase_realtime ADD TABLE wardrobe_items;

-- Set REPLICA IDENTITY FULL so Realtime can see all column values in UPDATE events
-- This is required for filtering on non-primary key columns (like bg_removal_status)
ALTER TABLE wardrobe_items REPLICA IDENTITY FULL;

-- Update existing items to 'completed' status
-- Existing items already have processed images or originals, so mark them as complete
UPDATE wardrobe_items SET bg_removal_status = 'completed' WHERE bg_removal_status = 'pending';
