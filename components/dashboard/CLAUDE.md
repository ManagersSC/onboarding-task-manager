# Dashboard Components

## Structure
- Dashboard is composed of widget-like sections (QuickMetrics, ActivityFeed, etc.)
- Each section has a corresponding skeleton loader in `skeletons/`
- Data fetching happens via custom hooks in `src/hooks/dashboard/`

## When Redesigning
- Always update the skeleton loader to match the new component layout
- Preserve the SWR hook interface — don't change data fetching patterns during UI redesign
