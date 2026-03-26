# SPC Backend — Auth & API

Express 5 REST API for the Sharkey's Pest Control platform.

See the root [`README.md`](../../README.md) for full platform documentation.

---

## Stack

- Node.js + Express 5 (CommonJS)
- PostgreSQL via `pg` pool (no ORM)
- Argon2 (password hashing)
- Resend (transactional email)
- Pino (structured JSON logging)
- Zod (request validation)
- Jest + Supertest (integration tests)

---

## Dev Commands

```bash
npm run dev          # nodemon (port 4000)
npm run start        # production
npm run test         # Jest once (PGTESTDATABASE)
npm run test:watch   # watch mode

# Single test file
npx jest __tests__/auth.local.test.js --runInBand

# Superuser utilities
node src/bootstrap/bootstrap-superuser.js     # re-send invite email
node src/bootstrap/manual-setup-superuser.js  # activate directly (no email)
```

---

## Request Lifecycle

1. CORS — origin whitelist (`FRONTEND_ORIGIN`, `LOCAL_ORIGIN`)
2. `suspiciousInputLogger` — SQL injection detection, IP throttling
3. `requireAuth` — validates `sid` cookie, loads `req.user` (with roles)
4. `requireRole(...roles)` — RBAC assertion, 403 on failure
5. Route handler — parameterized `pg` queries
6. `errorHandler` — PostgreSQL error normalization, no internals in production

---

## Route Groups

| Prefix | Auth | Roles |
|---|---|---|
| `/auth/*` | None / session | — |
| `/bookings/*` | Required | customer |
| `/worker/bookings/*` | Required | worker |
| `/admin/*` | Required | admin, superuser |
| `/employees/*` | Required | superuser |
| `/public/bookings/*` | None | — |

---

## Database

Schema: `sql/schema.sql` (manually applied, no migration runner)

Extensions: `CITEXT`, `pgcrypto`, `btree_gist`

`NODE_ENV=test` switches to `PGTESTDATABASE`.

---

## Environment Variables

See root README for full list. Key vars:

```env
DATABASE_URL=           # preferred (Railway injects for linked Postgres)
EMAIL_ENABLED=true
RESEND_API_KEY=
EMAIL_FROM_BOOKINGS=
APP_BASE_URL=
BOOTSTRAP_SUPERUSER_EMAIL=
```
