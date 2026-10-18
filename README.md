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
| Mobile | Expo SDK 57, React Native, TypeScript, Expo Router, SecureStore |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker for local PostgreSQL, or a Supabase PostgreSQL project
- Expo Go on iOS/Android physical device, or Xcode iOS Simulator / Android Studio Emulator (for mobile development)

### 1. Install

~~~bash
npm install
npm install --workspace=mobile
~~~

### 2. Start Local Database

~~~bash
docker compose up -d
~~~

### 3. Configure Environment

~~~bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
cp mobile/.env.example mobile/.env
~~~

Edit `backend/.env` and set a strong unique JWT_SECRET:

~~~env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/synergysphere"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=4001
FRONTEND_URL="http://localhost:3000"
~~~

Configure `mobile/.env` with your computer's LAN IP address (or `localhost` if testing solely in an iOS simulator):

~~~env
EXPO_PUBLIC_API_URL=http://<YOUR-COMPUTER-LAN-IP>:4001/api
~~~

For full AI Workspace responses, add one provider to `backend/.env` (Gemini is tried first when both are configured):

~~~env
# Option 1: Google Gemini
GEMINI_API_KEY="your-gemini-key"
GEMINI_MODEL="gemini-3.5-flash-lite"

# Option 2: OpenAI
OPENAI_API_KEY="your-openai-key"
OPENAI_MODEL="gpt-4o-mini"
~~~

Without a provider key, the workspace still gives a code-aware offline walkthrough for pasted code, but it cannot provide model-generated explanations or follow-up reasoning.

### 4. Setup Database

~~~bash
npm run db:migrate
npm run db:seed
~~~

### 5. Run Development Servers

**Web & Backend:**
~~~bash
npm run dev
~~~
- Frontend: http://localhost:3000
- Backend API: http://localhost:4001
- Frontend proxy: http://localhost:3000/api forwards to the backend in development

**Mobile Application (Expo):**
~~~bash
# Start backend and Expo mobile client concurrently
npm run dev:mobile

# Or run mobile independently
npm run start --workspace=mobile
~~~
- Press `i` to launch in the **iOS Simulator** (macOS).
- Press `a` to launch in the **Android Emulator**.
- Scan the printed QR code using the **Expo Go** app on your physical iOS/Android device (ensure your phone and computer share the same Wi-Fi network).
- For in-depth network troubleshooting, see the [Mobile Setup Guide](MOBILE_SETUP.md).

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
  mobile/            Native Expo React Native application
  supabase/          SQL migration for Supabase/PostgreSQL setup
  android/           Legacy Android WebView shell (not the primary mobile app)
  docker-compose.yml Local PostgreSQL
~~~

## Useful Commands

~~~bash
npm run dev              # frontend and backend
npm run dev:frontend     # frontend only
npm run dev:backend      # backend only
npm run dev:mobile       # Expo React Native app
npm run build            # production build
npm run db:migrate       # apply SQL migrations
npm run db:seed          # seed demo data
~~~

## Documentation

- Use case diagram: [docs/use-case-diagram.md](docs/use-case-diagram.md)
- Mobile development and deployment: [MOBILE_SETUP.md](MOBILE_SETUP.md)

## Security Notes

- Web JWT sessions are set as http-only cookies. Expo receives a bearer token only
  for requests marked as the mobile client, and keeps it in SecureStore.
- JWT_SECRET must be set to a strong value in production.
- Public registration cannot create admin accounts.
- Challenge solutions are not returned by public challenge endpoints.
- Local SQLite database files are ignored and should not be committed.

## Deployment Notes

For production, deploy the frontend and backend to HTTPS hosts and configure:

- FRONTEND_URL on the backend to match the deployed frontend origin
- NEXT_PUBLIC_API_URL on the frontend to match the deployed backend /api URL
- BACKEND_URL on the frontend only when using the local /api proxy against a non-default backend host
- DATABASE_URL for PostgreSQL or Supabase
- JWT_SECRET as a long random string
- GEMINI_API_KEY or OPENAI_API_KEY if full AI behavior is required

The `android/` wrapper is legacy. Use the Expo project under `mobile/` for native releases.

## License

University Capstone Project - 2026
