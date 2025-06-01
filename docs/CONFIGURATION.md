# Configuration

[← Back to Setup](./SETUP.md)

## Environment Variables

| Variable                | Required | Description                                      |
|-------------------------|----------|--------------------------------------------------|
| AIRTABLE_API_KEY        | Yes      | Airtable API key for database access              |
| AIRTABLE_BASE_ID        | Yes      | Airtable base ID for your workspace               |
| NODE_ENV                | Yes      | Set to 'development' or 'production'              |
| MAKE_WEBHOOK_URL        | No       | Webhook URL for integrations (optional)           |
| JWT_SECRET              | Yes      | Secret for JWT signing (auth)                     |
| SESSION_SECRET          | Yes      | Secret for session encryption                     |
| GOOGLE_CLIENT_ID        | Yes      | Google API client ID (calendar integration)       |
| GOOGLE_CLIENT_SECRET    | Yes      | Google API client secret                          |
| GOOGLE_REDIRECT_URI     | Yes      | Google OAuth redirect URI                         |
| GOOGLE_REFRESH_TOKEN    | Yes      | Google OAuth refresh token                        |

## How to Set
- Create a `.env.local` file in the project root
- Add each variable as `KEY=value`
- Never commit secrets to version control

## Config Files
- `next.config.mjs`: Next.js config
- `tailwind.config.mjs`: Tailwind CSS config
- `jest.config.js`: Jest testing config

## Customizing for Environments
- Use `.env.development.local`, `.env.production.local`, etc. for overrides
- Set variables in Vercel dashboard for production

---

[Workflows →](./WORKFLOWS.md) 