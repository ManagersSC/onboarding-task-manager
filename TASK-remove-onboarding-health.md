# TASK: Remove OnboardingHealth Component

**Branch:** `fix/remove-onboarding-health-component`
**Description:** Remove the OnboardingHealth component and all related files. The component was never connected to real data and displayed hardcoded demo metrics, which is misleading in a production tool.

## Sub-tasks

- [x] Delete `components/dashboard/OnboardingHealth.js`
- [x] Delete `components/dashboard/skeletons/onboarding-health-skeleton.jsx`
- [x] Delete `src/hooks/dashboard/useOnboardingHealth.js`
- [x] Remove import and usage from `src/app/admin/dashboard/page.js`
- [x] Remove import and usage from `components/dashboard/skeletons/dashboard-skeleton.jsx`
