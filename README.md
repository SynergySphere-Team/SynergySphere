# SynergySphere

Learn. Build. Thrive.

SynergySphere is a university capstone platform combining:

- Learning management workflows for coding challenges and skill tracking
- AI study and coding assistance
- Productivity and wellness tracking
- Community sustainability project matching
- Mock interviews, portfolio tooling, XP, levels, badges, and leaderboards

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, lightweight PostgreSQL access via pg, JWT auth via http-only cookie |
| Database | PostgreSQL locally, Supabase-compatible PostgreSQL in production |
| AI | OpenAI-compatible chat endpoint with demo fallback |
| Mobile | Android WebView wrapper for deployed HTTPS frontend |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker for local PostgreSQL, or a Supabase PostgreSQL project

### 1. Install

~~~bash
npm install
~~~

### 2. Start Local Database

~~~bash
docker compose up -d
~~~

### 3. Configure Environment

~~~bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
~~~

Edit backend/.env and set a strong unique JWT_SECRET:

~~~env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/synergysphere?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=4000
FRONTEND_URL="http://localhost:3000"
~~~

Optionally add OPENAI_API_KEY and OPENAI_MODEL for full AI behavior.

### 4. Setup Database

~~~bash
npm run db:migrate
npm run db:seed
~~~

### 5. Run Development Servers

~~~bash
npm run dev
~~~

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Student | student@synergysphere.com | student123 |
| Admin | admin@synergysphere.com | admin123456 |

Admin users are created by the seed script only. Public registration allows Student and Organization accounts.

## Project Structure

~~~text
SynergySphere/
  frontend/          Next.js app
  backend/           Express API, SQL data access, and seed/migration scripts
  supabase/          SQL migration for Supabase/PostgreSQL setup
  android/           Android WebView shell for deployed frontend
  docker-compose.yml Local PostgreSQL
~~~

## Useful Commands

~~~bash
npm run dev              # frontend and backend
npm run dev:frontend     # frontend only
npm run dev:backend      # backend only
npm run build            # production build
npm run db:migrate       # apply SQL migrations
npm run db:seed          # seed demo data
~~~

## Security Notes

- JWT sessions are set as http-only cookies.
- JWT_SECRET must be set to a strong value in production.
- Public registration cannot create admin accounts.
- Challenge solutions are not returned by public challenge endpoints.
- Local SQLite database files are ignored and should not be committed.

## Deployment Notes

For production, deploy the frontend and backend to HTTPS hosts and configure:

- FRONTEND_URL on the backend to match the deployed frontend origin
- NEXT_PUBLIC_API_URL on the frontend to match the deployed backend /api URL
- DATABASE_URL for PostgreSQL or Supabase
- JWT_SECRET as a long random string
- OPENAI_API_KEY if full AI behavior is required

The Android wrapper should point to the deployed HTTPS frontend URL before release.

## License

University Capstone Project - 2026
