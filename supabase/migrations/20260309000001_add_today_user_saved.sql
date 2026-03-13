-- Add user_saved tracking to today_ai_outfits
-- Tracks whether the user accepted (saved) the AI recommendation for the day
ALTER TABLE today_ai_outfits
  ADD COLUMN user_saved boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN today_ai_outfits.user_saved IS 'Set to true when the user saves this AI recommendation to their outfits';
