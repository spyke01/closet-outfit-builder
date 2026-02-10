# Requirements Document

## Introduction

The Today's Outfit Generator feature provides authenticated users with a personalized daily outfit recommendation based on current weather conditions and their personal wardrobe inventory. The system generates outfits from the user's Wardrobe items (not saved Outfits) using weather-aware algorithms that consider temperature, precipitation, formality, color harmony, and style cohesion. Users can regenerate outfits, swap individual items, and save their favorite combinations.

## Glossary

- **Wardrobe**: The user's collection of individual clothing items stored in the database
- **Outfit**: A saved combination of clothing items from the user's Wardrobe
- **Weather_Context**: Normalized weather data including temperature bands, precipitation likelihood, and daily temperature swing
- **Target_Weight**: A numeric value (0-3) representing the warmth level needed for current weather conditions
- **Formality_Score**: A numeric value (1-10) representing how formal a clothing item is
- **Capsule_Tag**: A style classification label (Refined, Crossover, Adventurer, Shorts, Sport)
- **Compatibility_Score**: A calculated value representing how well outfit items work together
- **Generator**: The pure function that creates outfit combinations from wardrobe items and weather context
- **Today_Page**: The new authenticated homepage displaying weather and generated outfit

## Requirements

### Requirement 1: Authenticated Homepage

**User Story:** As an authenticated user, I want to land on a homepage showing today's outfit recommendation, so that I can quickly see what to wear today.

#### Acceptance Criteria

1. WHEN a user successfully authenticates, THE System SHALL route them to the Today_Page
2. WHEN an unauthenticated user attempts to access the Today_Page, THE System SHALL redirect them to the login page
3. THE Today_Page SHALL display the page title "Today's Outfit"
4. THE Navigation SHALL include a "Today" link that routes to the Today_Page
5. THE Today_Page SHALL remain accessible from the navigation after initial load

### Requirement 2: Weather Display

**User Story:** As a user, I want to see current weather conditions on the homepage, so that I understand the context for my outfit recommendation.

#### Acceptance Criteria

1. WHEN the Today_Page loads, THE System SHALL fetch current weather data for the user's location
2. THE Weather_Display SHALL show location name, current temperature, high/low temperatures, and precipitation or wind information
3. IF weather data is unavailable, THEN THE System SHALL display a neutral default message and continue with outfit generation
4. THE Weather_Display SHALL update the Weather_Context used for outfit generation
5. THE System SHALL normalize weather data into temperature bands and precipitation likelihood for generation logic

### Requirement 3: Initial Outfit Generation

**User Story:** As a user, I want an outfit automatically generated when I visit the homepage, so that I immediately see a recommendation without extra clicks.

#### Acceptance Criteria

1. WHEN the Today_Page loads, THE Generator SHALL create an outfit from the user's Wardrobe items
2. THE Generator SHALL use Weather_Context to determine appropriate layering and item selection
3. THE Generator SHALL include Shirt, Pants, and Shoes in every outfit
4. THE Generator SHALL conditionally include Jacket or Overshirt based on Target_Weight
5. THE Generator SHALL conditionally include Undershirt, Belt, and Watch based on weather and formality rules
6. IF the user's Wardrobe is missing required categories (Shirt, Pants, or Shoes), THEN THE System SHALL display an empty state with a link to the Wardrobe page
7. THE Generated_Outfit SHALL display all selected items with their images and names

### Requirement 4: Weather Context Normalization

**User Story:** As a system, I want to normalize weather data into actionable bands, so that the outfit generation logic can make consistent decisions.

#### Acceptance Criteria

1. THE System SHALL classify temperature into bands: isCold (below 55°F), isMild (55-75°F), isWarm (75-90°F), isHot (90°F and above)
2. THE System SHALL classify precipitation as isRainLikely when precipitation chance is 0.35 or higher
3. THE System SHALL calculate daily temperature swing as the difference between high and low temperatures
4. THE System SHALL set Target_Weight to 3 for isCold, 2 for isMild, 1 for isWarm, and 0 for isHot
5. WHEN daily temperature swing is 20°F or greater, THE System SHALL allow an extra layer in outfit generation

### Requirement 5: Category Inclusion Logic

**User Story:** As a system, I want to include appropriate clothing categories based on weather and formality, so that generated outfits are practical and stylistically coherent.

#### Acceptance Criteria

1. THE Generator SHALL always include Shirt, Pants, and Shoes categories
2. WHEN Target_Weight is 2 or greater, THE Generator SHALL include Jacket or Overshirt category
3. THE Generator SHALL include Undershirt category by default unless isHot is true
4. WHEN Pants formality_score is 5 or greater OR Shoes formality_score is 6 or greater, THE Generator SHALL include Belt category
5. WHEN the user has Watch items in their Wardrobe, THE Generator SHALL include Watch category
6. THE Generator SHALL exclude categories that have no available items in the user's Wardrobe

### Requirement 6: Item Selection Strategy

**User Story:** As a system, I want to select items in a specific order with compatibility scoring, so that generated outfits are cohesive and weather-appropriate.

#### Acceptance Criteria

1. THE Generator SHALL select items in this order: Pants, Shirt, Shoes, Outer Layer (if needed), Undershirt (if needed), Belt (if needed), Watch (if needed)
2. WHEN selecting Pants, THE Generator SHALL prefer shorts if isHot is true
3. WHEN selecting Shirt, THE Generator SHALL align with Pants formality and Weather_Context
4. WHEN selecting Shoes, THE Generator SHALL match Pants and Shirt formality and Weather_Context
5. WHEN selecting Belt, THE Generator SHALL match Shoes formality and color
6. WHEN selecting Watch, THE Generator SHALL match overall outfit formality
7. THE Generator SHALL calculate Compatibility_Score for each potential item based on weather fit, formality alignment, color harmony, and capsule cohesion

### Requirement 7: Compatibility Scoring

**User Story:** As a system, I want to score item compatibility across multiple dimensions, so that generated outfits look good together and suit the weather.

#### Acceptance Criteria

1. THE Compatibility_Score SHALL include a weather fit component that favors items appropriate for current conditions
2. THE Compatibility_Score SHALL include a formality alignment component that penalizes extreme mismatches between items
3. THE Compatibility_Score SHALL include a color harmony component that favors neutral combinations and penalizes clashing colors
4. THE Compatibility_Score SHALL include a capsule cohesion component that favors items sharing Capsule_Tags
5. THE Generator SHALL use Compatibility_Score to select the best-fitting item for each category
6. THE System SHALL infer colors from item names using common color keywords (black, white, grey, navy, cream, khaki, brown, blue, green, red)

### Requirement 8: Regenerate Outfit

**User Story:** As a user, I want to regenerate a completely new outfit, so that I can explore different combinations from my wardrobe.

#### Acceptance Criteria

1. WHEN a user clicks the regenerate button, THE Generator SHALL create a new outfit using the same Weather_Context and Wardrobe items
2. THE Generator SHALL maintain a session-only "recently used" exclusion list to reduce repeated combinations
3. THE Generator SHALL slightly penalize the last 10 generated items to increase variety
4. THE Regenerated_Outfit SHALL display immediately after generation completes
5. THE System SHALL preserve the regenerate functionality even with small wardrobe inventories

### Requirement 9: Swap Individual Items

**User Story:** As a user, I want to swap individual items in a category, so that I can customize the generated outfit without starting over.

#### Acceptance Criteria

1. WHEN a user clicks swap on a category, THE Generator SHALL re-run selection for that category only
2. THE Generator SHALL keep all other selected items fixed during the swap
3. THE Generator SHALL apply Compatibility_Score against the fixed context of other items
4. THE Generator SHALL exclude the currently selected item from swap options
5. WHEN no alternative items exist in a category, THE System SHALL disable the swap button for that category
6. THE Swapped_Item SHALL display immediately after selection completes

### Requirement 10: Save Generated Outfit

**User Story:** As a user, I want to save a generated outfit to my Outfits collection, so that I can access it later without regenerating.

#### Acceptance Criteria

1. WHEN a user clicks the save button, THE System SHALL create a new Outfit record in persistent storage
2. THE System SHALL include all selected items from the generated outfit in the saved Outfit
3. THE System SHALL allow the user to optionally mark the outfit as "Loved" during save
4. THE System SHALL display a confirmation message after successful save
5. THE System SHALL provide navigation to the Outfits page after save
6. THE Save_Operation SHALL NOT mutate or modify Wardrobe items

### Requirement 11: Navigation and Routing

**User Story:** As a user, I want clear navigation between Today, Wardrobe, and Outfits pages, so that I can easily access different parts of the application.

#### Acceptance Criteria

1. THE Navigation SHALL display a "Today" link that routes to the Today_Page
2. THE Navigation SHALL maintain existing Wardrobe and Outfits links
3. WHEN a user saves an outfit, THE System SHALL provide a link to navigate to the Outfits page
4. THE Wardrobe_Page SHALL remain unchanged and accessible from navigation
5. THE System SHALL maintain the user's current page context during navigation

### Requirement 12: Edge Case Handling

**User Story:** As a user with an incomplete wardrobe or unavailable weather data, I want the system to handle these situations gracefully, so that I can still use the application.

#### Acceptance Criteria

1. WHEN the user's Wardrobe is missing Shirt, Pants, or Shoes, THE System SHALL display an empty state message with a link to the Wardrobe page
2. WHEN weather data is unavailable, THE System SHALL use neutral defaults (Target_Weight = 1, Smart Casual formality preference)
3. WHEN the user has a small wardrobe inventory, THE Generator SHALL still produce valid outfits with available items
4. WHEN no items match the ideal criteria, THE Generator SHALL relax constraints to find the best available match
5. THE System SHALL handle all edge cases without crashing or displaying error messages to the user

### Requirement 13: Pure Function Architecture

**User Story:** As a developer, I want the outfit generation logic implemented as pure functions, so that the system is testable, predictable, and maintainable.

#### Acceptance Criteria

1. THE Generator SHALL be implemented as a pure function with signature: `generateOutfit({ wardrobeItems, weatherContext, userPreferences? })`
2. THE Generator SHALL produce deterministic outputs for the same inputs (excluding intentional randomness for variety)
3. THE Weather_Context normalization SHALL be implemented as pure functions
4. THE Color inference logic SHALL be implemented as pure functions
5. THE Compatibility_Score calculation SHALL be implemented as pure functions
6. THE Generator SHALL NOT perform side effects (database queries, API calls, state mutations)
7. THE Generator SHALL be testable with unit tests and property-based tests
