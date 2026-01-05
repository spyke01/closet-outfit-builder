-- Add external_id columns to wardrobe_items and outfits tables
-- This allows tracking original IDs from seed data for better duplicate detection

-- Add external_id column to wardrobe_items table
ALTER TABLE wardrobe_items 
ADD COLUMN external_id TEXT;

-- Add external_id column to outfits table  
ALTER TABLE outfits 
ADD COLUMN external_id TEXT;

-- Add indexes for better performance on external_id lookups
CREATE INDEX idx_wardrobe_items_external_id ON wardrobe_items(external_id);
CREATE INDEX idx_outfits_external_id ON outfits(external_id);

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN wardrobe_items.external_id IS 'Original ID from seed data for duplicate detection';
COMMENT ON COLUMN outfits.external_id IS 'Original ID from seed data for duplicate detection';