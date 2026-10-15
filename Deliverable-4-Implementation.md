# SynergySphere — Deliverable 4: Implementation

**Project:** SynergySphere — University Capstone Platform (Learn. Build. Thrive.)
**Platform:** Mobile application built with Expo SDK 57, React Native, TypeScript, and Expo Router, integrating with the existing Node.js/Express API and PostgreSQL database.

---

## 1. Screen Development

All major UI screens for the core functionality were implemented as fully functional React Native screens under `mobile/src/app/`, organized with Expo Router's file-based routing:

- **Authentication flow:** `login.tsx`, `register.tsx`, `forgot-password.tsx`, `onboarding.tsx` (`src/app/(auth)/`)
- **Main application (tabbed):** Home/dashboard, Coding challenges, Community, AI Assistant, Interviews, Tasks, Wellness, Leaderboard, Portfolio, Lecture-to-Life, Notifications, Profile, Settings, Admin, and more (`src/app/(tabs)/`)
- **Community stack (nested screens):** project creation wizard (`community/create.tsx`, 1,131 lines), project detail (`community/[id].tsx`, 1,592 lines), project management (`community/manage/[id].tsx`, 2,249 lines), and join requests (`community/requests/[id].tsx`)

Every screen contains the appropriate interface elements — buttons, text fields, pickers, images, menus, tab navigation, and modal dialogs. Screens are **functional, not mock-ups**: they call the live API and render real persisted data.

**Consistency and branding:** A single design system is enforced through `src/constants/theme.ts`, `src/context/themeTokens.ts`, and `ThemeContext`, with reusable primitives in `src/components/ui.tsx` (buttons, inputs, cards, notices) and shared components such as `Screen.tsx`, `BackButton.tsx`, `TaskCard.tsx`, and `MarkdownView.tsx`. All screens therefore share the same spacing, typography, colors, and padding rules, matching the wireframes and design plans from earlier deliverables.

## 2. Authentication

The app implements a complete authentication mechanism:

- **Sign-up** (`register.tsx`): first/last name, email, password, confirm password, role selection (Student or Organization). Public registration cannot create admin accounts (enforced server-side).
- **Login** (`login.tsx`): email + password against `/api/auth/login`.
- **Logout:** calls `/api/auth/logout`, then clears the local token and the linked GitHub token (`AuthContext.tsx`).
- **Password reset:** `forgot-password.tsx` on the auth stack; `change-password.tsx` under settings.
- **Session persistence and restore:** On launch, `AuthContext` reads the stored token, calls `/api/auth/me`, and restores the session; expired/invalid tokens (401) are cleared automatically.

**Security of credentials:** The mobile client sends `X-SynergySphere-Client: mobile` on registration/login, and the API returns a signed **7-day JWT** in the response body. The token is stored in **`expo-secure-store`** (hardware-backed encrypted key storage on device; `localStorage` fallback for web builds) and sent as `Authorization: Bearer <token>` on every authenticated request (`src/services/api.ts`). Database credentials never leave the backend — the app only talks to the Express API over HTTP(S). Protected screens redirect unauthenticated users to the login flow.

## 3. Backend Integration

- **Architecture:** Expo mobile app → Express REST API (`backend/src/routes/`: auth, tasks, projects, challenges, communityChat, curriculum, learning, wellness, portfolio, leaderboard, notifications, github, ai, settings, dashboard, admin) → PostgreSQL via `pg`.
- **Persistence:** All data is stored in PostgreSQL, matching the data design from Deliverable 1, applied through SQL migrations in `supabase/migrations/`. Local development uses Docker PostgreSQL; production uses Supabase-compatible PostgreSQL.
- **Full data transactions:** The API and client support complete CRUD over HTTP — `GET`, `POST`, `PATCH`, `PUT`, and `DELETE` are all exercised (examples in §4).
- **Reliability:** The API client (`src/services/api.ts`) discovers the correct base URL (env variable, Metro host inference, LAN/loopback/Android-emulator fallbacks), enforces a 10-second timeout with fallback candidates, and caches the last working base URL. Errors are normalized into a typed `ApiError` with HTTP status and server-supplied details.

## 4. Core Functionality (CRUD Operations)

The app implements well more than two complete functional modules, each with dedicated screens, logic, and backend connections, reflecting the requirements and use cases from Deliverable 3:

### Module A — Community Sustainability Projects
- **Create:** Multi-step project wizard (`community/create.tsx`) posts to `/api/projects`, including cover images, requirements, roles, and GitHub linking.
- **Read:** Project browsing in the Community tab; project detail screen fetches `/api/projects/:id` with team members, chat, and GitHub activity.
- **Update:** Owners update details, milestones, and join-request approvals in `community/manage/[id].tsx` via `PATCH /api/projects/:id`.
- **Delete:** Project deletion with confirmation dialog (`DELETE /api/projects/:id`).

### Module B — Productivity / Task Manager
- **Create:** `POST /api/tasks` with title, priority, and deadline; focus sessions via `POST /api/tasks/focus-session`.
- **Read:** Task list and productivity statistics (`GET /api/tasks`, `GET /api/tasks/productivity-stats`).
- **Update:** Status transitions and learned-notes via `PATCH /api/tasks/:id`.
- **Delete:** Task removal with confirmation (`DELETE /api/tasks/:id`).

### Additional implemented modules
SkillUp coding challenges with in-app code editor and test runner (`coding.tsx`, 2,946 lines), mock interview engine with voice input and scoring, AI study assistant, Lecture-to-Life, wellness tracking with quick check-ins, leaderboards and XP/badges, portfolio tooling, and admin functions (user management, announcements, project moderation).

## 5. Navigation and Routing

- **Expo Router (file-based):** Route groups `(auth)` and `(tabs)` cleanly separate public vs. authenticated navigation; the community feature uses a native stack (`community/[id]`, `community/manage/[id]`, `community/requests/[id]`).
- **Context-aware navigation:** Tab visibility, admin-only routes, and role-based entries (e.g., join-requests) are driven by the authenticated user's role; unauthenticated users are redirected to the login stack.
- **Back-stack safety:** A reusable `BackButton` component, a `useSwipeBack` gesture hook, and typed deep-link-safe routes ensure the back-stack behaves as expected with no crashes; modal flows (e.g., project wizard) complete or cancel predictably.

## 6. UI Feedback

- **Input validation:** Client-side validation with inline error notices — e.g., registration validates required names, email format, minimum 8-character passwords, and password confirmation (`register.tsx`).
- **Server error feedback:** The central API layer maps status codes (400, 401, 403, 404, 409, 422, 500, 503) to user-friendly messages and surfaces server-provided `details`.
- **Loading indicators:** Async screens show loading states while fetching; buttons disable during submission to prevent double-submits.
- **Notifications and dialogs:** `NotificationPopup` component, in-app notifications screen, community push-notification registration on login, and confirmation dialogs for destructive actions (e.g., project/task deletion).
- **Empty states:** Lists render helpful empty-state guidance when no data exists.

## 7. Code Quality

- **Logical separation:**
  - `src/app/` — screens only
  - `src/components/` — reusable UI (feature subfolders: coding, community, curriculum, interview, portfolio, wellness)
  - `src/services/` — API client, GitHub integration, code runner, interview engine, voice recording, notifications
  - `src/context/` — Auth, Theme, Accessibility providers
  - `src/hooks/`, `src/types/`, `src/constants/` — cross-cutting utilities
- **Consistent style:** Entirely TypeScript with strict typing, shared UI primitives from `components/ui.tsx`, and a single theme token system — no per-screen styling drift.
- **Documentation:** Non-obvious logic is commented in the code (e.g., URL-candidate inference, auth flow, timeout/fallback behavior in `api.ts`).
- **Maintainability:** One central `api` client encapsulates every network call (DRY), typed interfaces in `src/types/` mirror the API contracts, and environment boundaries keep secrets server-side (only `EXPO_PUBLIC_API_URL` exists on mobile).

---

## Rubric Mapping

| Rubric Criterion | Where Addressed |
| --- | --- |
| System design (15) | Sections 1, 2, 3, 5 — architecture, design system, auth design, routing |
| Prototype Development (20) | Sections 1, 4, 6 — functional screens, CRUD modules, user feedback |
| Prototype Integration (15) | Sections 3, 4, 5 — API/PostgreSQL integration, navigation, end-to-end flows |
