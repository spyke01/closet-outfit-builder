# Manual Testing Checklist - Explicit Color Selection

**Task:** 13.2 Manual testing checklist  
**Date:** $(date)  
**Tester:** _____________  
**Environment:** Development (http://localhost:3000)

## Pre-Testing Setup

- [x] Development server running at http://localhost:3000
- [ ] Logged in as test user
- [ ] Test database has sample wardrobe items
- [ ] Browser DevTools console open for error monitoring

## Test 1: Create New Item with Color Dropdown

**Objective:** Verify that the Add Item form displays a color dropdown and allows color selection.

### Steps:
1. Navigate to http://localhost:3000/wardrobe
2. Click "Add Item" button
3. Observe the color field in the form

### Expected Results:
- [ ] Color field displays as a dropdown (select element), not a text input
- [ ] Dropdown contains "Unspecified" as the first option
- [ ] Dropdown contains all color options from COLOR_OPTIONS:
  - [ ] Neutrals: Black, White, Grey, Gray, Charcoal, Ivory, Cream, Beige, Taupe, Stone
  - [ ] Blues: Navy, Blue, Light Blue, Sky Blue, Teal
  - [ ] Browns/Earth: Brown, Tan, Khaki, Camel, Chocolate
  - [ ] Greens: Green, Olive, Forest Green, Sage
  - [ ] Reds/Warm: Red, Burgundy, Maroon, Rust
  - [ ] Yellows: Yellow, Mustard
  - [ ] Pinks/Purples: Pink, Blush, Purple, Lavender
  - [ ] Special: Denim, Multicolor
- [ ] Dropdown is styled consistently with other form fields
- [ ] Dropdown is accessible (can be navigated with keyboard)

### Test Cases:

#### Test Case 1.1: Create item with color selected
1. Fill in required fields:
   - Name: "Navy Blazer"
   - Category: "Jacket"
2. Select "Navy" from color dropdown
3. Click "Add Item"

**Expected:**
- [ ] Item is created successfully
- [ ] Success message appears
- [ ] Redirected to wardrobe page
- [ ] New item appears in wardrobe with navy color

#### Test Case 1.2: Create item without color (Unspecified)
1. Fill in required fields:
   - Name: "Generic T-Shirt"
   - Category: "Shirt"
2. Leave color as "Unspecified"
3. Click "Add Item"

**Expected:**
- [ ] Item is created successfully
- [ ] No validation errors
- [ ] Item appears in wardrobe without color specified

#### Test Case 1.3: Create item with various colors
Repeat for multiple colors to ensure all options work:
- [ ] Black
- [ ] White
- [ ] Blue
- [ ] Red
- [ ] Green
- [ ] Brown

**Expected:**
- [ ] All colors save correctly
- [ ] No console errors

### Notes:
_Record any issues, unexpected behavior, or observations here_

---

## Test 2: Edit Existing Item with Color Dropdown

**Objective:** Verify that the Edit Item form displays a color dropdown and allows color changes.

### Steps:
1. Navigate to http://localhost:3000/wardrobe
2. Click on an existing wardrobe item
3. Click "Edit" button
4. Observe the color field in edit mode

### Expected Results:
- [ ] Color field displays as a dropdown (select element) in edit mode
- [ ] Dropdown shows the current color value selected
- [ ] Dropdown contains all color options from COLOR_OPTIONS
- [ ] Dropdown is styled consistently with other form fields

### Test Cases:

#### Test Case 2.1: Edit item and change color
1. Open an existing item (e.g., "Navy Blazer" from Test 1.1)
2. Click "Edit"
3. Change color from "Navy" to "Blue"
4. Click "Save"

**Expected:**
- [ ] Item updates successfully
- [ ] Success message appears
- [ ] Color change is reflected in item details view
- [ ] Color change persists after page refresh

#### Test Case 2.2: Edit item and remove color
1. Open an item with a color set
2. Click "Edit"
3. Change color to "Unspecified"
4. Click "Save"

**Expected:**
- [ ] Item updates successfully
- [ ] Color is removed (set to null/empty)
- [ ] Item details show "Not specified" for color

#### Test Case 2.3: Edit item without changing color
1. Open an item
2. Click "Edit"
3. Change name or other field (not color)
4. Click "Save"

**Expected:**
- [ ] Item updates successfully
- [ ] Color remains unchanged
- [ ] No color-related errors

#### Test Case 2.4: Cancel edit without saving
1. Open an item
2. Click "Edit"
3. Change color
4. Click "Cancel"

**Expected:**
- [ ] Edit mode exits
- [ ] Color change is not saved
- [ ] Original color is displayed

### Notes:
_Record any issues, unexpected behavior, or observations here_

---

## Test 3: Form Validation with Valid/Invalid Colors

**Objective:** Verify that form validation correctly handles color values.

### Test Cases:

#### Test Case 3.1: Submit with valid color
1. Create or edit an item
2. Select a valid color from dropdown (e.g., "Black")
3. Submit form

**Expected:**
- [ ] Form submits successfully
- [ ] No validation errors
- [ ] Color is saved correctly

#### Test Case 3.2: Submit with empty color
1. Create or edit an item
2. Leave color as "Unspecified"
3. Submit form

**Expected:**
- [ ] Form submits successfully
- [ ] No validation errors
- [ ] Color is saved as empty/null

#### Test Case 3.3: Browser DevTools manipulation (edge case)
1. Open browser DevTools
2. Inspect color dropdown
3. Manually add an invalid option: `<option value="invalid-color">Invalid</option>`
4. Select the invalid option
5. Submit form

**Expected:**
- [ ] Form validation catches invalid color
- [ ] Error message or console warning appears
- [ ] Form does not submit OR invalid color is rejected

#### Test Case 3.4: Color normalization
1. Open browser DevTools console
2. Check network request when submitting form with color
3. Verify color value in request payload

**Expected:**
- [ ] Color value is lowercase (e.g., "navy" not "Navy")
- [ ] Color value is trimmed (no leading/trailing spaces)

### Notes:
_Record any issues, unexpected behavior, or observations here_

---

## Test 4: Outfit Scoring Still Works Correctly

**Objective:** Verify that outfit scoring and generation continue to work with explicit color values.

### Pre-requisites:
- [ ] At least 4 wardrobe items with colors set (jacket, shirt, pants, shoes)
- [ ] Items have formality scores set

### Test Cases:

#### Test Case 4.1: Generate outfit with colored items
1. Navigate to http://localhost:3000/outfits
2. Generate a new outfit or view existing outfit
3. Observe outfit score and breakdown

**Expected:**
- [ ] Outfit displays correctly
- [ ] Outfit score is calculated (0-100)
- [ ] Score breakdown shows color harmony component
- [ ] No console errors related to color

#### Test Case 4.2: Color harmony scoring
1. Create an outfit with neutral colors (black, white, grey, navy)
2. Note the outfit score
3. Create an outfit with clashing colors (red, green, purple)
4. Note the outfit score

**Expected:**
- [ ] Neutral color outfit has higher color harmony score
- [ ] Clashing color outfit has lower color harmony score
- [ ] Color harmony affects overall outfit score

#### Test Case 4.3: Items without color
1. Create an outfit including items with "Unspecified" color
2. View outfit score

**Expected:**
- [ ] Outfit generates successfully
- [ ] Items without color are treated as "unknown"
- [ ] No errors or crashes
- [ ] Score calculation handles null colors gracefully

#### Test Case 4.4: Anchor-based outfit browsing
1. Navigate to http://localhost:3000/anchor
2. Select an item with a color
3. View generated outfits

**Expected:**
- [ ] Outfits are generated correctly
- [ ] Color compatibility is considered
- [ ] No errors related to color

### Notes:
_Record any issues, unexpected behavior, or observations here_

---

## Test 5: Color Display in Item Details View

**Objective:** Verify that color is displayed correctly in item details view.

### Test Cases:

#### Test Case 5.1: View item with color
1. Navigate to an item with a color set (e.g., "Navy Blazer")
2. Observe the color display in details view

**Expected:**
- [ ] Color is displayed as text label (e.g., "Navy")
- [ ] Color label matches the COLOR_OPTIONS label
- [ ] Color is displayed in the "Item Details" card
- [ ] Color is readable and properly styled

#### Test Case 5.2: View item without color
1. Navigate to an item without a color
2. Observe the color display

**Expected:**
- [ ] Color shows "Not specified" or similar placeholder
- [ ] No broken UI or missing elements
- [ ] Consistent styling with other fields

#### Test Case 5.3: Color display in wardrobe grid
1. Navigate to http://localhost:3000/wardrobe
2. View items in grid view
3. Check if color is visible on item cards

**Expected:**
- [ ] Color information is visible (if designed to show)
- [ ] OR color is not shown in grid (acceptable if not part of design)
- [ ] No layout issues

### Notes:
_Record any issues, unexpected behavior, or observations here_

---

## Test 6: Accessibility Testing

**Objective:** Verify that color dropdowns are accessible.

### Test Cases:

#### Test Case 6.1: Keyboard navigation
1. Navigate to Add Item form
2. Use Tab key to navigate to color dropdown
3. Use Arrow keys to select different colors
4. Press Enter to confirm selection

**Expected:**
- [ ] Dropdown receives focus with visible focus indicator
- [ ] Arrow keys navigate through options
- [ ] Enter key selects option
- [ ] Tab key moves to next field

#### Test Case 6.2: Screen reader compatibility
1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate to color dropdown
3. Listen to announcements

**Expected:**
- [ ] Dropdown is announced as "Color, combo box" or similar
- [ ] Current selection is announced
- [ ] Options are announced when navigating

#### Test Case 6.3: Label association
1. Inspect color dropdown in DevTools
2. Check for proper label association

**Expected:**
- [ ] Label element is associated with select element
- [ ] Label text is "Color" or similar
- [ ] Clicking label focuses dropdown

### Notes:
_Record any issues, unexpected behavior, or observations here_

---

## Test 7: Cross-Browser Testing

**Objective:** Verify that color dropdowns work across different browsers.

### Browsers to Test:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### For Each Browser:
- [ ] Color dropdown displays correctly
- [ ] Color selection works
- [ ] Form submission works
- [ ] No console errors
- [ ] Styling is consistent

### Notes:
_Record any browser-specific issues here_

---

## Test 8: Mobile Responsiveness

**Objective:** Verify that color dropdowns work on mobile devices.

### Test Cases:

#### Test Case 8.1: Mobile viewport
1. Open DevTools and switch to mobile viewport (iPhone, Android)
2. Navigate to Add Item form
3. Test color dropdown

**Expected:**
- [ ] Dropdown is touch-friendly (adequate size)
- [ ] Dropdown opens native mobile picker
- [ ] Selection works correctly
- [ ] Form is usable on mobile

#### Test Case 8.2: Actual mobile device (if available)
1. Open app on actual mobile device
2. Test color dropdown functionality

**Expected:**
- [ ] Same as Test Case 8.1

### Notes:
_Record any mobile-specific issues here_

---

## Test 9: Data Persistence

**Objective:** Verify that color values persist correctly in the database.

### Test Cases:

#### Test Case 9.1: Create and refresh
1. Create a new item with color "Navy"
2. Note the item ID
3. Refresh the page
4. Navigate back to the item

**Expected:**
- [ ] Color is still "Navy"
- [ ] No data loss

#### Test Case 9.2: Edit and refresh
1. Edit an item and change color
2. Refresh the page
3. View the item

**Expected:**
- [ ] Color change persists
- [ ] No data loss

#### Test Case 9.3: Database verification (optional)
1. Open Supabase dashboard
2. Check wardrobe_items table
3. Verify color values are stored correctly

**Expected:**
- [ ] Color values are lowercase
- [ ] Color values match COLOR_OPTIONS values
- [ ] Empty colors are null or empty string

### Notes:
_Record any data persistence issues here_

---

## Test 10: Error Handling

**Objective:** Verify that errors are handled gracefully.

### Test Cases:

#### Test Case 10.1: Network error during submission
1. Open DevTools Network tab
2. Set network to "Offline"
3. Try to submit form with color

**Expected:**
- [ ] Error message appears
- [ ] Form data is not lost
- [ ] User can retry after reconnecting

#### Test Case 10.2: Database error (simulated)
1. Temporarily break database connection (if possible)
2. Try to submit form

**Expected:**
- [ ] Error message appears
- [ ] No crash or white screen
- [ ] User-friendly error message

### Notes:
_Record any error handling issues here_

---

## Summary

### Overall Results:
- **Total Test Cases:** _____ / _____
- **Passed:** _____
- **Failed:** _____
- **Blocked:** _____

### Critical Issues Found:
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

### Minor Issues Found:
1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

### Recommendations:
_____________________________________________
_____________________________________________
_____________________________________________

### Sign-off:
- [ ] All critical functionality works as expected
- [ ] No blocking issues found
- [ ] Ready for production deployment

**Tester Signature:** _____________  
**Date:** _____________
