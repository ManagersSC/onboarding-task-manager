# Admin Components

## Layout
- Sidebar navigation: `admin-sidebar.js`
- Mobile: `bottom-navigation.js` + `mobile-page-header.js`
- All admin pages share the sidebar layout from `src/app/admin/layout.js`

## Key Patterns
- User management components are in `users/` subfolder
- Drawer pattern: `applicant-drawer.js` is the main detail view (complex, ~1000+ lines)
- Tables use shadcn Table component with custom wrappers
