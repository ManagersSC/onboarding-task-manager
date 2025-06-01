# Setup & Installation

[← Back to Overview](./README.md)

## Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Airtable account and API key
- Google API credentials (for calendar integration)

## Installation Steps
1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd onboarding-task-manager
   ```
2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```
3. **Set up environment variables:**
   - Copy `.env.example` to `.env.local` and fill in required values (see [Configuration](./CONFIGURATION.md))
4. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
5. **Open the app:**
   - Visit [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)
- Push your code to GitHub
- Connect the repo to Vercel
- Set environment variables in Vercel dashboard
- Deploy

## Updating to a New Version
- Pull latest changes from main branch
- Run `npm install` if dependencies changed
- Redeploy on Vercel if needed

---

[Configuration →](./CONFIGURATION.md) 