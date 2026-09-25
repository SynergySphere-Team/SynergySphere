# SynergySphere mobile setup

## Architecture

The repository is a workspace with three applications:

```text
Next.js web (frontend/) ─┐
                         ├── Express API (backend/) ── pg ── PostgreSQL
Expo mobile (mobile/) ──┘
```

The mobile app never connects to PostgreSQL. It calls the existing Express API at `/api` over HTTP(S), which remains the only process with database credentials.

## Prerequisites

- Node.js 18 or later
- Docker Desktop for local PostgreSQL, or a Supabase/Neon PostgreSQL database
- Expo Go on an Android or iOS device for physical-device development

## Install dependencies

From the repository root:

```bash
npm install
npm install --workspace=mobile
```

The mobile workspace is created with Expo SDK 57. Its packages should be installed by Expo-compatible tooling; if Expo reports package-version mismatches, run:

```bash
cd mobile
npx expo install --fix
```

## Configure PostgreSQL and the API

For local PostgreSQL:

```bash
docker compose up -d
cp backend/.env.example backend/.env
npm run db:migrate
npm run db:seed
```

Set `DATABASE_URL`, a strong `JWT_SECRET`, `PORT`, and `FRONTEND_URL` in `backend/.env`. The local Docker default is:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/synergysphere
JWT_SECRET=replace-with-a-long-random-secret
PORT=4001
FRONTEND_URL=http://localhost:3000
```

The backend uses PostgreSQL directly through `pg` and the SQL migrations under `supabase/migrations/`; this repository does **not** currently contain Prisma or `schema.prisma`. No database migration is required for the mobile app.

For a free hosted development database, create a Supabase or Neon PostgreSQL project, copy its server-side connection string into `backend/.env` as `DATABASE_URL`, then run `npm run db:migrate` (and optionally `npm run db:seed`) from the repository root. Never place this URL in a mobile environment file.

## Configure the mobile application

```bash
cp mobile/.env.example mobile/.env
```

Set only the public API endpoint. On a physical device, use the computer’s LAN IP—not `localhost`:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:4001/api
```

Ensure the phone and computer are on the same network. Node’s Express listener accepts network connections by default; if a firewall is enabled, permit inbound connections to port 4001. For a deployed app, use an HTTPS API URL.

## Start development servers

For mobile development, use one command from the repository root. It starts the Express API and Expo together:

```bash
npm run dev:mobile
```

For the web app, use `npm run dev` in a separate terminal. Do not also start `npm run dev:backend` while `npm run dev:mobile` is running, as both commands use port 4001.

Open Expo Go and scan the QR code printed by Expo. If LAN discovery is unavailable, start Expo with a tunnel:

```bash
npm run start --workspace=mobile -- --tunnel
```

The API URL still has to be reachable from the device; a tunnel for Expo does not automatically expose the Express server.

## Authentication

Web authentication remains unchanged: the Express API sends a seven-day, http-only `synergysphere_token` cookie and Next.js forwards it through `/api`.

The Expo app sends `X-SynergySphere-Client: mobile` on registration and login. The same API endpoints then additionally return the signed seven-day JWT in the response body. The Expo client saves it in `expo-secure-store` and sends it as `Authorization: Bearer <token>` on authenticated requests. The backend accepts either the existing cookie or this bearer token, so no second user system exists. Mobile logout removes its secure local token; tokens expire after seven days.

## Environment-variable boundaries

Server-only variables in `backend/.env`:

- `DATABASE_URL`
- `JWT_SECRET`
- `OPENAI_API_KEY` / `GEMINI_API_KEY`
- Any private provider credentials

Web public configuration belongs in `frontend/.env.local` (`NEXT_PUBLIC_*` only when safe). The mobile app accepts only `EXPO_PUBLIC_API_URL`. `.env` files are ignored by Git; use the provided `*.example` files as templates.

## Troubleshooting

- **Expo Go shows "HTTP response error 500: UnexpectedServerError":**
  1. Always start Expo from within the mobile workspace: run `npm run dev:mobile` from the repository root, or `cd mobile && npx expo start -c`. Do not run `expo start` directly in the monorepo root.
  2. Ensure `mobile/app.json` does not contain an EAS `projectId` or `owner` linked to another developer's Expo account that your local Expo CLI is not authorized to sign certificates for. Run `eas project:init` if you want to link your own EAS project.
- **Cannot reach API:** first confirm that `npm run dev:mobile` shows `SynergySphere API running on http://localhost:4001`. Then verify `EXPO_PUBLIC_API_URL` includes `/api`, uses the computer’s current LAN IP on real phones, and restart Expo with `npm run start:clean --workspace=mobile` after changing the env file. The app no longer bundles a fixed LAN address.
- **401 after a prior login:** the token may be expired or invalid; sign in again. The app clears expired tokens during session restoration.
- **Database unavailable:** start Docker or verify `DATABASE_URL`, then run migrations.
- **CORS in a browser build:** configure `FRONTEND_URL` or `FRONTEND_URLS` with the actual browser origin. Expo Go native requests do not send a browser origin.
- **Expo dependency checks fail:** run `npx expo install --fix` inside `mobile` after dependencies are installed.

## Production considerations

Deploy the Next.js frontend and Express backend independently over HTTPS. Host PostgreSQL with Supabase or Neon, set server secrets in the backend host’s secret manager, configure `FRONTEND_URL` for the deployed web origin, and set the mobile build’s `EXPO_PUBLIC_API_URL` to the HTTPS API endpoint. Rotate `JWT_SECRET` carefully, as doing so invalidates existing sessions.
