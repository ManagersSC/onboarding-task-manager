# Changelog: Sonner Toast Migration & Improvements (2024-06-10)

## Overview
This changelog documents the migration from the shadcn/ui (Radix) toast system to [Sonner](https://sonner.emilkowal.ski/), as well as related improvements and fixes implemented on 2024-06-10.

---

## 🚀 Migration to Sonner
- **Removed** all shadcn/ui (Radix) toast components and the custom `use-toast` hook.
- **Installed** and set up Sonner for toast notifications.
- **Replaced** all toast usages in the codebase to use Sonner's API:
  - `toast("message")` for simple notifications.
  - `toast.success(...)` and `toast.error(...)` for success/error notifications, using JSX for title + description.
- **Updated all toast calls** in:
  - `src/app/test-page/page.js`
  - `components/tasks/CreateTaskForm.js`
  - `components/dashboard/TaskManagement.js`
  - `components/ProfileActions.js`
  - `components/tasks/files/FileViewerModal.js`

## 🎨 Dark Mode Support
- **Implemented dynamic dark mode support** for Sonner toasts:
  - Created a new client component `components/AppToaster.jsx` that uses the app's theme context (`useTheme`) and passes the correct theme to Sonner's `<Toaster />`.
  - Updated `src/app/layout.js` to use `<AppToaster />` at the root, ensuring toasts always match the app's dark/light mode.

## 🛠️ API Changes
- **Sonner's API is different from shadcn's:**
  - No more passing objects to `toast()`. Instead, use strings or JSX.
  - For title + description, use JSX as the first argument.
  - For variants, use `toast.success`, `toast.error`, etc.
- **Example:**
  ```js
  toast("Simple message")
  toast.success(<div><div className="font-semibold">Title</div><div>Description</div></div>)
  ```

## 🧹 Cleanup
- Deleted:
  - `components/ui/toast.jsx`
  - `components/ui/toaster.jsx`
  - `src/hooks/use-toast.js`
- Removed all imports and usages of the old toast system.
- Updated documentation in `docs/toast-animation.md` to reflect the new Sonner-based system.

## 🐛 Bug Fixes
- Fixed a server/client mismatch error by moving the theme-aware Toaster into a client component (`AppToaster.jsx`).
- Ensured all toast notifications now work without React child errors.

---

**All toast notifications are now powered by Sonner, with full dark mode support and a modern, flexible API.** 