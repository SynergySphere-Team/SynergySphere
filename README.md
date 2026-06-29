# SynergySphere

**Learn. Build. Thrive.**

SynergySphere is a comprehensive university capstone platform combining:

- **Learning Management System (LMS)** — Coding challenges, skill tracking
- **AI Coding Assistant** — Debug, explain, and improve code
- **Productivity & Wellness Platform** — Task management and wellness tracking
- **Community Project Marketplace** — NGO sustainability projects
- **Career Development** — Mock interviews and portfolio builder
- **Gamified Learning** — XP, levels, badges, and leaderboards

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, Prisma ORM, JWT Auth |
| Database | PostgreSQL (Supabase recommended) |
| AI | OpenAI GPT (with demo fallback) |
| Hosting | Vercel (frontend), Railway (backend), Supabase (DB) |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL) or a Supabase project

### 1. Clone and Install

```bash
cd SynergySphere
npm install
```

### 2. Start Database

**Option A: Local Docker**
```bash
docker compose up -d
```

**Option B: Supabase**
Create a project at [supabase.com](https://supabase.com) and copy the connection string.

### 3. Configure Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit `backend/.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/synergysphere?schema=public"
JWT_SECRET="your-secure-random-string"
```

Optionally add `OPENAI_API_KEY` for full AI features.

### 4. Setup Database

```bash
npm run db:push
npm run db:seed
```

### 5. Run Development Servers

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Student | student@synergysphere.com | student123 |
| Admin | admin@synergysphere.com | admin123456 |

## Project Structure

```
SynergySphere/
├── frontend/          # Next.js app
│   └── src/
│       ├── app/       # Pages (dashboard, coding, AI, etc.)
│       ├── components/# UI components and layout
│       ├── context/   # Auth context
│       └── lib/       # Utilities and API client
├── backend/           # Express API
│   ├── prisma/        # Database schema and seed
│   └── src/
│       ├── routes/    # API endpoints
│       ├── services/  # AI and gamification logic
│       └── middleware/# Auth, validation
├── supabase/          # Supabase migration reference
└── docker-compose.yml # Local PostgreSQL
```

## API Endpoints

| Module | Endpoint | Description |
|--------|----------|-------------|
| Auth | `POST /api/auth/register` | Register user |
| Auth | `POST /api/auth/login` | Login |
| Auth | `GET /api/auth/me` | Current user profile |
| Dashboard | `GET /api/dashboard/stats` | Dashboard analytics |
| Challenges | `GET /api/challenges` | List coding challenges |
| Challenges | `POST /api/challenges/:id/submit` | Submit solution |
| AI | `POST /api/ai/chat` | AI coding assistant |
| AI | `POST /api/ai/interview/start` | Start mock interview |
| AI | `POST /api/ai/lecture-to-life` | Convert lectures |
| Wellness | `GET/POST /api/wellness` | Wellness tracking |
| Tasks | `CRUD /api/tasks` | Task management |
| Projects | `GET/POST /api/projects` | Community projects |
| Portfolio | `CRUD /api/portfolio` | Portfolio items |
| Leaderboard | `GET /api/leaderboard` | Top users |
| Admin | `GET /api/admin/overview` | Platform analytics |

## Features by Phase

- [x] **Phase 1**: Authentication, Database, Dashboard
- [x] **Phase 2**: Coding Practice, AI Coding Assistant
- [x] **Phase 3**: LectureToLife Module
- [x] **Phase 4**: Task Management, Wellness Tracking
- [x] **Phase 5**: Community Module
- [x] **Phase 6**: Mock Interviews, Gamification, Analytics

## Security

- JWT authentication with bcrypt password hashing
- Rate limiting on API endpoints
- Helmet security headers
- Input validation with Zod
- Prisma ORM (SQL injection protection)
- Role-based access control (Student, Organization, Admin)

## Deployment

### Frontend (Vercel)
```bash
cd frontend && vercel
```

### Backend (Railway)
Set environment variables and deploy the `backend/` directory.

### Database (Supabase)
Use the Supabase connection string as `DATABASE_URL` and run `prisma db push`.

## License

University Capstone Project — 2026
