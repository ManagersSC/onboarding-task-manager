# Development Guide

[← Back to FAQ](./FAQ.md)

## Project Structure
See [README](./README.md) for a folder-by-folder breakdown.

## Coding Standards
- Use feature-based directory structure
- Write clear, documented components
- Use React hooks and functional components
- Follow ESLint and Prettier rules

## How to Contribute
- Fork the repo and create a feature branch
- Write clear commit messages
- Open a pull request for review

## Running Tests
- Use the pinned Jest config (`jest.config.cjs`).
- Run all tests:
  - `npm test`
- Run a specific test or pattern (example):
  - `npm test -- start-onboarding`
- If running Jest directly, always pass the config explicitly:
  - `npx jest --config jest.config.cjs`
  
Notes:
- Avoid using other config files (we removed `jest.config.js`) to prevent conflicts.
- Jest is used for unit/integration tests.

## Debugging & Troubleshooting
- Check logs in the console and Vercel dashboard
- Use audit logs for API troubleshooting
- For persistent issues, contact the lead developer

---

[API Reference →](./API_REFERENCE.md) 