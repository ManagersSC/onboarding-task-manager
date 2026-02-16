# Pages & Routes

## Layout Hierarchy
- Root layout: `src/app/layout.js`
- Admin layout: `src/app/admin/layout.js`
- Pages are thin wrappers that compose components from `components/`

## Rule
- Pages should contain minimal logic — delegate to components
- API routes are NOT part of the frontend redesign scope
