# SPC Frontend

Next.js 15 App Router frontend for the Sharkey's Pest Control platform.

See the root [`README.md`](../README.md) for full platform documentation.

---

## Stack

- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS v4
- Framer Motion 12
- Recharts (analytics charts)
- Lucide React + Font Awesome (icons)
- next-themes (dark/light mode)

---

## Dev Commands

```bash
npm run dev      # dev server (port 3000)
npm run build    # production build
npm run lint     # ESLint
```

---

## Environment Variables (`frontend/.env.local`)

```env
NEXT_PUBLIC_AUTH_API_BASE=       # https://api.yourdomain.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_WS_URL=              # wss://api.yourdomain.com
```

---

## API Layer

All requests go through `src/lib/api/http.ts` (`jsonFetch<T>`).

- Credentials sent automatically (`credentials: "include"`)
- Domain modules in `src/lib/api/` (e.g. `bookings.ts`, `adminBookings.ts`, `employees.ts`)
- Real-time events via WebSocket in `src/lib/realtime/realtimeBus.ts`
