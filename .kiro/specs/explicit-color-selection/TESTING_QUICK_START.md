# Quick Start Guide - Manual Testing

## Setup (5 minutes)

1. **Start Development Server** ✅ (Already running)
   ```bash
   npm run dev
   ```
   Server: http://localhost:3000

2. **Login/Create Test Account**
   - Navigate to http://localhost:3000
   - Login or create a test account
   - Ensure you have access to the wardrobe

3. **Prepare Test Data** (if needed)
   - Create at least 2-3 wardrobe items for testing
   - Include items with and without colors

## Quick Test Sequence (15 minutes)

### 1. Add Item Form (3 minutes)
- Go to: http://localhost:3000/wardrobe
- Click "Add Item"
- **Check:** Color field is a dropdown (not text input)
- **Check:** Dropdown has "Unspecified" option
- **Check:** Dropdown has multiple color options (Black, White, Navy, etc.)
- **Test:** Create item with "Navy" color
- **Test:** Create item with "Unspecified" color

### 2. Edit Item Form (3 minutes)
- Click on an existing item
- Click "Edit"
- **Check:** Color dropdown appears in edit mode
- **Check:** Current color is pre-selected
- **Test:** Change color from one value to another
- **Test:** Save and verify change persists

### 3. Form Validation (2 minutes)
- Create or edit an item
- **Test:** Submit with valid color → should work
- **Test:** Submit with "Unspecified" → should work
- **Check:** No console errors

### 4. Outfit Scoring (4 minutes)
- Go to: http://localhost:3000/outfits
- View or generate an outfit
- **Check:** Outfit displays correctly
- **Check:** Score is calculated
- **Check:** No errors in console
- **Test:** Create outfit with neutral colors (black, white, navy)
- **Test:** Create outfit with mixed colors

### 5. Item Details View (3 minutes)
- Click on an item with a color
- **Check:** Color is displayed as text (e.g., "Navy")
- Click on an item without a color
- **Check:** Shows "Not specified" or similar
- **Check:** Layout looks good

## What to Look For

### ✅ Good Signs
- Dropdown appears instead of text input
- All colors are selectable
- Form submits successfully
- Colors persist after save
- Outfit scoring works
- No console errors

### ❌ Red Flags
- Text input instead of dropdown
- Missing color options
- Form validation errors with valid colors
- Colors not saving
- Outfit scoring broken
- Console errors or warnings
- UI layout issues

## Common Issues to Check

1. **Dropdown Not Showing**
   - Check if COLOR_OPTIONS is imported
   - Check if select element is rendered

2. **Colors Not Saving**
   - Check browser console for errors
   - Check network tab for failed requests
   - Verify normalizeColor() is called

3. **Outfit Scoring Broken**
   - Check if enrichItem uses explicit color
   - Check if isNeutralColor works with new colors
   - Look for "inferColor" errors in console

4. **Validation Issues**
   - Check if isValidColor() is called
   - Check if normalizeColor() is called
   - Verify empty color is allowed

## Quick Console Checks

Open browser DevTools console and run:

```javascript
// Check if COLOR_OPTIONS is available (on form page)
console.log('COLOR_OPTIONS available:', typeof COLOR_OPTIONS !== 'undefined');

// Check form data before submission
// (Set breakpoint in handleSubmit or check network tab)
```

## Test Data Suggestions

Create these test items for comprehensive testing:

1. **Navy Blazer** - Navy color, Jacket category, Formality 8
2. **White Dress Shirt** - White color, Shirt category, Formality 9
3. **Grey Chinos** - Grey color, Pants category, Formality 6
4. **Brown Leather Shoes** - Brown color, Shoes category, Formality 7
5. **Generic T-Shirt** - No color (Unspecified), Shirt category, Formality 3

## Reporting Issues

If you find issues, note:
1. **What you did** (steps to reproduce)
2. **What you expected** (expected behavior)
3. **What happened** (actual behavior)
4. **Console errors** (if any)
5. **Screenshots** (if helpful)

## Next Steps After Testing

1. Fill out the detailed checklist: `MANUAL_TESTING_CHECKLIST.md`
2. Document any issues found
3. Report back with results
4. Mark task 13.2 as complete if all tests pass

## Need Help?

- Check the design document: `.kiro/specs/explicit-color-selection/design.md`
- Check the requirements: `.kiro/specs/explicit-color-selection/requirements.md`
- Review the implementation in:
  - `app/wardrobe/items/add-item-client.tsx`
  - `app/wardrobe/items/[id]/item-detail-client.tsx`
  - `lib/data/color-options.ts`
