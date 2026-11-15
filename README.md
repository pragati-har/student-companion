# 📚 Student Companion

A student productivity web app to manage **subjects**, track **assignment deadlines**, receive in-app notifications, and record **daily attendance**.

Built for VESIT — covers all 10 academic experiments.

---

## Experiment Coverage

| # | Experiment | Feature |
|---|------------|---------|
| 1 | Tailwind CSS responsive UI | All 5 pages |
| 2 | React Hooks (useEffect, useContext, custom hooks) | `useSocket`, `useAuth`, form hooks |
| 3 | Redux / Context API | Redux Toolkit slices + AuthContext |
| 4 | REST API — MongoDB + Mongoose | 6 models, 18 API route endpoints |
| 5 | Secure production-ready REST APIs | JWT middleware, rate limiting, ownership checks, pagination |
| 6 | JWT authentication | HTTP-only cookies, protected routes |
| 7 | Postman API validation | Consistent `{success, data, message}` responses |
| 8 | Real-time WebSockets | Socket.IO server with authenticated student rooms |
| 9 | CI/CD — GitHub Actions + Vercel | `.github/workflows/ci.yml` |
| 10 | Docker | `Dockerfile` + `docker-compose.yml` |

---

## Tech Stack

- **Next.js 15** (App Router) + **React 18** + **JavaScript**
- **Tailwind CSS** — dark theme, responsive layout
- **MongoDB Atlas** + **Mongoose**
- **JWT** in HTTP-only cookies + **bcryptjs**
- **Redux Toolkit** — subjects, assignments, attendance slices
- **React Context API** — AuthContext
- **Socket.IO** — real-time updates (standalone server)
- **In-app notifications** — persisted deadline, reminder, overdue, and attendance alerts
- **node-cron** — scheduled notification job (every minute)
- **Resend** — server-side transactional email for assignment lists, reminders, and attendance summaries
- **Jest** — unit tests
- **GitHub Actions** — CI (lint + test + build)
- **Docker** — multi-stage build

---

## Quick Setup

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/student-companion.git
cd student-companion
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create your environment file
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in the values (see below). Resend credentials are server-only and are never exposed to the browser.

### 4. Start the development servers

Open **two terminals**:

**Terminal 1 — Next.js app**
```bash
npm run dev:next
```

**Terminal 2 — Socket.IO + cron server**
```bash
node server.js
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create `.env.local` in the project root (never commit this file):

```env
# MongoDB Atlas — create a free cluster at https://cloud.mongodb.com
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/student-companion?retryWrites=true&w=majority

# JWT — use a long random string (e.g. openssl rand -hex 32)
JWT_SECRET=your-long-random-secret-here
JWT_EXPIRES_IN=7d

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# Resend API key and a sender address on a domain verified in Resend
RESEND_API_KEY=
EMAIL_FROM="Student Companion <notifications@your-verified-domain.com>"

NODE_ENV=development
```

The email address collected at registration remains the login identifier. Email recipients must be entered explicitly for each email action; the account address is not selected automatically.

---

## MongoDB Atlas Setup (Free)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and sign up / log in.
2. Create a new **free** cluster (M0).
3. Under **Database Access** → add a user with password.
4. Under **Network Access** → add `0.0.0.0/0` (allow from anywhere) for development.
5. Click **Connect** → **Drivers** → copy the connection string.
6. Replace `<username>` and `<password>` in the string and paste it as `MONGODB_URI`.

---

## Email setup

1. Create a Resend account and an API key in the Resend dashboard.
2. Verify a domain you control in Resend. The sender address in `EMAIL_FROM` must use that verified domain (or another sender identity Resend explicitly allows).
3. Configure `RESEND_API_KEY` and `EMAIL_FROM` as server environment variables in `.env.local` for local development and in the hosting provider’s dashboard for deployment. Do not prefix either variable with `NEXT_PUBLIC_` or commit real values.
4. Restart/redeploy the Next.js application after changing environment variables.

The application returns a configuration error until both variables are valid. A successful response means Resend accepted the submission; it does not guarantee delivery to the recipient.

“Send a list” emails the assignments currently shown. “Remind” on an assignment emails a reminder. “Share attendance” emails the current attendance summary. Each action requires the sender to enter the recipient address explicitly. Reminder resubmissions for the same assignment, deadline, and recipient are deduplicated. Email sends are limited to 10 per authenticated user every 15 minutes using a MongoDB atomic counter shared across app instances.

---

## Deploying to Vercel + Render

### Next.js app → Vercel
1. Push your code to GitHub (without `.env.local`).
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo.
3. Add `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SOCKET_URL`, `RESEND_API_KEY`, and `EMAIL_FROM` in the Vercel dashboard. Keep the Resend variables server-side; do not use `NEXT_PUBLIC_` prefixes.
4. Set `NEXT_PUBLIC_SOCKET_URL` to your Render service URL (see below).
5. Deploy.

### Socket.IO + cron server → Render (free)
1. Go to [render.com](https://render.com) → New **Web Service** → Connect your repo.
2. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
3. Add environment variables: `MONGODB_URI`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`. Resend variables are only required on the Next.js application service.
4. Deploy — Render gives you a URL like `https://your-app.onrender.com`.
5. Set that URL as `NEXT_PUBLIC_SOCKET_URL` in Vercel.

---

## Running Tests

```bash
npm test
```

Tests cover:
- JWT sign/verify/cookie helpers
- Attendance percentage calculation (all edge cases)
- Assignment overdue/upcoming classification and reminder eligibility
- Resend payload formatting, provider failures, missing configuration, and idempotent sends
- Protected email routes, ownership checks, and recipient validation
- Assignment-list and attendance-summary formatting
- Error-message extraction without rendering error objects or stack traces

---

## Linting & Build

```bash
npm run lint     # ESLint
npm run build    # Production Next.js build
```

---

## Docker

```bash
# Build and start both services
docker-compose up --build

# Next.js app: http://localhost:3000
# Socket.IO server: http://localhost:4000
```

---

## API Overview (Postman-friendly)

All responses follow: `{ success: boolean, message: string, data: any, pagination?: object }`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new student |
| POST | `/api/auth/login` | No | Login (sets JWT cookie) |
| POST | `/api/auth/logout` | No | Clear JWT cookie |
| GET | `/api/auth/me` | Yes | Get current user |
| GET | `/api/subjects` | Yes | List subjects (paginated) |
| POST | `/api/subjects` | Yes | Create subject |
| PUT | `/api/subjects/:id` | Yes | Update subject |
| DELETE | `/api/subjects/:id` | Yes | Delete subject (cascades) |
| GET | `/api/assignments` | Yes | List with filter & pagination |
| POST | `/api/assignments` | Yes | Create assignment |
| PUT | `/api/assignments/:id` | Yes | Update assignment |
| DELETE | `/api/assignments/:id` | Yes | Delete assignment |
| PATCH | `/api/assignments/:id/complete` | Yes | Mark complete |
| PATCH | `/api/assignments/:id/remind` | Yes | Toggle reminder |
| POST | `/api/assignments/share` | Yes | Email selected, owned assignments |
| POST | `/api/assignments/:id/remind-email` | Yes | Email an explicit-recipient reminder |
| GET | `/api/notifications` | Yes | List in-app notifications |
| PATCH | `/api/notifications/:id` | Yes | Mark notification as read |
| DELETE | `/api/notifications/:id` | Yes | Dismiss notification |
| GET | `/api/attendance` | Yes | List records (paginated) |
| POST | `/api/attendance` | Yes | Save / correct attendance |
| GET | `/api/attendance/summary` | Yes | Per-subject stats + overall % |
| POST | `/api/attendance/share` | Yes | Email attendance summary |

---

## Project Structure

```
├── app/
│   ├── page.js               # / — Login / Register
│   ├── dashboard/page.js     # Dashboard
│   ├── subjects/page.js      # Subject management
│   ├── assignments/page.js   # Assignment deadlines
│   ├── attendance/page.js    # Attendance tracking
│   └── api/                  # REST API routes
├── components/               # Shared UI components
├── context/AuthContext.js    # Authentication context
├── store/                    # Redux Toolkit slices
├── hooks/useSocket.js        # Socket.IO hook
├── lib/                      # DB, auth, sharing, and rate-limit helpers
├── models/                   # Mongoose models, including notifications
├── server.js                 # Socket.IO + cron server
├── __tests__/                # Jest tests
├── .github/workflows/ci.yml  # GitHub Actions CI
├── Dockerfile                # Multi-stage Docker build
└── docker-compose.yml        # Web + socket services
```
