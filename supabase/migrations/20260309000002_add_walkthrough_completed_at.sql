-- Add walkthrough state tracking to user_preferences
-- NULL = walkthrough not yet triggered or completed
-- Any timestamp = walkthrough was dismissed or completed (do not re-trigger)
ALTER TABLE user_preferences
  ADD COLUMN walkthrough_completed_at timestamptz;

COMMENT ON COLUMN user_preferences.walkthrough_completed_at IS 'Set when user completes or dismisses the onboarding walkthrough. NULL means it has not run yet.';
