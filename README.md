# Sharkey's Pest Control — SPC Platform

A full-stack SaaS CRM and booking platform for **Sharkey's Pest Control** (Bay Area, CA).
Built for real-world production: customer booking, technician dispatch, admin CRM, owner analytics, real-time messaging, and email notifications — all in one platform.

**Status: Live in production** — hosted on Railway (backend + PostgreSQL) and Vercel (frontend).

---

## Tech Stack

### Frontend
| Package | Purpose |
|---|---|
| **Next.js 16** (App Router) | Framework — SSR, routing, metadata, security headers |
| **React 19** | UI runtime |
| **TypeScript 5** | Type safety across all frontend code |
| **Tailwind CSS v4** | Utility-first styling |
| **Framer Motion 12** | Animations — page transitions, modals, scroll reveals, spring physics |
| **Recharts** | Analytics charts — revenue, bookings, traffic, technician performance |
| **Lucide React** | Icon system (primary) |
| **Font Awesome** | Icon system (secondary / brand icons) |
| **next-themes** | Dark / light mode with system preference |
| **use-places-autocomplete** | Google Places API address autocomplete |
| **react-use-measure** | DOM measurement for animations |

### Backend
| Package | Purpose |
|---|---|
| **Express 5** | HTTP server and routing |
| **Node.js** (CommonJS) | Runtime |
| **PostgreSQL** (`pg`) | Database — raw parameterized queries, no ORM |
| **Argon2** | Password hashing |
| **Resend** | Transactional email (verification, invites, booking lifecycle) |
| **Zod 4** | Input validation — body, query, params |
| **Pino + pino-http** | Structured JSON logging with request correlation IDs |
| **Helmet** | HTTP security headers |
| **express-rate-limit** | Route-level rate limiting |
| **cors** | Origin whitelist for cross-origin cookie auth |
| **cookie-parser** | Session and CSRF cookie handling |
| **dotenv** | Environment variable loading |
| **nodemon** | Dev server with hot reload |

### Testing & Dev Tools
| Package | Purpose |
|---|---|
| **Jest 30** | Backend unit and integration tests |
| **Supertest** | HTTP integration testing |
| **cross-env** | Cross-platform env variable setting |
| **ESLint 9** | Frontend linting |

### External Services
| Service | Purpose |
|---|---|
| **Google Places API** | Address autocomplete (US-restricted) |
| **Resend** | Email delivery |
| **PostgreSQL** | Production database |

---

## Architecture

```
sharkeys-pest-platform/
├── frontend/          # Next.js 16 App Router (TypeScript, React 19, Tailwind 4)
└── backend/auth/      # Express 5 REST API (Node.js, CommonJS, PostgreSQL)
```

No shared package between frontend and backend — types are duplicated by convention.

### Backend Request Lifecycle
1. **CORS** — whitelist from `FRONTEND_ORIGIN` / `LOCAL_ORIGIN` env vars
2. **`suspiciousInputLogger`** — SQL injection detection, SHA256 fingerprinting of sensitive fields, IP throttling
3. **`requireAuth`** — validates `sid` session cookie, loads `req.auth` + `req.user`
4. **`requireRole(...roles)`** — RBAC assertion; returns 403 on failure
5. **Route handler** — raw `pg` pool queries with `$1/$2` placeholders
6. **`errorHandler`** — global handler; stack traces gated to non-production

### Auth Model
- Session cookie (`sid`, HttpOnly, SameSite=lax, Secure in production)
- 24-hour sliding expiration — extended on each authenticated request
- CSRF double-submit cookie pattern (`csrf_token`)
- RBAC via `user_roles` table — users can hold multiple roles
- Session storage: PostgreSQL `sessions` table (survives restarts)

---

## Roles

| Role | Access |
|---|---|
| **Customer** | Book services, view own bookings, messaging |
| **Technician / Worker** | Assigned jobs, mark complete, set final price, messaging |
| **Admin** | Full booking management, customer/lead CRM, tech scheduling |
| **Super Admin (Owner)** | Everything above + analytics dashboard, employee management, system logs |

---

## Dev Commands

### Frontend (`frontend/`)
```bash
npm run dev      # Next.js dev server (port 3000, Turbopack disabled)
npm run build    # Production build
npm run lint     # ESLint
```

### Backend (`backend/auth/`)
```bash
npm run dev                  # Express + nodemon (port 4000)
npm run start                # Production start
npm run test                 # Jest (uses PGTESTDATABASE)
npm run test:watch           # Watch mode

# Single test file
npx jest __tests__/auth.local.test.js --runInBand

# Superuser utilities (run locally with DB access)
node src/bootstrap/bootstrap-superuser.js      # Re-send superuser invite email
node src/bootstrap/manual-setup-superuser.js   # Directly activate superuser (no email required)
```

---

## Environment Variables

### Backend (`backend/auth/.env`)
```
NODE_ENV=production

# Database — prefer DATABASE_URL (Railway injects this automatically for linked Postgres services)
DATABASE_URL=           # preferred; falls back to individual PG* vars if not set
PGHOST=
PGPORT=5432
PGUSER=
PGPASSWORD=
PGDATABASE=
PGTESTDATABASE=         # for NODE_ENV=test

# CORS
FRONTEND_ORIGIN=        # https://yourdomain.com
LOCAL_ORIGIN=           # http://localhost:3000 (dev only)

# Session
SESSION_COOKIE_NAME=sid
SESSION_TTL_HOURS=24

# Email (Resend)
EMAIL_ENABLED=true
RESEND_API_KEY=
APP_BASE_URL=           # https://yourdomain.com
EMAIL_FROM_BOOKINGS=    # noreply@yourdomain.com
EMAIL_TO_OFFICE=        # office@yourdomain.com

# Path overrides (optional)
EMAIL_VERIFY_PATH=/verify-email
PASSWORD_RESET_PATH=/reset-password
NEW_ACCOUNT_SETUP_PATH=/new-account-setup
EMPLOYEE_SETUP_PATH=/employee-setup

# Bootstrap
BOOTSTRAP_SUPERUSER_EMAIL=
BOOTSTRAP_SUPERUSER_FIRST_NAME=
BOOTSTRAP_SUPERUSER_LAST_NAME=
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_AUTH_API_BASE=       # https://api.yourdomain.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_WS_URL=              # wss://api.yourdomain.com (optional)
```

---

## Phase 0 — Project Setup ✅

- [x] Next.js App Router project created
- [x] Tailwind CSS v4 configured
- [x] Font Awesome + Lucide React installed
- [x] Environment variable setup
- [x] Base layout — navbar, footer, navigation
- [x] Responsive navbar with mobile hamburger menu
- [x] Dark / light mode toggle (next-themes, system preference)
- [x] Placeholder routes created
- [x] Backend auth module integrated

---

## Phase 1 — Public Website ✅

### Landing Page (`/`)
- [x] Hero section with animated headline and CTA
- [x] Services overview section
- [x] About / company messaging
- [x] Pest coverage section (rodents, bees, termites, roaches, scorpions, wildlife)
- [x] Service area coverage section
- [x] Contact information
- [x] Scroll reveal entrance animations (IntersectionObserver, `prefers-reduced-motion` aware)
- [x] Infinite logo/badge slider animation
- [x] Mobile-first responsive layout
- [x] Per-page SEO metadata (`title`, `description`, `openGraph`)

### Blog (`/blog`, `/blog/[slug]`)
- [x] Blog listing page with post cards — date, read time, category badge
- [x] Staggered scroll reveal entrance on cards
- [x] 3 published posts:
  - Common Pests in Benicia, CA
  - How to Prevent Ants in the Bay Area
  - What Attracts Rats to Homes
- [x] Article + BreadcrumbList JSON-LD schema on each post
- [x] Scroll reveal section animations per post
- [x] Back-to-blog navigation on every post
- [x] Published date + read time in post headers

### Service Area (`/service-area`)
- [x] City coverage grid (Bay Area)
- [x] LocalBusiness JSON-LD schema
- [x] Scroll reveal animations

### Service Landing Pages
- [x] `/residential-pest-control-bay-area`
- [x] `/pest-control-bay-area`
- [x] `/rodent-control-bay-area`
- [x] `/wildlife-control-bay-area`

---

## Phase 2 — Authentication ✅

- [x] Signup — name, email, phone, address, account type (residential / business)
- [x] Login
- [x] Logout
- [x] Email verification flow (`/verify-email`)
- [x] Password reset flow (`/reset-password`)
- [x] Session persistence (`/auth/me`)
- [x] Protected routes with role-based redirect
- [x] New account setup flow for public booking invites (`/new-account-setup`)
- [x] Employee setup flow (`/employee-setup`) — invite token + password creation
- [x] Cookie-based auth (HttpOnly, SameSite=lax, Secure in production)
- [x] CSRF double-submit protection

---

## Phase 3 — Booking System ✅

### Public Booking (`/sharkys-pest-control-booking`)
- [x] No-auth booking flow — creates a lead record
- [x] Service selection with pricing
- [x] Google Places address autocomplete (US-restricted)
- [x] Calendar with availability blocking
- [x] Time slot selection (starts at 8am, all 24 hours covered)
- [x] Notes field
- [x] Lead invite email sent on completion (account setup link, 7-day expiry)
- [x] Duplicate email detection — re-uses existing lead, re-sends invite

### Customer Booking (`/book`)
- [x] Same booking flow for authenticated customers
- [x] Address prefill from account profile
- [x] Override address per booking
- [x] Booking confirmation

### Booking Rules
- [x] Conflict detection — prevent double-booking
- [x] Block reserved time slots
- [x] Backend validation for all conflicts
- [x] Customer-side cancellation
- [x] My bookings — upcoming and history tabs

---

## Phase 4 — Admin Portal ✅

### Job Management (`/account/admin`)
- [x] Pending bookings — accept, cancel, SLA timer, customer notes
- [x] Accepted bookings — assign technician dropdown
- [x] Completed bookings — pagination, search, date filter, technician + completion info
- [x] Tech bookings calendar view — per-technician schedule, reassign modal
- [x] Reassign modal with technician selection and confirmation
- [x] Dispatch page — gear dropdown with "Clear Orphaned Bookings" utility (reverts `assigned` bookings with no technician → `accepted`)

### Customer & Lead CRM (`/account/admin/customers`)
- [x] Unified directory — registered customers and leads in one paginated list
- [x] Full-text search (name, email, phone, address)
- [x] Per-customer detail — booking history grouped by in-progress / completed / cancelled
- [x] CRM tagging — Regular, Good, Bad, VIP, Big Spender
- [x] Bulk tag operations — select multiple, apply tag in one action
- [x] Tag notes — optional context per tag assignment
- [x] Undo toast — 5-second undo window on tag changes
- [x] Send account invite to leads — generates setup link, sends email
- [x] **Invite New Lead modal** — create lead record + send invite in one step (amber-accented, Google Places address)
- [x] Deep-link booking views from customer detail:
  - In-progress → redirects to live booking page
  - Completed → read-only view with final price panel
  - Cancelled → read-only view with cancellation notice
- [x] Polling — auto-refreshes list on configurable interval

### Lead Booking Tool (`/account/admin/leads`)
- [x] Admin-initiated booking on behalf of a lead or new customer
- [x] Search and select existing lead / customer
- [x] Create new lead inline
- [x] Full scheduling flow — service, date/time, address, notes
- [x] Google Places address autocomplete
- [x] Availability calendar with blocked slot display

### Employee Management (`/owner-dashboard/employees`)
- [x] Employee list — technicians, admins, super admins
- [x] Status badges — Active, Invited, Pending
- [x] Role badges with color coding
- [x] Invite Employee modal — name, email, phone, role picker, role description card
- [x] Per-employee profile page (`/owner-dashboard/employees/[id]`)
- [x] Employee termination — instantly revokes access (nulls password, kills all sessions, removes roles)
- [x] Auto-unassign open bookings on termination — reverts `assigned` → `accepted`, clears `booking_assignments`
- [x] Reinstate employee — clears `termed_at`, issues fresh invite email

### System Logs (`/owner-dashboard/system-logs`)
- [x] Request log viewer — method, path, status, duration, IP
- [x] Suspicious input log — flagged SQL injection attempts

---

## Phase 5 — Technician Portal ✅

- [x] Assigned jobs — grouped by date
- [x] Job detail — customer info, address, service, notes, messaging
- [x] Mark job as complete — set final price on completion (technician-only)
- [x] Server-side verification that technician is assigned before allowing action
- [x] Job history tab — completed and cancelled
- [x] Pagination (30 per page)
- [x] Status segregation — assigned / completed / cancelled

---

## Phase 6 — Account Page ✅

- [x] Personalized greeting
- [x] Joined date
- [x] Editable profile — first name, last name, phone, address, account type
- [x] Inline edit toggle — form only shown when editing
- [x] PATCH `/auth/me` with reactive UI update
- [x] Role-based dashboard deep links

---

## Phase 7 — Google Integration (Partial)

### Google Places ✅
- [x] Address autocomplete on all booking and lead/customer form pages
- [x] US address restriction
- [x] Suggestions with formatted main + secondary text
- [x] Controlled input with external reset sync
- [x] Plain input fallback while API loads

### Google Sign-In ⏳
- [ ] "Continue with Google" login
- [ ] Account linking (local ↔ Google)
- [ ] Secure OAuth callback handling

### Google Calendar ⏳
- [ ] Create calendar event on booking
- [ ] Block time slot automatically
- [ ] Calendar invites to customer and owner
- [ ] Handle cancellations and updates

---

## Phase 8 — Email Notifications ✅

Provider: **Resend**

- [x] Email verification (signup)
- [x] Password reset
- [x] Welcome email (new customers)
- [x] Booking created — customer confirmation
- [x] Booking created — office notification
- [x] Booking assigned — customer notification
- [x] Booking completed — customer notification
- [x] Employee invite — setup link with role context
- [x] Lead account invite — setup link from public booking or admin-created lead
- [x] `safeSendEmail` wrapper — graceful skip if `EMAIL_ENABLED=false`, no key exposure on error
- [x] All flows gated by `EMAIL_ENABLED` env flag

---

## Phase 8.5 — Real-Time Features ✅

### 3-Way Messaging
- [x] Every booking has a thread — customer, assigned technician, any admin
- [x] Sender spoofing prevented server-side
- [x] Cross-booking access prevented
- [x] Message delivery tracking (`delivered_at`)
- [x] Optimistic UI — message appears instantly, confirmed on server response

### WebSocket Notifications
- [x] Real-time notification bus (`realtimeBus.ts`)
- [x] Events: booking created, accepted, assigned, completed, cancelled
- [x] Events: new messages in booking threads
- [x] Deep-link URLs in notifications
- [x] Notification bell with unread count
- [x] Per-role notification routing

---

## Phase 9 — UX & Quality ✅

- [x] Global loading states — skeleton shimmer, spinner patterns
- [x] Error handling UI — inline error messages, toast notifications
- [x] Form validation feedback — inline, field-level
- [x] Undo toast with 5-second timer (CRM tag changes)
- [x] Framer Motion spring animations throughout — modals, cards, toasts
- [x] `ScrollReveal` component — IntersectionObserver, `prefers-reduced-motion` aware, staggered delays
- [x] `useReducedMotion` respected in all animated components
- [x] Mobile-first responsive layouts across all pages
- [x] `overflow-hidden` removed from all `SectionCard` containers — address autocomplete dropdown no longer clipped

---

## Phase 9.5 — Owner Analytics Dashboard ✅

All metrics at `/owner-dashboard`. Superadmin only.

| Widget | Data |
|---|---|
| **Revenue Overview** | Monthly revenue trend, total, avg per booking |
| **Bookings Overview** | Monthly created / completed / cancelled |
| **Service Revenue** | Revenue broken down by service type |
| **Revenue by Segment** | Residential vs business split |
| **Customers Overview** | New vs returning, monthly growth |
| **Repeat Customer Rate** | Retention metric over time |
| **Lead Conversion Age** | Time from lead creation to first booking (bucketed) |
| **Traffic Overview** | Page view trends (30-day) |
| **Survey Overview** | How customers found Sharkys — referral source breakdown |
| **Technician Performance** | Bookings completed per technician |
| **Services Overview** | Most booked services |

All charts built with **Recharts** — responsive, dark-themed, accessible.

---

## Phase 10 — Production Hardening ✅

- [x] CSRF double-submit cookie protection on all state-changing routes
- [x] Secure cookie flags (`HttpOnly`, `SameSite=lax`, `Secure` in production)
- [x] `NODE_ENV=production` gates secure cookies and hides stack traces
- [x] Rate limiting via `express-rate-limit`
- [x] `suspiciousInputLogger` — SQL injection detection, IP throttling (5 req/min → 5-min block)
- [x] Sensitive field fingerprinting in logs (SHA256, never logged in full)
- [x] CORS locked to explicit origin whitelist
- [x] Helmet HTTP security headers
- [x] Next.js security headers — `X-Frame-Options: DENY`, `X-Content-Type-Options`, HSTS 1yr, Permissions-Policy
- [x] Input validation via Zod on all routes
- [x] Parameterized queries only — no SQL string concatenation
- [x] Error handler — PostgreSQL error normalization, no internals exposed in production
- [x] Session store: PostgreSQL — survives restarts, no in-memory state
- [x] `.env` files never committed (confirmed via git history scan)
- [x] Superadmin bootstrap — auto-runs on server startup (idempotent, retries with backoff if DB not ready)
- [x] `manual-setup-superuser.js` — activates superuser directly via DB when email delivery is unavailable

---

## Phase 12 — Pre-Deployment ✅

| Area | Status |
|---|---|
| Production build | ✅ Passes — zero TypeScript errors |
| Secrets in git | ✅ Never committed |
| CORS | ✅ Locked to whitelist |
| Cookies | ✅ Secure, HttpOnly, SameSite |
| Session store | ✅ PostgreSQL-backed |
| Logging | ✅ Sensitive fields protected |
| Email | ✅ Gated + safe wrapper |
| Security headers | ✅ Helmet + Next.js config |
| Input validation | ✅ Zod on all routes |
| SQL injection | ✅ Parameterized queries only |

---

## Phase 13 — Future Enhancements

- [ ] Online payments (Stripe)
- [ ] Recurring service subscriptions
- [ ] SMS notifications (Twilio)
- [ ] Google Sign-In / OAuth
- [ ] Google Calendar integration
- [ ] Mobile app (React Native)
- [ ] Customer portal for invoices and service history
- [ ] Automated post-service follow-up emails
- [ ] Rename `middleware.ts` → `proxy.ts` (Next.js 16 deprecation)

---

## Database

PostgreSQL — no ORM. Direct parameterized queries via `pg` pool.

**Schema:** `backend/auth/sql/schema.sql` (manually applied)

**Extensions:** `CITEXT`, `pgcrypto`, `btree_gist`

**Key tables:** `users`, `leads`, `sessions`, `bookings`, `booking_prices`, `booking_messages`, `services`, `user_roles`, `lead_account_invites`, `employee_invites`, `notifications`, `customer_tags`, `availability_blocks`

**Test isolation:** `NODE_ENV=test` switches to `PGTESTDATABASE`

---

## Key Business Flows

| Flow | Description |
|---|---|
| **Public booking → lead** | Visitor books without an account → lead record created → invite email sent → lead sets up account |
| **Lead → customer** | Admin sends invite or lead follows email link → account setup → full customer account |
| **Booking lifecycle** | `pending → accepted → assigned → completed` — only the assigned technician can complete with final price |
| **3-way messaging** | Customer, technician, admin share one thread per booking — server enforces ownership |
| **Employee invite** | Admin invites via email → employee receives setup link → creates password → account active |
| **CRM tagging** | Admins tag customers (VIP, Bad, Big Spender, etc.) with undo support and audit trail |
| **Admin lead creation** | Admin creates lead directly with Invite Lead modal → lead record inserted → invite email sent immediately |

---

*Sharkys Pest Control · Bay Area, CA · Built for production*
