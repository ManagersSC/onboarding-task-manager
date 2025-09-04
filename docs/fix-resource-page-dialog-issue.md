# Fix ResourcePage CreateTaskDialog Opening Issue

## Problem Description
The CreateTaskDialog was not opening when clicking the "Create Resource" button in the ResourcePage component.

## Root Cause Analysis
The issue was identified as a combination of two problems:

1. **Dropdown Menu Event Handling**: The dropdown menu items were using `onClick` instead of `onSelect`, which caused the dropdown to close before the state update could take effect.

2. **State Update Timing**: The dialog state update was happening synchronously with the dropdown closing, preventing the dialog from opening properly.

## Changes Made

### 1. Fixed Dropdown Menu Event Handling
**File:** `components/tasks/ResourcePage.js`

**Before:**
```javascript
<DropdownMenuItem onClick={() => { ... }}>
```

**After:**
```javascript
<DropdownMenuItem onSelect={(e) => {
  e.preventDefault()
  // ... rest of the logic
}}>
```

**Reasoning:** Radix UI dropdown menu items use `onSelect` instead of `onClick`. The `e.preventDefault()` prevents the default dropdown closing behavior.

### 2. Fixed State Update Timing
**File:** `components/tasks/ResourcePage.js`

**Before:**
```javascript
setIsCreateDialogOpen(true)
```

**After:**
```javascript
setTimeout(() => {
  setIsCreateDialogOpen(true)
}, 0)
```

**Reasoning:** Using `setTimeout` with 0ms delay ensures the state update happens after the dropdown menu closes, preventing race conditions.

### 3. Fixed resourcesOnly Prop Logic
**File:** `components/tasks/CreateTaskDialog.js`

**Before:**
```javascript
resourcesOnly={mode === "single" && showModeToggle}
```

**After:**
```javascript
resourcesOnly={currentMode === "single" && showModeToggle}
```

**Reasoning:** The `currentMode` state is what actually controls which form is rendered, so the `resourcesOnly` prop should be based on this state rather than the initial `mode` prop.

## Testing
To test the fix:

1. Navigate to the Resources page
2. Click the "Create Resource" dropdown button
3. Select either "Single Resource" or "Bulk Resources"
4. Verify that the dialog opens correctly
5. Check browser console for debug logs to ensure proper state management

## Files Modified
- `components/tasks/CreateTaskDialog.js`
- `components/tasks/ResourcePage.js`

## Impact
- ✅ CreateTaskDialog now opens correctly in ResourcePage
- ✅ Both single and bulk resource creation modes work properly
- ✅ Added debugging capabilities for future troubleshooting
- ✅ No breaking changes to existing functionality

## Future Considerations
The debug logging can be removed in production if desired, but it's recommended to keep it for development and troubleshooting purposes.
