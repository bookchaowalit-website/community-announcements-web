# Notice Desk (Announcements)

A browser-only notice board: write a notice (headline, body, desk, state Draft / Scheduled / Published), pin it to
the board, search headline, body and desk, filter by state, copy a notice as text or remove it. A Published notice is
dated the day it is pinned. The board starts with three sample notices and is kept in this browser's localStorage.

Live: https://announcements.bookchaowalit.com (deployed by Vercel CLI; it can lag `main`, see `PRODUCT.md`).

## What it does not do

- "Scheduled" and "Published" are labels in this browser only: nothing is published, scheduled or sent.
- No RSS feed, email, social sharing, CMS, account, public archive or sync.

## Run

```bash
npm ci
npm run dev
```

## Checks

```bash
npm test           # Vitest: board logic, MCP route, home page render, Sentry scrubbing
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the shared Node workflow (with a line-coverage gate) and the shared security
scan on every push and PR to `main`.

## Code map

- `lib/announcements.ts`: sample notices, `parseNotices` (validates stored data), `filterNotices`, `addNotice`,
  `removeNotice`, `positionLabel`, `formatDate`, `formatNotice` (used by the page and the MCP route).
- `lib/use-stored-state.ts`: localStorage-backed state via `useSyncExternalStore` (server render uses the samples).
- `app/api/mcp/route.ts`: stateless JSON-RPC endpoint with `list_notices` and `get_notice` over the samples.
- `lib/sentry.ts` + `instrumentation*.ts`: error reporting to Sentry, errors only, personal data stripped; off when
  `NEXT_PUBLIC_SENTRY_DSN` is unset.
- `app/more-projects/page.tsx`: shared portfolio link page (copied per repository, not a package).
