# Git Branch Naming Convention

## Overview

This document outlines the standardized naming convention for git branches in the Onboarding Task Manager project. All branches should follow a short-lived, merge-early approach with a consistent naming template.

## Naming Template

```
type/short-description
```

### Format Rules

- **Type prefix**: Always use one of the predefined types followed by a forward slash
- **Short description**: Use kebab-case (lowercase with hyphens) for the description
- **Length**: Keep descriptions concise but descriptive (typically 2-4 words)
- **Characters**: Use only lowercase letters, numbers, and hyphens

## Branch Types

### `feature/*`
**Purpose**: New functionality, pages, components, API routes, integrations, etc.

**Examples**:
- `feature/add-login-api`
- `feature/user-dashboard`
- `feature/email-notifications`
- `feature/file-upload`
- `feature/calendar-integration`

### `fix/*`
**Purpose**: Bug fixes including logic bugs, styling issues, broken automation

**Examples**:
- `fix/email-validation`
- `fix/button-styling`
- `fix/date-calculation`
- `fix/loading-state`
- `fix/table-sorting`

### `hotfix/*`
**Purpose**: Urgent production issues that need immediate patching on main

**Examples**:
- `hotfix/security-vulnerability`
- `hotfix/critical-data-loss`
- `hotfix/payment-processing`
- `hotfix/authentication-bypass`

### `chore/*`
**Purpose**: Maintenance, config changes, dependency bumps, cleanup that don't affect features directly

**Examples**:
- `chore/update-dependencies`
- `chore/cleanup-unused-code`
- `chore/update-docker-config`
- `chore/refactor-imports`
- `chore/update-linting-rules`

### `refactor/*`
**Purpose**: Restructuring code without changing functionality

**Examples**:
- `refactor/component-structure`
- `refactor/api-response-handling`
- `refactor/database-queries`
- `refactor/state-management`
- `refactor/error-handling`

### `docs/*`
**Purpose**: Documentation, READMEs, or developer onboarding guides

**Examples**:
- `docs/api-documentation`
- `docs/setup-guide`
- `docs/deployment-process`
- `docs/contributing-guidelines`
- `docs/architecture-overview`

## Workflow Guidelines

### Short-Lived Branches
- Create branches for specific, focused changes
- Keep branches small and manageable
- Aim to merge within 1-3 days of creation
- Avoid long-running feature branches

### Merge Strategy
- Merge early and often
- Use pull requests for code review
- Ensure all tests pass before merging
- Delete branches after successful merge

### Branch Creation
```bash
# Create and switch to new branch
git checkout -b feature/add-user-authentication

# Push branch to remote
git push -u origin feature/add-user-authentication
```

### Branch Cleanup
```bash
# Delete local branch after merge
git branch -d feature/add-user-authentication

# Delete remote branch
git push origin --delete feature/add-user-authentication
```

## Best Practices

### Do's
- ✅ Use descriptive but concise descriptions
- ✅ Follow the exact type prefixes
- ✅ Use kebab-case for descriptions
- ✅ Keep branches focused on single changes
- ✅ Merge frequently to avoid conflicts
- ✅ Delete branches after merging

### Don'ts
- ❌ Use spaces or special characters in branch names
- ❌ Create overly long branch names
- ❌ Mix different types of changes in one branch
- ❌ Keep branches open for extended periods
- ❌ Use generic descriptions like "update" or "changes"

## Examples by Change Type

### Adding New Features
```bash
feature/user-profile-page
feature/task-assignment-system
feature/email-notifications
feature/calendar-integration
```

### Fixing Bugs
```bash
fix/login-validation-error
fix/table-pagination-bug
fix/mobile-responsive-issues
fix/data-export-formatting
```

### Urgent Production Fixes
```bash
hotfix/security-patch
hotfix/critical-data-corruption
hotfix/payment-processing-failure
```

### Maintenance Tasks
```bash
chore/update-react-version
chore/cleanup-unused-dependencies
chore/update-eslint-config
chore/optimize-build-process
```

### Code Refactoring
```bash
refactor/component-architecture
refactor/database-schema
refactor/error-handling-system
refactor/state-management
```

### Documentation Updates
```bash
docs/api-reference
docs/development-setup
docs/deployment-guide
docs/contributing-guidelines
```

## Integration with CI/CD

This naming convention integrates with:
- Automated branch protection rules
- Pull request templates
- Release automation
- Code review assignments

## Migration from Current Branches

When migrating existing branches to this convention:
1. Create new branch with proper naming
2. Cherry-pick commits from old branch
3. Create pull request with new branch
4. Delete old branch after merge

## Questions or Updates

For questions about this convention or to suggest updates, please:
1. Create a `docs/` branch for documentation updates
2. Submit a pull request with proposed changes
3. Tag the development team for review

---

*Last updated: [Current Date]*
*Version: 1.0*
