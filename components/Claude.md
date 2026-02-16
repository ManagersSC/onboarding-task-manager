# Components Guidelines

## Design System
- All UI primitives live in `components/ui/` (shadcn/ui + Radix)
- Do NOT modify `components/ui/` base components directly — extend or wrap them
- New components should use Tailwind CSS utility classes only (no inline styles, no CSS modules)
- Follow existing pattern: components are .js/.jsx files using default exports

## Design Tokens
- [Add your color palette, spacing scale, typography here after defining them]
- [Add your brand-specific design tokens]

## Component Patterns
- Use `cn()` utility from `lib/utils` for conditional class merging
- Loading states: use skeleton components from `components/dashboard/skeletons/`
- Modals/sheets: use Radix Dialog/Sheet primitives from `components/ui/`
