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
- [ ] Service categories:
  - Rodents
  - Bees
  - Termites
  - Roaches
  - Scorpions
- [ ] Service descriptions
- [ ] Pricing per service (initially static)

### Date & Time Scheduling
- [ ] Calendar UI (availability-based)
- [ ] Select date
- [ ] Select time slot
- [ ] Select service type
- [ ] Confirm address for service

### Booking Rules
- [ ] Block reserved time slots
- [ ] Prevent double-booking
- [ ] Show unavailable times to customers
- [ ] Backend validation for conflicts

---

## Phase 4 – Business Owner View (Admin)

- [ ] Owner dashboard
- [ ] View all scheduled appointments
- [ ] Filter by date / service type
- [ ] Appointment details view
- [ ] Status tracking (Scheduled / Completed / Cancelled)

---

## Phase 5 – Google Integration

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

## Phase 6 – Email Notifications

Using a dedicated business email account.

- [ ] Email verification (signup)
- [ ] Password reset flow
- [ ] Booking confirmation email (customer)
- [ ] Booking notification email (business owner)
- [ ] Cancellation email notifications

---

## Phase 7 – UX & Quality Improvements

- [ ] Loading states
- [ ] Error handling UI
- [ ] Form validation feedback
- [ ] Accessibility (ARIA, keyboard nav)
- [ ] Mobile UX polish

---

## Phase 8 – Production Hardening & Security

- [ ] CSRF protection strategy (cookie auth)
- [ ] Secure cookie flags
- [ ] Rate-limiting UI feedback
- [ ] Environment separation (dev / prod)
- [ ] Logging & monitoring review
- [ ] Deployment readiness checklist

---

## Phase 9 – Future Enhancements (Optional)

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
