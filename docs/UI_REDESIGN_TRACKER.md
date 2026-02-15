# UI Redesign Implementation Tracker

> **Purpose:** Track all UI redesign tasks so any Claude instance can pick up from where work stopped.
> **Last Updated:** 2026-02-02
> **Branch:** `feature/init_claude_code`

---

## Reference Files (READ BEFORE IMPLEMENTING)

| File | What It Covers |
|------|---------------|
| `components/CLAUDE.md` | Design system rules: use `cn()` for class merging, skeleton loaders for loading states, Tailwind only (no inline styles/CSS modules). **Do NOT modify `components/ui/` base components directly — extend or wrap them.** |
| `components/admin/CLAUDE.md` | Admin layout: sidebar in `admin-sidebar.js`, mobile nav in `bottom-navigation.js`, all admin pages share sidebar layout from `src/app/admin/layout.js`. Drawer pattern in `applicant-drawer.js`. |
| `components/dashboard/CLAUDE.md` | Dashboard widgets: each section has a skeleton loader in `skeletons/`. **Always update skeleton loaders to match new layouts.** Preserve SWR hook interfaces — don't change data fetching patterns. |
| `src/app/CLAUDE.md` | Pages are thin wrappers — delegate to components. **API routes are NOT in redesign scope.** |

---

## Design System Foundation (Added in Phase 1)

These are already implemented and available for use in all subsequent tasks:

- **CSS Variables** (`src/app/globals.css`): `--success`, `--warning`, `--error`, `--info` (with `-muted` and `-foreground` variants), `--background-subtle/muted/elevated`, `--border-subtle/muted/strong`, `--transition-fast/base/slow/slower`, `--ease-out-expo`
- **Tailwind** (`tailwind.config.mjs`): `success.*`, `warning.*`, `error.*`, `info.*` color tokens; `bg-subtle`, `bg-elevated`, `border-subtle`, `border-strong`; animations: `animate-fade-in`, `animate-fade-in-up`, `animate-slide-up`, `animate-scale-in`, `animate-pulse-ring`; typography: `text-display`, `text-headline`, `text-title`, `text-body`, `text-caption`; box shadows: `shadow-elevated`, `shadow-glow`; easing: `ease-out-expo`
- **Animation Utils** (`components/lib/utils.js`): `staggerContainer`, `fadeInUp`, `fadeInUpSmall`, `scaleIn`, `slideUp`, `slideDown`, `fadeIn`, `pageTransition`, `cardHover`, `cardInteractive`, `listItem`, `listItemWithIndex()`, `buttonTap`, `countUp`, `getStaggerDelay()`, `withDelay()`, `combineVariants()`
- **CSS Utility Classes** (`src/app/globals.css`): `.gradient-mesh`, `.glass`, `.hover-lift`, `.card-interactive`, `.status-border-success/warning/error/info`, `.progress-gradient-*`, `.timeline-item`, `.tab-underline`, `.shadow-elevated`, `.shadow-elevated-lg`, `.animate-fade-in-up`, stagger classes `.stagger-1` through `.stagger-8`
- **New Components**: `components/ui/animated-counter.jsx` (AnimatedCounter, AnimatedCounterSimple, ProgressRing), `components/ui/status-indicator.jsx` (StatusDot, StatusIndicator, StatusRing, StatusBadge), `components/ui/gradient-background.jsx` (GradientBackground, GradientBlob, GradientBorder, ScrollFadeEdges)

---

## Task Checklist

### Phase 1: Design System Foundation
- [x] `src/app/globals.css` — Add background hierarchy vars, semantic status colors, border opacity levels, transition timings, animation keyframes, utility classes (.gradient-mesh, .glass, .hover-lift, .card-interactive, .status-border-*, .timeline-item, .tab-underline, etc.)
- [x] `tailwind.config.mjs` — Add semantic color tokens (success/warning/error/info with muted), bg-subtle/elevated, border-subtle/strong, typography scale, animation keyframes & durations, custom easing, extended spacing, box shadows
- [x] `components/lib/utils.js` — Add easings, transition presets, enhanced stagger variants, fadeInUpSmall, scaleIn, slideUp/Down, pageTransition, cardHover/cardInteractive presets, listItem animations, buttonTap/Lift, countUp, shimmer, getStaggerDelay/withDelay/combineVariants utilities

### Phase 2: Base UI Component Enhancements
- [x] `components/ui/card.jsx` — Add CVA variant system: `default` (border-border/60 shadow-sm), `elevated` (shadow-elevated), `interactive` (hover border glow + lift), `ghost` (transparent), `glass` (backdrop-blur). Export `cardVariants`.
- [x] `components/ui/button.jsx` — Add hover lift (-translate-y-0.5), active press (translate-y-0), improved focus ring (ring-2 ring-offset-2), new variants: `success`, `warning`. New sizes: `xl`, `icon-sm`, `icon-lg`.
- [x] `components/ui/input.jsx` — Add CVA variants: `default`, `filled` (bg-muted/50), `ghost`. Add `inputSize` prop (default/sm/lg). Better focus ring (ring-2 ring/30), improved placeholder opacity.
- [x] `components/ui/badge.jsx` — Add status variants: `success/warning/error/info` (border + muted bg), `-subtle` versions (transparent border, 10% bg), `-solid` versions (full bg). Add `size` prop (default/sm/lg).

### Phase 2.5: New Reusable Components
- [x] `components/ui/animated-counter.jsx` — AnimatedCounter (framer-motion useSpring), AnimatedCounterSimple (vanilla JS with IntersectionObserver), ProgressRing (SVG circular progress with animated fill)
- [x] `components/ui/status-indicator.jsx` — StatusDot (colored dot with optional pulse), StatusIndicator (dot + label), StatusRing (ring around children), StatusBadge (chip with dot + label), OnlineIndicator
- [x] `components/ui/gradient-background.jsx` — GradientBackground (wrapper using .gradient-mesh), GradientBlob (blurred gradient circle), GradientOverlay (directional gradient), GradientBorder (animated gradient border), ScrollFadeEdges (fade edges for scroll containers)

### Phase 3: Login Page Redesign
- [x] `src/app/page.js` — Wrap in GradientBackground, add brand icon (SVG layers icon), `animate-fade-in-up` on main, footer text
- [x] `components/auth/AuthComponent.js` — Card variant="glass" with shadow-elevated-lg and animate-scale-in. Tabs with icons (User, UserPlus, Shield from lucide), muted bg tabs with active bg-background + shadow. TabsContent with animate-fade-in.
- [x] `components/auth/LoginForm.js` — Icon-prefixed inputs (Mail, Lock) with focus color change. Error alerts with AlertCircle + border-error/30 bg-error-muted. h-11 inputs. Divider ("or"). "Create one" link.
- [x] `components/auth/SignUpForm.js` — Password strength indicator (4-bar visual + label). useWatch for real-time password tracking. Icon-prefixed inputs. Same error/divider pattern as LoginForm.
- [x] `components/auth/AdminLoginForm.js` — Admin Badge (ShieldAlert icon + "Administrator Access"). Same form pattern as LoginForm.

### Phase 4: Admin Dashboard Redesign
- [x] `components/dashboard/QuickMetrics.js` — Gradient tinted backgrounds per metric (from-info/5, from-warning/5), AnimatedCounterSimple for values, TrendingUp/Down icons in pill badges, group hover effects, MetricSkeleton loading state. Card variant="interactive".
- [x] `components/dashboard/ActivityFeed.js` — Timeline connector (gradient line left-[19px]), semantic icon styles (bg-success/10, bg-info/10 etc.), hover state with bg-muted/50, role badge as inline chip, action verb colored by type, improved empty state.
- [x] `components/admin/admin-sidebar.js` — Active states with `border-l-2 border-primary bg-primary/5`, hover `bg-muted/60`, logout `hover:bg-error/10 hover:text-error`, rounded-lg items, `transition-all duration-base ease-out-expo`, improved logo with shadow-sm.
- [x] `components/dashboard/TaskManagement.js` — Semantic priority/status colors, search bar with group focus-within icon animation (w-48→w-64), tabs with rounded-xl, Badge status variants (info-solid, error-solid, etc.), rounded-lg triggers.
- [x] `components/dashboard/NewHireTracker.js` — Header with Users icon + gradient bg, subtitle with hire count, progress bars with gradient fills (progress-gradient-success/info/warning), avatar ring-2 colored by progress, empty state with icon, card hover shadow-elevated + translate.
  - Error (1): Broken JSX comment at line 1147-1148 (`{/* Status Badge */` split across lines with stray `}`) caused syntax error.
  - Fix (1): Merged comment closing onto single line.
  - Error (2): Missing closing `</div>` tag for `<div className="relative">` (line 914), causing JSX bracket mismatch at line 1232.
  - Fix (2): Added missing `</div>` before the ternary closing `)}` to properly close the relative container.
- [x] `components/dashboard/CalendarPreview.js` — Today cell with `ring-2 ring-primary/30` + `bg-primary/5`, semantic event categories (info/primary/error/success), replaced all hardcoded gray/blue/red colors with design tokens, rounded-lg cells/buttons, view toggle with muted/50 pill style, calendar icon header, smooth transitions.
- [x] `components/dashboard/DashboardHeader.js` — Theme toggle (Sun/Moon), dropdown with shadow-elevated-lg + animate-scale-in, avatar with ring-2 hover, ChevronDown rotate-180, icons on menu items, error styling on logout.
- [x] `src/app/admin/dashboard/page.js` — gap-5, p-4/p-6/lg:p-8, animate-fade-in-up with stagger classes, space-y-5.

### Phase 5: User Dashboard Redesign
- [x] `src/app/dashboard/page.js` — Stats cards with ProgressRing for completion rate, AnimatedCounterSimple for values, gradient icon backgrounds (from-success/5, from-info/5, from-error/5), animate-fade-in-up with stagger. Search bar with group focus-within icon animation + expandable width (w-80→w-96). Tabs with rounded-xl pill style + Badge semantic variants. Section/view toggle as pill groups with bg-muted/50. Kanban column badges with semantic tokens (info-muted, error-muted, success-muted).
- [x] `components/TaskCard.js` — Status border classes (status-border-info/error/success), semantic urgency config (error/warning/success tokens), hover-lift + shadow-elevated transition, quiz cards with border-info, Badge info-solid for quiz label, resource link as text-info, overdue complete button as bg-error.
- [x] `components/FolderCard.js` — Semantic status config with progress-gradient-* classes, hover shadow-elevated + translate, custom badge with primary/10 tokens, gradient progress bars replacing Progress component, colored percentage text, modal with semantic badge classes, folder icon as text-primary.
- [x] `components/TaskList.js` — (Inline in page.js) Kanban column headers updated with semantic badge colors. View toggles updated to pill style. AnimatePresence transitions preserved.

### Phase 6: Skeleton Loader Updates
- [ ] **`components/dashboard/skeletons/`** — (Optional/Low Priority) Review and update skeleton loaders to match new layouts. Key files: `quick-metrics-skeleton`, `activity-feed-skeleton`, `task-management-skeleton`, `new-hire-tracker-skeleton`, `calendar-preview-skeleton`. Each skeleton should mirror the new card structures, spacing, and element sizes. Note: QuickMetrics already has MetricSkeleton defined inline.

---

## Remaining Pages & Components (Phases 7–12)

### Phase 7: Auth Pages
- [x] `src/app/forgot-password/page.js` — Already redesigned: GradientBackground + Card variant="glass", icon-prefixed inputs, semantic error/success tokens.
- [x] `src/app/reset-password/page.js` — Already redesigned: GradientBackground + Card variant="glass", Lock icon inputs, skeleton loader, semantic tokens.
- [x] `src/app/accept-admin-invite/page.js` — Already redesigned: GradientBackground + Card variant="glass", ShieldAlert admin badge, semantic tokens.

### Phase 8: Quiz Components
- [x] `components/quiz/question-item.jsx` — Already redesigned: success/error tokens for correct/incorrect states, ring-success/ring-error, bg-success-muted/bg-error-muted.
- [x] `components/quiz/quiz-results.jsx` — Already redesigned: success/error/warning/info tokens, border-t-success/error, semantic progress bar.
- [x] `components/quiz/info-item.jsx` — Already redesigned: border-info, text-info tokens.

### Phase 9: Admin Pages
- [x] `src/app/admin/quizzes/page.js` — Already redesigned: bg-success-muted/bg-error-muted/bg-warning-muted badges, semantic progress bars, text-success/text-error/text-warning tokens.
- [x] `src/app/admin/audit-logs/page.js` — Replaced text-destructive→text-error for failure count. text-success/text-error for status display.
- [x] `src/app/admin/profile/page.js` — Already redesigned: bg-info-muted/text-info, bg-success-muted/text-success, bg-warning-muted/text-warning, bg-error-muted/text-error for activity icons.

### Phase 10: Admin User Management Components
- [x] `components/admin/users/applicant-drawer.js` — Replaced 28 hardcoded colors: emerald→success, amber→warning, red→error, purple→primary, yellow stars→warning.
- [x] `components/admin/users/admin-document-upload.js` — Already redesigned: semantic category colors (info-muted, error-muted, success-muted, warning-muted, primary/10).
- [x] `components/admin/users/applicant-file-viewer-modal.js` — Replaced text-destructive→text-error. File type icons already use semantic tokens (text-info, text-success, text-warning, text-error).
- [x] `components/admin/users/AppraisalQuestionEditor.js` — Already redesigned: text-error, bg-error-muted, bg-warning-muted, text-warning tokens.
- [x] `components/admin/users/AppraisalQuestionsViewer.js` — Already redesigned: text-warning, primary/10 tokens.
- [x] `components/admin/users/quiz-submission-answers-modal.js` — Replaced bg-primary progress bar with conditional bg-success/bg-error. Pass/fail badges already use semantic tokens.
- [x] `components/admin/users/add-applicant-dialog.js` — Replaced text-destructive→text-error for required asterisks and validation errors.
- [x] `components/admin/users/bulk-delete-modal.js` — Replaced text-destructive→text-error on icon and error text.
- [x] `components/admin/users/progress-stepper.js` — Replaced bg-emerald-600→bg-success for completed steps and connector lines.

### Phase 11: Task Management Components
- [x] `components/tasks/TaskEditSheet.js` — Replaced all amber-* modified-field highlights→warning tokens, blue-* info alerts→info tokens, text-destructive→text-error.
- [x] `components/tasks/TasksTable.js` — Replaced text-red-500→text-error.
- [x] `components/tasks/AssignedTasksLogsTable.js` — Replaced text-red-500→text-error.
- [x] `components/tasks/CreateTaskForm.js` — Replaced all border-red-500→border-error, text-red-500→text-error for form validation.
- [x] `components/tasks/BulkCreateResourcesForm.js` — Replaced all hardcoded colors: red→error, green→success, blue→info, amber→warning, purple→primary tokens.
- [x] `components/tasks/DynamicTaskEditSheet.js` — Replaced blue-* info alerts→info tokens, text-destructive→text-error.
- [x] `components/tasks/BulkDeleteTasksModal.jsx` — Replaced text-destructive→text-error on icon and error text.

### Phase 12: Dashboard Utility Components
- [x] `components/dashboard/OnboardingHealth.js` — Already redesigned: bg-success/bg-warning/bg-error for health bars.
- [x] `components/admin/bottom-navigation.js` — Already redesigned: text-primary/text-muted-foreground, bg-primary indicator dot.

### Additional Components (discovered during sweep)
- [x] `components/dashboard/TaskManagement.js` — Replaced ~30 remaining hardcoded colors from Phase 4 (emerald/amber/red/blue/purple→semantic tokens).
- [x] `components/dashboard/NewHireTracker.js` — Replaced ~6 remaining hardcoded colors from Phase 4 (green/amber→success/warning tokens).
- [x] `components/TaskList.js` — Replaced all hardcoded color configs (red/amber/green→error/warning/success tokens).
- [x] `components/dashboard/subComponents/FloatingQuickActions.jsx` — Replaced bg-amber-500/bg-green-500→bg-warning/bg-success.
- [x] `components/dashboard/NotificationCenter.js` — Replaced red/green/amber notification type colors→error/success/warning tokens.
- [x] `components/dashboard/subComponents/new-staff-task-modal.js` — Replaced bg-red-100 text-red-700→bg-error-muted text-error.
- [x] `components/dashboard/subComponents/file-viewer-modal.js` — Replaced text-destructive→text-error.
- [x] `components/admin/Sidebar.js` — Replaced red-600 logout colors→text-error/bg-error-muted.
- [x] `components/quiz/quiz-client.jsx` — Replaced text-destructive→text-error for error states.

---

## Implementation Notes

### Design Patterns to Follow
1. **Semantic status colors:** Always use `success/warning/error/info` tokens instead of raw color values (green-500, red-500, etc.)
2. **Card variants:** Use `variant="interactive"` for clickable cards, `variant="elevated"` for prominent sections, `variant="glass"` for overlay contexts
3. **Animations:** Use Tailwind animation classes (`animate-fade-in-up`, `animate-scale-in`) for simple cases. Use Framer Motion variants from `utils.js` for complex/conditional animations.
4. **Hover effects:** Use `.hover-lift` CSS class for simple card lift. Use `cardHover`/`cardInteractive` Framer Motion variants for animated cards.
5. **Status borders:** Use `.status-border-success/warning/error/info` CSS classes for task cards with left colored border + subtle bg tint.
6. **Loading states:** Always use skeleton components. Per `components/dashboard/CLAUDE.md`, update skeletons when changing component layout.
7. **SWR hooks:** Per `components/dashboard/CLAUDE.md`, NEVER change data fetching patterns during UI redesign.
8. **Pages:** Per `src/app/CLAUDE.md`, pages are thin wrappers. Only layout/composition changes in page files.
9. **API routes:** NOT in scope. Do not touch any files in `src/app/api/`.

### Common Imports for Redesigned Components
```js
// Animation utilities
import { cn } from "@components/lib/utils"
import { fadeInUp, staggerContainer, listItemWithIndex, cardHover } from "@components/lib/utils"

// New UI components
import { AnimatedCounterSimple, ProgressRing } from "@components/ui/animated-counter"
import { StatusDot, StatusIndicator, StatusRing, StatusBadge } from "@components/ui/status-indicator"
import { ScrollFadeEdges, GradientBackground } from "@components/ui/gradient-background"
import { Badge } from "@components/ui/badge" // now has success/warning/error/info variants
import { Card } from "@components/ui/card" // now has variant prop: interactive/elevated/glass/ghost
```

### Status-to-Semantic Color Mapping (for task cards)
```
completed / done     → success (green)
overdue / expired    → error (red)
in_progress / active → info (blue)
pending / upcoming   → warning (amber)
not_started          → muted (gray)
```

---
---

# ADMIN PAGES FULL UI REDESIGN

> **Purpose:** Complete visual overhaul of all `/admin/*` pages to create a professional, sleek, and intuitive admin experience.
> **Scope:** UI-only. No backend logic, API routes, data fetching patterns, or SWR hooks are to be changed.
> **Aesthetic Direction:** Refined clinical luxury — clean, confident, spacious. Inspired by premium SaaS dashboards (Linear, Vercel, Notion). Light neutrals with deliberate accent usage, generous whitespace, typographic hierarchy, and purposeful micro-interactions.
> **Last Updated:** 2026-02-03

---

## Design Direction & Principles

### Visual Identity
- **Tone:** Refined, professional, quietly confident. Not playful, not brutalist — premium SaaS.
- **Color Strategy:** Predominantly neutral (slate/zinc tones) with the existing semantic tokens (success/warning/error/info) used sparingly for status indicators only. Primary color used as an accent, not a wash.
- **Typography:** Use the existing typography scale (`text-display`, `text-headline`, `text-title`, `text-title-sm`, `text-body`, `text-body-sm`, `text-caption`, `text-overline`). Enforce hierarchy — page titles in `text-headline`, section headers in `text-title-sm`, body in `text-body-sm`.
- **Spacing:** Generous. Consistent `gap-6` between major sections. `p-6 md:p-8` page padding. Breathing room between elements.
- **Cards:** Use `variant="elevated"` for primary content containers. Minimal borders (`border-border/40`), subtle shadows. No heavy border-radius stacking.
- **Animations:** Restrained. `animate-fade-in-up` on page load with stagger. `transition-all duration-base ease-out-expo` on hovers. No bouncing, no excessive motion.
- **Tables:** Clean horizontal lines only (no cell borders). Row hover with `bg-muted/30`. Comfortable row height (h-14). Sticky headers.
- **Buttons:** Primary actions use `default` variant. Secondary/filters use `outline` or `ghost`. Always pair icons with text for primary actions.
- **Empty States:** Centered with muted icon, descriptive text, and a CTA button.

### Layout Framework (applies to ALL admin pages)
```
┌─────────────────────────────────────────────────┐
│ Page Header                                      │
│  [Title]                        [Primary Action] │
│  [Description]                  [Secondary Acts]  │
├─────────────────────────────────────────────────┤
│ Toolbar / Filters (if applicable)                │
│  [Search] [Filter chips] [View toggle]   [Sort] │
├─────────────────────────────────────────────────┤
│ Content Area                                     │
│  (Table / Grid / Cards)                          │
├─────────────────────────────────────────────────┤
│ Pagination / Footer info                         │
└─────────────────────────────────────────────────┘
```

Every admin page follows this structure. The page header is ALWAYS a flex row with title+description on the left and actions on the right.

---

## Constraints & Rules

1. **NO backend changes.** Do not modify any file in `src/app/api/`.
2. **NO data fetching changes.** SWR hooks, fetch calls, mutate patterns — leave untouched.
3. **NO prop interface changes.** Components must accept the same props they currently receive.
4. **DO NOT modify `components/ui/` base components directly.** Extend or wrap them.
5. **Always update skeleton loaders** to match new layouts when changing component structure.
6. **Use `cn()` utility** from `@components/lib/utils` for conditional class merging.
7. **Preserve all existing functionality** — every button, filter, action, modal must continue working.
8. **Mobile-first responsive.** Test at 375px, 768px, 1024px, 1440px breakpoints.

---

## Task Checklist

### Phase A: Admin Layout & Navigation Overhaul

- [x] **Task A1: Redesign Admin Sidebar (`components/admin/admin-sidebar.js`)**
**File:** `components/admin/admin-sidebar.js` (258 lines)
**Current state:** Basic sidebar with SC logo, nav items, active border-l-2, icon-only mode at 768-1200px.
**Changes:**
  - [x] Replace the `SC` square logo block with a refined wordmark: render "Smile Cliniq" in `text-body-sm font-semibold tracking-tight` with a small tooth/smile SVG icon (16x16) to the left. In icon-only mode, show just the SVG icon.
  - [x] Add a subtle top-to-bottom gradient on the sidebar background: `bg-gradient-to-b from-background to-muted/20`.
  - [x] Restyle nav items: remove `border-l-2` active indicator. Replace with a `bg-primary/8 text-foreground font-medium rounded-lg` background for active state. Inactive items: `text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg`.
  - [x] Add nav group labels: "MAIN" above Dashboard/Tasks/Resources, "MANAGEMENT" above Users/Quizzes/Audit Logs. Use `text-overline text-muted-foreground/60 tracking-widest px-3 mb-1 mt-4` for group labels. In icon-only mode, hide group labels.
  - [x] Footer section: add a thin `border-t border-border/40` separator. Profile item shows first-name initial in a 28x28 rounded-full avatar with `bg-primary/10 text-primary text-caption font-semibold`. In icon-only mode, show just the avatar circle.
  - [x] Logout button: `text-muted-foreground hover:text-error hover:bg-error/5 rounded-lg`.
  - [x] Set sidebar width to `w-60` (240px) expanded, `w-16` (64px) icon-only.
  - [x] Add a collapse toggle button at the bottom of the sidebar (above footer): a small `ChevronLeft` icon button that toggles between expanded and icon-only mode. Store preference in localStorage key `sidebar-collapsed`.
  - [x] Transition: `transition-all duration-slow ease-out-expo` on width changes.

- [x] **Task A2: Redesign Mobile Bottom Navigation (`components/admin/bottom-navigation.js`)**
**File:** `components/admin/bottom-navigation.js` (76 lines)
**Current state:** Fixed bottom bar with 5 items, dot indicator, tap animation.
**Changes:**
  - [x] Replace the colored dot active indicator with a filled pill background: active item gets `bg-primary/10 rounded-xl px-3 py-1.5` wrapper around icon+label.
  - [x] Shrink icon size from `h-5 w-5` to `h-4.5 w-4.5`. Add a `text-[10px] font-medium` label below each icon.
  - [x] Active item: `text-primary`. Inactive: `text-muted-foreground`.
  - [x] Add `backdrop-blur-lg bg-background/80 border-t border-border/30` to the bar for a frosted glass effect.
  - [x] Keep the Framer Motion tap animation (`scale: 0.95` on tap).
  - [x] Set bar height to `h-14` (down from h-16).

- [x] **Task A3: Redesign Admin Layout Wrapper (`src/app/admin/layout.js`)**
**File:** `src/app/admin/layout.js` (24 lines)
**Current state:** SidebarProvider wrapping AdminSidebar + main + BottomNavigation.
**Changes:**
  - [x] Add `bg-background-subtle` (or `bg-muted/20`) to the `<main>` content area to create contrast between sidebar (white) and content (off-white).
  - [x] Set main content area to `overflow-y-auto` with `scroll-smooth`.
  - [x] Add `min-h-screen` to the flex container.
  - [x] Mobile: set `pb-16` (for bottom nav clearance). Desktop: `pb-0`.

---

### Phase B: Admin Dashboard Page Redesign

- [x] **Task B1: Redesign Dashboard Page Layout (`src/app/admin/dashboard/page.js`)**
**File:** `src/app/admin/dashboard/page.js` (74 lines)
**Current state:** 6-column grid with various widgets. DashboardHeader in top-right corner.
**Changes:**
  - [ ] Replace the current grid with a cleaner layout:
    ```
    Row 1: Page header (full width) — "Dashboard" title + DashboardHeader (profile dropdown) on the right
    Row 2: QuickMetrics (full width, 4 cards in a row)
    Row 3: 2-column split — TaskManagement (left, col-span-3) + Sidebar column (right, col-span-2) containing CalendarPreview, OnboardingHealth
    Row 4: 2-column split — NewHireTracker (left, col-span-3) + ActivityFeed (right, col-span-2)
    Row 5: Full width — NotificationCenter (compact)
    ```
  - [ ] Use `grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 md:p-8` as the outer grid.
  - [ ] Add a visible page header: `<div className="lg:col-span-5 flex items-center justify-between"><div><h1 className="text-headline">Dashboard</h1><p className="text-body-sm text-muted-foreground">Overview of your onboarding operations</p></div><DashboardHeader /></div>`.
  - [ ] Remove ResourceHub lazy load from dashboard (it has its own page). Remove FloatingQuickActions (replaced by clear primary actions in each section).
  - [ ] Apply `animate-fade-in-up` with stagger classes `stagger-1` through `stagger-5` on each row.

- [x] **Task B2: Redesign QuickMetrics Component (`components/dashboard/QuickMetrics.js`)**
**File:** `components/dashboard/QuickMetrics.js`
**Current state:** 2-column/4-column grid with gradient tinted cards, animated counters, trend indicators.
**Changes:**
  - [ ] Layout: `grid grid-cols-2 lg:grid-cols-4 gap-4`.
  - [ ] Each metric card: `Card` with `variant="elevated"` and `p-5`. No gradient background tints — use a clean white card.
  - [ ] Top of card: small semantic icon (24x24) in a `w-9 h-9 rounded-lg bg-{semantic}/8 flex items-center justify-center` container. Use `text-info` for active onboardings, `text-warning` for tasks due, `text-success` for completed, `text-error` for overdue.
  - [ ] Metric value: `text-headline font-bold` using `AnimatedCounterSimple`.
  - [ ] Metric label: `text-caption text-muted-foreground uppercase tracking-wide mt-1`.
  - [ ] Trend indicator: small `text-caption` pill below the value. Green up arrow + percentage for positive, red down arrow for negative. Use `bg-success/10 text-success` or `bg-error/10 text-error` with `rounded-full px-2 py-0.5`.
  - [ ] Hover: `hover:shadow-elevated transition-shadow duration-base`.
  - [ ] Skeleton: update `MetricSkeleton` to match new card structure — `Skeleton` for icon area (w-9 h-9 rounded-lg), value area (h-8 w-20), label area (h-3 w-24), trend area (h-4 w-14 rounded-full).

- [x] **Task B3: Redesign DashboardHeader (`components/dashboard/DashboardHeader.js`)**
**File:** `components/dashboard/DashboardHeader.js`
**Current state:** Theme toggle + profile dropdown in top-right.
**Changes:**
  - [ ] Render as a horizontal flex row: `flex items-center gap-3`.
  - [ ] Theme toggle: `ghost` button with Sun/Moon icon, `h-9 w-9 rounded-lg`.
  - [ ] Profile dropdown trigger: `flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors`. Show avatar (32x32 rounded-full with initials, `bg-primary/10 text-primary font-medium text-caption`) + name in `text-body-sm font-medium` + `ChevronDown` icon (h-3.5 w-3.5 text-muted-foreground).
  - [ ] Dropdown content: `shadow-elevated-lg rounded-xl border border-border/40 p-1 min-w-[200px]`. Menu items with `rounded-lg` and `px-3 py-2 text-body-sm`. Logout item styled with `text-error hover:bg-error/5`.
  - [ ] Add `animate-scale-in` to dropdown open.

- [x] **Task B4: Redesign ActivityFeed (`components/dashboard/ActivityFeed.js`)**
**File:** `components/dashboard/ActivityFeed.js`
**Current state:** Timeline with vertical gradient line, activity items with icons and avatars.
**Changes:**
  - [ ] Wrap in `Card variant="elevated"`.
  - [ ] Card header: `flex items-center justify-between`. Title: `text-title-sm`. "View All" link: `text-body-sm text-primary hover:underline`.
  - [ ] Remove the timeline vertical line. Replace with a clean list layout — each item is a horizontal row: `flex items-center gap-3 py-3 border-b border-border/30 last:border-0`.
  - [ ] Each item: 36x36 rounded-full icon container (colored by activity type using semantic tokens), then text block (action description in `text-body-sm`, timestamp in `text-caption text-muted-foreground`), then a right-aligned relative time badge.
  - [ ] Hover: `hover:bg-muted/20 rounded-lg -mx-2 px-2 transition-colors`.
  - [ ] Limit to 5 items. Show skeleton loader (5 rows of: circle skeleton + two line skeletons).
  - [ ] Empty state: centered muted icon + "No recent activity" text.

- [x] **Task B5: Redesign TaskManagement (`components/dashboard/TaskManagement.js`)**
**File:** `components/dashboard/TaskManagement.js` (900+ lines)
**Current state:** Complex multi-state component with tabs (upcoming/overdue/flagged), task cards, multiple modals.
**IMPORTANT:** This is a large, complex component. Changes are cosmetic only — do not restructure the state management or modal logic.
**Changes:**
  - [ ] Wrap in `Card variant="elevated"`.
  - [ ] Card header: title `text-title-sm` + a row of tab pills. Restyle tabs: remove current styling. Use `inline-flex items-center gap-1 bg-muted/40 rounded-lg p-1` as tabs container. Each tab trigger: `rounded-md px-3 py-1.5 text-body-sm font-medium transition-all`. Active: `bg-background text-foreground shadow-sm`. Inactive: `text-muted-foreground hover:text-foreground`.
  - [ ] Show count badges inside tabs: `<Badge variant="secondary" className="ml-1.5 text-caption px-1.5">{count}</Badge>`.
  - [ ] Task list items: clean rows with `flex items-center gap-3 py-3 border-b border-border/20 last:border-0`. Priority indicator as a 3px-wide left border on each row (colored by priority: error for very-high/high, warning for medium, info for low/very-low). Task name in `text-body-sm font-medium`. Due date in `text-caption text-muted-foreground`. Assignee as small avatar (24x24). Status badge using semantic Badge variants.
  - [ ] Action buttons on hover: show `ghost` icon buttons (edit, flag, complete) on row hover using `opacity-0 group-hover:opacity-100 transition-opacity`.
  - [ ] Keep all existing modals — just ensure they use `rounded-xl` dialog content and consistent spacing (`p-6`).
  - [ ] Skeleton: 5 rows of horizontal skeleton lines.

- [x] **Task B6: Redesign NewHireTracker (`components/dashboard/NewHireTracker.js`)**
**File:** `components/dashboard/NewHireTracker.js`
**Current state:** Header with icon, progress bars, avatar rings.
**Changes:**
  - [ ] Wrap in `Card variant="elevated"`.
  - [ ] Card header: `text-title-sm` + hire count as `Badge variant="secondary"`.
  - [ ] Each hire entry: clean horizontal row with `flex items-center gap-4 py-3 border-b border-border/20 last:border-0`.
  - [ ] Avatar: 36x36 rounded-full with initials, `bg-primary/5 text-primary text-caption font-semibold`.
  - [ ] Name + stage in a text block: name in `text-body-sm font-medium`, stage in `text-caption text-muted-foreground`.
  - [ ] Progress bar: `h-1.5 rounded-full bg-muted` track with colored fill. Color by completion: `bg-success` (>75%), `bg-info` (50-75%), `bg-warning` (25-50%), `bg-error` (<25%). Show percentage on the right in `text-caption font-medium`.
  - [ ] Hover: `hover:bg-muted/20 rounded-lg -mx-2 px-2 transition-colors`.

- [x] **Task B7: Redesign CalendarPreview (`components/dashboard/CalendarPreview.js`)**
**File:** `components/dashboard/CalendarPreview.js`
**Current state:** Calendar with today ring, event categories, view toggle.
**Changes:**
  - [ ] Wrap in `Card variant="elevated"`.
  - [ ] Compact calendar: smaller cells, `text-caption` for date numbers.
  - [ ] Today: `bg-primary text-primary-foreground rounded-full font-semibold` (solid, not just a ring).
  - [ ] Events: small 4px dots below dates (colored by type). Max 3 dots per day.
  - [ ] No view toggle — keep month view only for dashboard (full calendar is elsewhere).
  - [ ] Header: month/year in `text-title-sm font-medium`, nav arrows as `ghost` icon buttons.

- [x] **Task B8: Redesign OnboardingHealth (`components/dashboard/OnboardingHealth.js`)**
**File:** `components/dashboard/OnboardingHealth.js`
**Current state:** Health metric bars.
**Changes:**
  - [ ] Wrap in `Card variant="elevated"`.
  - [ ] Title: `text-title-sm`.
  - [ ] Health metrics as horizontal bars: label on the left (`text-body-sm`), bar in the middle (`h-2 rounded-full bg-muted flex-1`), percentage on the right (`text-caption font-medium`).
  - [ ] Bar fill colors: `bg-success` (healthy, >80%), `bg-warning` (moderate, 50-80%), `bg-error` (needs attention, <50%).
  - [ ] Space between metrics: `space-y-4`.
  - [ ] Add subtle `animate-fade-in-up` on mount.

- [x] **Task B9: Redesign NotificationCenter (`components/dashboard/NotificationCenter.js`)**
**File:** `components/dashboard/NotificationCenter.js`
**Current state:** Notification panel with various notification types.
**Changes:**
  - [ ] Wrap in `Card variant="elevated"`.
  - [ ] Header: `text-title-sm` + unread count in `Badge variant="info"` + "Mark all read" ghost button.
  - [ ] Notification items: `flex items-start gap-3 py-3 border-b border-border/20 last:border-0`. Icon on left (colored by notification type using semantic tokens, 32x32 rounded-lg container). Text block: title in `text-body-sm font-medium`, description in `text-caption text-muted-foreground`, timestamp in `text-caption text-muted-foreground/60`. Unread indicator: `w-2 h-2 rounded-full bg-primary` dot on the right.
  - [ ] Hover: `hover:bg-muted/20 rounded-lg -mx-2 px-2 transition-colors`.
  - [ ] Max 4 notifications visible. "View All" link at bottom.

---

### Phase C: Admin Users Page Redesign

- [ ] **Task C1: Redesign UsersPage Container (`components/admin/users/users-page.js`)**
**File:** `components/admin/users/users-page.js` (225 lines)
**Current state:** Header + Card with filters + Card with table. Separate "Search & Filters" card.
**Changes:**
  - [ ] Remove the separate "Search & Filters" Card wrapper. Integrate filters directly into the page toolbar.
  - [ ] Page header: `flex items-center justify-between mb-6`. Left: `<h1 className="text-headline">Users</h1>` + `<p className="text-body-sm text-muted-foreground">Manage applicants and team members</p>`. Right: action buttons row (`flex items-center gap-2`): Refresh as `ghost` icon button (`RotateCw` icon only, no label), Add Applicant as `default` button with `Plus` icon.
  - [ ] Toolbar row below header: `flex flex-wrap items-center gap-3 mb-4`. Search: `relative` div with `Search` icon + `Input` with `pl-9 h-10 w-72 rounded-lg bg-background border-border/40`. On focus: `ring-2 ring-primary/20`.
  - [ ] Stage filter pills: `inline-flex items-center gap-1 bg-muted/30 rounded-lg p-1`. Each stage: `rounded-md px-3 py-1.5 text-body-sm`. Active: `bg-background text-foreground shadow-sm font-medium`. Inactive: `text-muted-foreground hover:text-foreground`.
  - [ ] Page size selector: pushed to right with `ml-auto`. Compact: `flex items-center gap-2 text-body-sm text-muted-foreground`.
  - [ ] Bulk delete: when items selected, show a `bg-error/5 border border-error/20 rounded-lg px-3 py-2` bar above the table with selected count + Delete button.
  - [ ] Table wrapped in a single `Card variant="elevated"` with no CardHeader — table starts immediately with proper spacing.

- [ ] **Task C2: Redesign UsersTable (`components/admin/users/users-table.js`)**
**File:** `components/admin/users/users-table.js` (253 lines)
**Current state:** Standard table with checkboxes, avatar+name, stage badges, multiple columns.
**Changes:**
  - [ ] Table styling: remove outer `border rounded-md`. Use clean lines only: `border-b border-border/30` between rows.
  - [ ] Table header: `bg-muted/20 sticky top-0 z-10`. Header text: `text-overline text-muted-foreground/70 uppercase tracking-wider font-medium`. Header height: `h-11`.
  - [ ] Row height: `h-14`. Row hover: `hover:bg-muted/20 transition-colors cursor-pointer`.
  - [ ] Applicant column: Avatar (32x32 rounded-full, `bg-primary/5 text-primary font-medium text-caption`) + name (`text-body-sm font-medium`) + email (`text-caption text-muted-foreground`). Name underline on hover: `group-hover:underline`.
  - [ ] Stage column: use `Badge` with semantic variant mapping: "New Application" → `variant="info-subtle"`, "Interview" stages → `variant="warning-subtle"`, "Review" stages → `variant="secondary"`, "Rejected" → `variant="error-subtle"`, "Hired" → `variant="success-subtle"`.
  - [ ] Reduce visible columns on desktop to: Select, Applicant (name+email), Stage, Job, Location, Created, Actions. Remove Documents/Feedback/Source columns from the main view (these are in the drawer).
  - [ ] Actions column: `Eye` icon button as `ghost size="icon"` with tooltip.
  - [ ] Pagination: restyle to match toolbar aesthetic. `flex items-center justify-between px-4 py-3 border-t border-border/20`. Page info in `text-caption text-muted-foreground`. Buttons as `outline size="sm"` with proper disabled states.
  - [ ] Loading state: replace Loader2 spinner with skeleton rows (6 rows matching column layout).
  - [ ] Empty state: centered in table area. Muted `Users` icon (48x48), "No applicants found" in `text-body-sm text-muted-foreground`, "Try adjusting your filters" in `text-caption text-muted-foreground/60`.

- [ ] **Task C3: Restyle ApplicantDrawer (`components/admin/users/applicant-drawer.js`)**
**File:** `components/admin/users/applicant-drawer.js` (2,453 lines)
**IMPORTANT:** This is the largest component. Only cosmetic CSS class changes. Do not restructure JSX or logic.
**Changes:**
  - [ ] Sheet content: `max-w-2xl` width (currently varies). Add `border-l border-border/30`.
  - [ ] Header: Large avatar (56x56 rounded-full, `bg-primary/5 text-primary text-title font-bold`) + name (`text-title font-semibold`) + stage badge + email in `text-body-sm text-muted-foreground`. Clean horizontal layout.
  - [ ] Tabs: restyle to underline style. Tab container: `border-b border-border/30`. Active tab: `border-b-2 border-primary text-foreground font-medium pb-3`. Inactive: `text-muted-foreground hover:text-foreground pb-3`.
  - [ ] Tab content: `pt-4` padding top.
  - [ ] All inner cards/sections: use `rounded-lg border border-border/30 p-4` consistently.
  - [ ] Progress stepper: refine to use `bg-success` for completed steps, `bg-primary` for current, `bg-muted` for upcoming. Step labels in `text-caption`.
  - [ ] Action buttons at bottom of drawer: `sticky bottom-0 bg-background border-t border-border/30 p-4 flex items-center gap-2`.
  - [ ] All inner Badges: ensure they use semantic variants consistently.

- [ ] **Task C4: Restyle AddApplicantDialog (`components/admin/users/add-applicant-dialog.js`)**
**File:** `components/admin/users/add-applicant-dialog.js` (387 lines)
**Changes:**
  - [ ] Dialog content: `rounded-xl max-w-lg`.
  - [ ] Form fields: consistent `space-y-4`. Each field: `<Label className="text-body-sm font-medium">` + `<Input className="h-10 rounded-lg">`.
  - [ ] Required field asterisks: `text-error` (already done).
  - [ ] Error messages: `text-caption text-error mt-1`.
  - [ ] Form actions: `flex items-center justify-end gap-2 pt-4 border-t border-border/30 mt-6`. Cancel as `outline`, Submit as `default`.

---

### Phase D: Admin Assigned Tasks Page Redesign

- [ ] **Task D1: Redesign AssignedTasksLogsPage (`components/tasks/AssignedTasksLogsPage.js`)**
**File:** `components/tasks/AssignedTasksLogsPage.js`
**Current state:** Simple wrapper with header + AssignedTasksLogsTable.
**Changes:**
  - [ ] Page header: `flex items-center justify-between mb-6`. Title: `text-headline` "Assigned Tasks". Description: `text-body-sm text-muted-foreground` "Track task assignments across all applicants". Primary action button on right.
  - [ ] Add `animate-fade-in-up` on the content.

- [ ] **Task D2: Redesign AssignedTasksLogsTable (`components/tasks/AssignedTasksLogsTable.js`)**
**File:** `components/tasks/AssignedTasksLogsTable.js`
**Current state:** Table with resizable columns, filters, pagination. Very similar structure to TasksTable.
**Changes:**
  - [ ] Apply same table styling as Task C2 (UsersTable): clean lines, no cell borders, `bg-muted/20` header, `h-14` row height, `hover:bg-muted/20` rows.
  - [ ] Filter bar: inline toolbar above table. Search input (`w-72 h-10 rounded-lg`), filter dropdowns as `Select` components with `h-9 rounded-lg`, clear filters as `ghost` button.
  - [ ] Active filter chips: `inline-flex items-center gap-1.5 bg-muted/40 rounded-full px-2.5 py-1 text-caption`. X button to remove.
  - [ ] Status column: use semantic `Badge` variants (same mapping as task cards).
  - [ ] Date columns: `text-body-sm text-muted-foreground`. Format as relative ("2 days ago") with tooltip showing full date.
  - [ ] Actions: `ghost size="icon"` buttons.
  - [ ] Wrap table in `Card variant="elevated"` with no header padding.
  - [ ] Pagination: same style as Task C2.
  - [ ] Loading: skeleton rows matching column layout.

---

### Phase E: Admin Resources Page Redesign

- [ ] **Task E1: Redesign ResourcePage (`components/tasks/ResourcePage.js`)**
**File:** `components/tasks/ResourcePage.js`
**Current state:** Simple wrapper with header + TasksTable + CreateTaskDialog.
**Changes:**
  - [ ] Page header: `flex items-center justify-between mb-6`. Title: `text-headline` "Resources". Description: `text-body-sm text-muted-foreground` "Manage task templates and onboarding resources". "Create Resource" button on right as `default` variant with `Plus` icon.
  - [ ] Add `animate-fade-in-up` on content.

- [ ] **Task E2: Redesign TasksTable (`components/tasks/TasksTable.js`)**
**File:** `components/tasks/TasksTable.js`
**Current state:** Table with resizable columns, AnimatedSearchBar, filters, sorting, pagination.
**Changes:**
  - [ ] Apply same table styling pattern as Tasks C2 and D2.
  - [ ] Filter toolbar: horizontal row above table. Search: `Input w-72 h-10 rounded-lg pl-9` with Search icon. Filter dropdowns (Week, Day, Job, Folder): `Select h-9 rounded-lg` components with `min-w-[120px]`. Active filter pills below toolbar.
  - [ ] Table header: `bg-muted/20 sticky top-0`. Header cells: `text-overline text-muted-foreground/70 uppercase tracking-wider font-medium`.
  - [ ] Column resizing: keep the resize handles but make them subtler — `w-1 bg-transparent hover:bg-primary/30 cursor-col-resize` (visible only on hover).
  - [ ] Sort indicators: use `ChevronUp`/`ChevronDown` icons (h-3.5 w-3.5) next to sorted column header, `text-primary` when active.
  - [ ] Row styling: `h-14 hover:bg-muted/20 transition-colors`. Text in `text-body-sm`.
  - [ ] Wrap in `Card variant="elevated"`.
  - [ ] Pagination: consistent with other tables.
  - [ ] Empty state: centered AnimatedEmptyState.

---

### Phase F: Admin Quizzes Page Redesign

- [ ] **Task F1: Redesign Quizzes Page Layout (`src/app/admin/quizzes/page.js` — outer structure)**
**File:** `src/app/admin/quizzes/page.js` (1,132 lines)
**IMPORTANT:** This is a monolithic file. Only change CSS classes and minor JSX wrappers. Do not restructure state/logic.
**Changes — Page header + tabs:**
  - [ ] Page header: `flex items-center justify-between mb-6`. Title: `text-headline` "Quizzes". Description: `text-body-sm text-muted-foreground`.
  - [ ] Tabs: restyle TabsList to use the pill-group pattern: `inline-flex items-center gap-1 bg-muted/30 rounded-lg p-1`. TabsTrigger: `rounded-md px-4 py-1.5 text-body-sm font-medium`. Active: `bg-background text-foreground shadow-sm`. Inactive: `text-muted-foreground`.
  - [ ] Search + Filters row: `flex items-center gap-3 mt-4`. Input: `h-10 w-72 rounded-lg pl-9` with Search icon. Filters popover trigger: `outline` button with Filter icon.
  - [ ] Active filter chips below search (same style as Phase D).

- [ ] **Task F2: Redesign Submissions Tab (within quizzes page)**
**Changes — Submissions grid:**
  - [ ] Submission cards: `Card variant="interactive"` with `p-4 rounded-xl`. Grid: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`.
  - [ ] Card top: quiz title in `text-body-sm font-medium truncate`, date in `text-caption text-muted-foreground`.
  - [ ] Pass/Fail badge: use semantic `Badge variant="success-subtle"` or `Badge variant="error-subtle"`.
  - [ ] Score section: `text-caption` label, `text-body-sm font-semibold` score, clean `h-1.5 rounded-full bg-muted` progress bar with `bg-success`/`bg-error` fill.
  - [ ] View button: `ghost size="sm"` with Eye icon.
  - [ ] Card hover: `hover:shadow-elevated hover:border-border/60 transition-all duration-base`.
  - [ ] Viewer dialog: restyle with `rounded-xl` content, consistent padding, semantic badges.

- [ ] **Task F3: Redesign Quizzes Tab (within quizzes page)**
**Changes — Quizzes grid:**
  - [ ] Quiz cards: `Card variant="interactive"` with `p-4 rounded-xl`. Same grid as submissions.
  - [ ] Card: quiz title in `text-body-sm font-medium`, passing score in `text-caption text-muted-foreground`.
  - [ ] Edit button: `outline size="sm"`.
  - [ ] Edit dialog: ensure `rounded-xl` content, consistent field spacing (`space-y-4`), `text-body-sm` labels, `h-10` inputs.
  - [ ] Quiz items in edit: each item card uses `rounded-lg border border-border/30 p-4`. Dirty indicator: `border-warning/40 bg-warning/3`. Error indicator: `border-error/40 bg-error/3`.
  - [ ] Save/Preview buttons: `flex items-center gap-2`. Save as `default`, Preview as `outline`.

---

### Phase G: Cross-Cutting Improvements

- [ ] **Task G1: Create Consistent Page Header Component**
**New file:** `components/admin/page-header.js`
**Purpose:** Extract the repeated page header pattern into a reusable component.
**Props:** `title` (string), `description` (string), `children` (React node — for action buttons on the right).
**Structure:**
```jsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-fade-in-up">
  <div>
    <h1 className="text-headline">{title}</h1>
    {description && <p className="text-body-sm text-muted-foreground mt-1">{description}</p>}
  </div>
  {children && <div className="flex items-center gap-2">{children}</div>}
</div>
```
**Usage:** Replace page headers in all admin pages with `<PageHeader>`.

- [ ] **Task G2: Create Consistent Table Toolbar Component**
**New file:** `components/admin/table-toolbar.js`
**Purpose:** Extract the repeated search + filter toolbar pattern.
**Props:** `searchValue`, `onSearchChange`, `searchPlaceholder`, `children` (for filter controls).
**Structure:** Horizontal flex row with search input and slot for filter controls.
**Usage:** Replace filter sections in UsersPage, TasksTable, AssignedTasksLogsTable, QuizzesPage.

- [ ] **Task G3: Update All Admin Page Wrappers**
**Files:** `src/app/admin/assigned-tasks/page.js`, `src/app/admin/resources/page.js`, `src/app/admin/users/page.js`, `src/app/admin/quizzes/page.js`
**Changes:**
  - [ ] All page wrappers: set consistent padding `p-6 md:p-8`, `bg-background-subtle` (inherits from layout), `space-y-0` (spacing is managed by components inside).
  - [ ] Add `animate-fade-in-up` on the main content div.

- [ ] **Task G4: Mobile Page Header Integration (`components/admin/mobile-page-header.js`)**
**File:** `components/admin/mobile-page-header.js` (28 lines)
**Changes:**
  - [ ] Style: `sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/30 px-4 py-3`.
  - [ ] Title: `text-title-sm font-semibold`.
  - [ ] Add a small breadcrumb-style back arrow on sub-pages (profile, etc.).

---

## Implementation Order

Execute in phase order (A → B → C → D → E → F → G). Within each phase, tasks can be done in parallel EXCEPT where noted. Task G1 and G2 should ideally be done first in Phase G, then G3 uses them.

**Phase dependencies:**
- Phase A (layout/navigation) should be done FIRST as it affects all pages.
- Phases B, C, D, E, F can be done in parallel after Phase A.
- Phase G should be done LAST to extract common patterns after individual pages are styled.

## Files in Scope (Complete List)

| File | Phase | Task |
|------|-------|------|
| `components/admin/admin-sidebar.js` | A | A1 |
| `components/admin/bottom-navigation.js` | A | A2 |
| `src/app/admin/layout.js` | A | A3 |
| `src/app/admin/dashboard/page.js` | B | B1 |
| `components/dashboard/QuickMetrics.js` | B | B2 |
| `components/dashboard/DashboardHeader.js` | B | B3 |
| `components/dashboard/ActivityFeed.js` | B | B4 |
| `components/dashboard/TaskManagement.js` | B | B5 |
| `components/dashboard/NewHireTracker.js` | B | B6 |
| `components/dashboard/CalendarPreview.js` | B | B7 |
| `components/dashboard/OnboardingHealth.js` | B | B8 |
| `components/dashboard/NotificationCenter.js` | B | B9 |
| `components/admin/users/users-page.js` | C | C1 |
| `components/admin/users/users-table.js` | C | C2 |
| `components/admin/users/applicant-drawer.js` | C | C3 |
| `components/admin/users/add-applicant-dialog.js` | C | C4 |
| `components/tasks/AssignedTasksLogsPage.js` | D | D1 |
| `components/tasks/AssignedTasksLogsTable.js` | D | D2 |
| `components/tasks/ResourcePage.js` | E | E1 |
| `components/tasks/TasksTable.js` | E | E2 |
| `src/app/admin/quizzes/page.js` | F | F1, F2, F3 |
| `components/admin/page-header.js` (NEW) | G | G1 |
| `components/admin/table-toolbar.js` (NEW) | G | G2 |
| `src/app/admin/assigned-tasks/page.js` | G | G3 |
| `src/app/admin/resources/page.js` | G | G3 |
| `src/app/admin/users/page.js` | G | G3 |
| `components/admin/mobile-page-header.js` | G | G4 |

---

### Phase H: Admin Resources Page UX Overhaul

> **Problem Statement:** The `/admin/resources` page "feels like a lot". Records are displayed as a flat, overwhelming list with no visual grouping. Week/day ordering is broken (showing "1, 1, 4, 2, 1" jumbled sequences) because Airtable sorts `Week Number` and `Day Number` as strings, not integers. 10 columns are visible simultaneously, creating horizontal scroll and cognitive overload. There is no way to see the task structure at a glance.
>
> **Goal:** Transform the resources page from a dense data table into an intuitive, scannable interface with proper week/day ordering, logical grouping, reduced visual noise, and a clear information hierarchy. The page should feel spacious, organized, and easy to navigate even with hundreds of records.

---

- [x] **Task H1: Add client-side numeric sort for Week/Day columns (`components/tasks/TasksTable.js`)**
**File:** `components/tasks/TasksTable.js`
**Current problem:** Sorting relies entirely on Airtable's API, which treats `Week Number` and `Day Number` as strings. This produces lexicographic ordering (1, 10, 2, 3...) instead of numeric (1, 2, 3... 10). Users see jumbled week sequences like "1, 1, 4, 2, 1".
**Changes:**
  - [ ] After fetching data from the API, apply a secondary client-side sort when the active sort column is `week` or `day`. Parse values as integers (`parseInt(value, 10)`) before comparing.
  - [ ] Default sort on page load: primary sort by `Week Number` (ascending, numeric), secondary sort by `Day Number` (ascending, numeric). This ensures tasks appear in natural onboarding order: Week 1 Day 1, Week 1 Day 2, ..., Week 2 Day 1, etc.
  - [ ] Add a `sortNumerically` flag to the sort column config for `week` and `day` columns, so the sort handler knows to use `parseInt` comparison instead of string comparison.
  - [ ] Keep the Airtable API sort as the primary sort (for pagination consistency), but apply the client-side numeric re-sort on the returned page of results.

- [x] **Task H2: Add grouped view mode with collapsible week sections (`components/tasks/TasksTable.js`)**
**File:** `components/tasks/TasksTable.js`
**Current problem:** All tasks render as a flat list. Users cannot see task structure by week, making it hard to understand the onboarding timeline.
**Changes:**
  - [ ] Add a view toggle in the filter toolbar: "List" (current flat table) and "Grouped" (grouped by week). Use a `LayoutList` / `LayoutGrid` icon toggle pair. Default to "Grouped" view.
  - [ ] In grouped view, render tasks organized under collapsible week headers:
    ```
    ▼ Week 1 (12 tasks)
      Day 1: [task] [task] [task]
      Day 2: [task] [task]
    ▼ Week 2 (8 tasks)
      Day 1: [task] [task]
      ...
    ```
  - [ ] Week header: `flex items-center gap-3 py-3 px-4 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors`. Title in `text-body-sm font-semibold`. Task count in `Badge variant="secondary"`. ChevronDown icon that rotates when collapsed.
  - [ ] Day sub-header: `text-caption text-muted-foreground font-medium uppercase tracking-wide pl-6 py-2 border-b border-border/20`. Format as "Day 1", "Day 2", etc.
  - [ ] Collapse state per week stored in local component state. All weeks expanded by default.
  - [ ] Add "Expand All" / "Collapse All" ghost button next to the view toggle.
  - [ ] Grouped view groups the current page's results — it works within the existing pagination, not across pages.
  - [ ] Use `AnimatePresence` with `slideDown`/`slideUp` for smooth collapse transitions.

- [x] **Task H3: Reduce visible columns and add expandable row detail (`components/tasks/TasksTable.js`)**
**File:** `components/tasks/TasksTable.js`
**Current problem:** 10 columns visible simultaneously (checkbox, title, description, week, day, folder, job, attachments, resource, edit) requiring ~1368px minimum width. Causes horizontal scrolling and cognitive overload.
**Changes:**
  - [ ] Default visible columns (6): Checkbox, Title, Week, Day, Folder, Actions (combined edit + resource + attachments into a single actions cell).
  - [ ] Hide Description, Job columns by default — these are available in the expanded row detail.
  - [ ] Actions cell: merge Edit, Resource Link, and Attachments into a compact `flex items-center gap-1` cell with `ghost size="icon-sm"` buttons. Show attachment count as a small badge on the Paperclip icon when > 0.
  - [ ] Expandable row: clicking a row (not the checkbox) expands an inline detail panel below the row. Detail panel shows: full description, job title, type, resource link (as clickable URL), attachment list, created date. Style: `bg-muted/10 border-l-2 border-primary/20 px-6 py-4 animate-fade-in-up`.
  - [ ] Use `AnimatePresence` for expand/collapse transitions.
  - [ ] Column widths: Checkbox (40px), Title (flex-1, min 200px), Week (72px), Day (72px), Folder (140px), Actions (100px). Total: fits comfortably in ~800px.
  - [ ] On mobile (<768px): hide Week and Day columns (they're visible in expanded detail). Show only Checkbox, Title, Folder, Actions.

- [x] **Task H4: Redesign ResourcePage container and header (`components/tasks/ResourcePage.js`)**
**File:** `components/tasks/ResourcePage.js` (40 lines)
**Current state:** Basic header with h1 + description + Create Resource button. Minimal wrapper.
**Changes:**
  - [ ] Page header: follow the layout framework from the design direction. `flex items-center justify-between mb-6 animate-fade-in-up`. Left: title in `text-headline` "Resources" + description `text-body-sm text-muted-foreground` "Manage task templates and onboarding resources". Right: "Create Resource" button as `default` variant with `Plus` icon.
  - [ ] Add a summary stats row below header (before the table): 3 compact stat chips showing total resources, total folders, and total weeks. Each chip: `inline-flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-1.5 text-body-sm`. Count in `font-semibold`. These values come from the existing table data (count of current page results, distinct folders, distinct weeks).
  - [ ] Wrap content in `animate-fade-in-up` with stagger.

- [x] **Task H5: Improve filter toolbar layout and active filter UX (`components/tasks/TasksTable.js` — TableFilters)**
**File:** `components/tasks/TasksTable.js` (TableFilters function, lines ~26-200)
**Current problem:** All 5 filters (search, week, day, job, folder) are displayed in one horizontal row. On smaller screens this wraps awkwardly. Active filter pills take additional space below.
**Changes:**
  - [ ] Reorganize filters into a cleaner toolbar: Search input on the left (`w-72 h-10 rounded-lg pl-9 border-border/40` with Search icon). Filter group on the right: Week and Day as compact `Select` components (`h-9 rounded-lg min-w-[90px]`), Job and Folder as `Select` components (`h-9 rounded-lg min-w-[120px]`). View toggle (List/Grouped) at far right.
  - [ ] Active filter pills: render inline after the filter controls, not on a separate row. Each pill: `inline-flex items-center gap-1.5 bg-primary/5 border border-primary/15 rounded-full px-2.5 py-1 text-caption text-primary font-medium`. X button to remove. If more than 3 filters active, show "+N more" with a popover listing all active filters.
  - [ ] "Clear all filters" ghost button appears when any filter is active.
  - [ ] On mobile (<768px): collapse filters behind a "Filters" button that opens a slide-down panel. Show search always visible, other filters in the panel. Active filter count shown as badge on the Filters button.
  - [ ] Remove the separate page-size selector from the filter row. Move it into the pagination footer.
  - [ ] Refresh button: `ghost size="icon"` with `RotateCw` icon, placed after the view toggle.

- [x] **Task H6: Redesign table chrome, row styling, and pagination (`components/tasks/TasksTable.js`)**
**File:** `components/tasks/TasksTable.js`
**Current problem:** Table uses default styling with all borders, dense rows, and basic pagination. The overall feel is data-heavy without breathing room.
**Changes:**
  - [ ] Wrap table in `Card variant="elevated"` with no CardHeader — table starts directly inside the card.
  - [ ] Table header: `bg-muted/20 sticky top-0 z-10`. Header text: `text-overline text-muted-foreground/70 uppercase tracking-wider font-medium`. Header height: `h-11`.
  - [ ] Remove outer table border. Use `border-b border-border/20` between rows only.
  - [ ] Row height: `h-14`. Row hover: `hover:bg-muted/20 transition-colors cursor-pointer` (since rows are now expandable).
  - [ ] Reduce animation stagger on rows — change from `index * 0.05` (50ms) to `index * 0.02` (20ms) to reduce perceived load time while keeping the effect.
  - [ ] Column resize handles: make subtler — `w-0.5 bg-transparent hover:bg-primary/30 cursor-col-resize` (visible only on hover).
  - [ ] Sort indicators: `ChevronUp`/`ChevronDown` icons (`h-3.5 w-3.5`) next to sorted column header, `text-primary` when active, `text-muted-foreground/30` when inactive.
  - [ ] Pagination footer: `flex items-center justify-between px-4 py-3 border-t border-border/20`. Left: `text-caption text-muted-foreground` showing "Showing X tasks". Center: page navigation buttons as `outline size="sm"`. Right: page size selector as compact `Select`.
  - [ ] Skeleton loading: replace Loader2 spinner rows with proper skeleton rows (6 rows matching the new reduced column layout — each skeleton row has: checkbox skeleton, title skeleton bar, week/day small skeleton, folder skeleton badge, actions skeleton dots).
  - [ ] Empty state: centered `AnimatedEmptyState` with `Package` icon (48x48 text-muted-foreground/40), "No resources found" in `text-body-sm`, "Try adjusting your filters or create a new resource" in `text-caption text-muted-foreground/60`, and a "Create Resource" CTA button.

- [x] **Task H7: Improve FolderBadge for table context (`components/tasks/FolderBadge.js`)**
**File:** `components/tasks/FolderBadge.js` (61 lines)
**Current state:** Animated badge with scale/rotate hover effects, colorful backgrounds. In a dense table, multiple animated badges create visual noise.
**Changes:**
  - [ ] Reduce animation intensity for table context: remove `rotate` from hover animation. Keep a subtle `scale: 1.02` on hover only.
  - [ ] Use `Badge variant="secondary"` as the base, with a small colored dot (4px circle) on the left indicating the folder color. This is more scannable than a fully colored badge.
  - [ ] Format: `inline-flex items-center gap-1.5 text-caption`. Dot + folder name in normal weight.
  - [ ] Truncate long folder names with `max-w-[120px] truncate` and show full name in a tooltip.

- [x] **Task H8: Add keyboard navigation and accessibility (`components/tasks/TasksTable.js`)**
**File:** `components/tasks/TasksTable.js`
**Changes:**
  - [ ] Add `Enter` key to expand/collapse row detail (when row is focused).
  - [ ] Add `Space` key to toggle row checkbox.
  - [ ] Add `tabIndex={0}` and `role="row"` to interactive table rows.
  - [ ] Add `aria-expanded` attribute to expandable rows.
  - [ ] Add `aria-sort` attributes to sortable column headers.
  - [ ] Ensure focus ring is visible on keyboard navigation: `focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none rounded-sm`.

---

**Phase H Implementation Order:**
1. **H1** (sorting fix) — foundational, fixes the core complaint
2. **H4** (ResourcePage container) — sets the page structure
3. **H5** (filter toolbar) — reorganizes controls
4. **H6** (table chrome) — visual overhaul of table shell
5. **H3** (column reduction) — simplifies data density
6. **H7** (FolderBadge) — reduces visual noise in table
7. **H2** (grouped view) — adds week grouping
8. **H8** (accessibility) — finishing touch

**Phase H Dependencies:**
- Phase A (sidebar/layout) should be completed first (provides layout context).
- H1 should be done before H2 (grouping depends on proper numeric sorting).
- H4, H5, H6 can run in parallel.
- H3 should be done after H6 (table chrome must be in place before restructuring columns).
- H7 can run independently.
- H8 should be done last (after all structural changes are settled).

**Phase H Files in Scope:**

| File | Task |
|------|------|
| `components/tasks/TasksTable.js` | H1, H2, H3, H5, H6, H8 |
| `components/tasks/ResourcePage.js` | H4 |
| `components/tasks/FolderBadge.js` | H7 |
| `components/tasks/SkeletonRow.js` | H6 |
| `components/tasks/table/AnimatedSearchBar.js` | H5 |
| `components/tasks/table/AnimatedFilterPills.js` | H5 |
| `components/tasks/table/AnimatedEmptyState.js` | H6 |
| `components/tasks/table/PageTransition.js` | H6 |

**Phase H Files NOT in Scope:**
- `src/app/api/admin/tasks/core-tasks/route.js` — No API changes. Sorting fix is client-side.
- `components/tasks/TaskEditSheet.js` — Edit sheet is separate; no changes needed.
- `components/tasks/CreateTaskDialog.js` — Creation flow is separate.
- `components/tasks/BulkCreateResourcesForm.js` — Bulk creation is separate.

---

## Files NOT in Scope

- `src/app/api/**` — All API routes
- `src/hooks/**` — All custom hooks
- `src/lib/**` — All library utilities
- `components/ui/**` — Base shadcn components (do not modify directly)
- `src/middleware.js` — Auth middleware
- `components/auth/**` — Auth components (already redesigned)
- `components/quiz/**` — Quiz components (already redesigned)
