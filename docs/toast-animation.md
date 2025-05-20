# Toast Notifications with Sonner

## Overview

The toast (notification) system now uses [Sonner](https://sonner.emilkowal.ski/) for entrance and exit animations and notifications, replacing the previous shadcn/Radix Toast approach. Sonner provides smooth, customizable, and robust animations for toast notifications, and is easier to use with modern React animation libraries.

## Why Sonner?
- **Animation-friendly:** Works seamlessly with React's rendering and unmounting, so you get smooth entrance/exit animations out of the box.
- **Simple API:** Just call `toast()` from anywhere in your app.
- **No custom context or provider needed** (just add `<Toaster />` at the root).
- **Customizable:** Easily style and configure.

## How It Works
- The `<Toaster />` component from `sonner` is placed in your root layout (see `src/app/layout.js`).
- Use the `toast()` function from `sonner` to show notifications.

### Example Usage
```js
import { toast } from "sonner"

toast("This is a notification!")
toast.success("Success message!")
toast.error("Error message!")
```

## Migration Notes
- The old shadcn/Radix Toast components and custom `use-toast` hook have been removed.
- All toast calls should now use `toast` from `sonner`.
- The `<Toaster />` component from `sonner` is now in your root layout.

## Customization
- See the [Sonner documentation](https://sonner.emilkowal.ski/docs) for options like position, duration, styling, and more.

## Troubleshooting
- If you see no toasts, ensure `<Toaster />` is present in your root layout and you are importing `toast` from `sonner`.
- Remove any old imports from `@/hooks/use-toast` or `@components/ui/toaster`.

## References
- [Sonner Documentation](https://sonner.emilkowal.ski/docs) 