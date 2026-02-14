## Frontend Product Roadmap – Pest Control Web App

This roadmap tracks the frontend development for the Pest Control Service web application.
The goal is to build a secure, customer-facing booking platform fully integrated with the
`auth_module` backend.

We will progress **step by step**, starting with basic frontend + backend integration,
then layering authentication, scheduling, payments, and production hardening.

---

## Tech Stack (Frontend)

- **Next.js** (App Router)
- **Tailwind CSS** (styling)
- **Font Awesome** (icons)
- **Fetch API** with `credentials: "include"` (cookie-based auth)
- **Google APIs**
  - Google OAuth (OIDC)
  - Google Calendar
- Email provider (business email account)

---

## Phase 0 – Project Setup

- [x] Create Next.js project
- [x] Configure Tailwind CSS
- [x] Install Font Awesome
- [x] Environment variable setup (`NEXT_PUBLIC_API_BASE`)
- [x] Base layout (header, footer, navigation)
- [x] Responsive navbar with mobile hamburger menu
- [x] Dark / Light mode toggle
- [x] Scroll-based full-page sections (desktop)
- [x] Disable snap scrolling on mobile
- [x] Placeholder routes created (/login, /signup, /book, /account, /employee)
- [x] Backend auth_module integrated as reusable module (repo-level)

---

## Phase 1 – Public Website (No Auth Required)

### Homepage (Public)
Accessible to everyone (no authentication).

- [x] Homepage landing section
- [x] Brand/logo placement
- [x] Services overview section (modularized)
- [x] About / company messaging
- [x] Contact information section
- [x] Placeholder routes created (/login, /signup, /book, /account, /employee)
- [x] Mobile-first responsive layout
- [x] Scroll reveal animations

---

## Phase 2 – Authentication (Customer Accounts)

### Primary Auth

- [x] Connect frontend to `auth_module` backend
- [x] Verify cookie-based auth works cross-origin

### Customer Account Creation
Used for scheduling and managing services.

- [x] Signup page
- [x] Login page
- [x] Logout
- [x] Session persistence (`/auth/me`)
- [x] Protected routes (customer dashboard)

### Customer Profile Data
Collected during signup or onboarding:

- [x] Full name
- [x] Email
- [x] Phone number
- [x] Address
- [x] Residential or Business account type

---

## Phase 3 – Scheduling & Booking System

### Service Selection
- [x] Service categories:
  - Rodents
  - Bees
  - Termites
  - Roaches
  - Scorpions
- [x] Service descriptions

### Date & Time Scheduling
- [x] Calendar UI (availability-based)
- [x] Select date
- [x] Select time slot
- [x] Select service type
- [x] Address prefill + override

### Booking Rules
- [x] Booking creation
- [x] Block reserved time slots
- [x] Prevent double-booking
- [x] Show unavailable times to customers
- [x] Backend validation for conflicts
- [x] Customer side Booking cancellation
- [x] My bookings (upcoming/history)

---

## Phase 4 – Business Owner View (Admin)

### Admin – Job Management
#### Pending Jobs
- [x] View pending bookings
- [x] Accept booking
- [x] Cancel booking
- [x] SLA timer display
- [x] Customer notes display

#### Accepted Jobs
- [x] Assign technician dropdown
- [x] Assign booking endpoint
- [x] Technician list from DB
- [x] Cancel booking

#### Completed Jobs
- [x] Pagination (default 30)
- [x] Incremental page size (+10 up to 100)
- [x] Prev / Next paging
- [x] Search (name, address, notes, email, service title)
- [x] Filter by: Year, Month, Day
- [x] Show: Technician who completed job, Completion timestamp
- [x] Event-based completion tracking
- [x] Stable ordering by completed_at DESC

### Admin – Customer Management
#### Completed Jobs
- [x] Customer list page
- [x] Role filtering (customers only)
- [x] Show: Name, Account Type, Phone, Email, Address
- [x] Aggregated Stats per Customer: Open bookings, Completed Bookings, Cancelled Bookings.

---

## Phase 5 – Technician Portal

- [x] Assigned jobs tab
- [x] Mark job as completed
- [x] Verification that technician is assigned
- [x] Job history tab
- [x] Pagination (30 per page)
- [x] Status segregation
- [x] Shared JobCard design consistency

---

## Phase 6 – Account Page (Production Ready)
### Customer / Technician / Admin Account Page
- [x] Personalized greeting ("Hi, FirstName")
- [x] Joined date (renamed from Created)
- [x] Editable fields: First Name, Last Name, Phone, Address, Account Type
- [x] Edit icon toggle (only show form when editing)
- [x] Type-safe forms (no any)
- [x] Update via PATCH /auth/me
- [x] Reactive UI update after save
- [x] Removed debug JSON for production

---

## Phase 7 – Google Integration

### Google Sign-In (OIDC)
- [ ] “Continue with Google” login
- [ ] Account linking (local ↔ Google)
- [ ] Secure OAuth callback handling
- [ ] Session creation after Google login

### Google Calendar Integration
- [ ] Connect business Google account
- [ ] Create calendar event on booking
- [ ] Block time slot automatically
- [ ] Send calendar invite to:
  - Customer
  - Business owner
- [ ] Handle cancellations / updates

---

## Phase 8 – Email Notifications

Using a dedicated business email account.

- [ ] Email verification (signup)
- [ ] Password reset flow
- [ ] Booking confirmation email (customer)
- [ ] Booking notification email (business owner)
- [ ] Cancellation email notifications

---

## Phase 9 – UX & Quality Improvements

- [ ] Loading states
- [ ] Error handling UI
- [ ] Form validation feedback
- [ ] Accessibility (ARIA, keyboard nav)
- [ ] Mobile UX polish

---

## Phase 10 – Production Hardening & Security

- [ ] CSRF protection strategy (cookie auth)
- [ ] Secure cookie flags
- [ ] Rate-limiting UI feedback
- [ ] Environment separation (dev / prod)
- [ ] Logging & monitoring review
- [ ] Deployment readiness checklist

---

## Phase 11 – Future Enhancements (Optional)

- [ ] Online payments
- [ ] Recurring services
- [ ] SMS notifications
- [ ] Admin role-based access
- [ ] Analytics dashboard

---

## Development Strategy

We will build this **incrementally**:

1. Frontend connects to backend auth
2. Public pages first
3. Customer auth and profile
4. Scheduling + blocking logic
5. Google integrations
6. Emails
7. Production hardening

Each phase builds on a stable foundation before moving forward.
