# Notice Desk (Announcements) — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `announcements`, evidence Prototype) on
> 2026-10-23.

## What it is

A client-only demo of an announcements board over browser-local data, seeded with three sample notices.

## Who it is for

A portfolio visitor who wants to see a small compose-and-board UI for public notices.

## What works today

1. Compose a notice (headline and body required; an empty desk becomes "General") in state Draft, Scheduled or
   Published. Published notices get today's date; the others show "—".
2. Search headline, body and desk; filter by state; copy a notice as text; remove it.
3. The board is saved in localStorage and survives a reload; broken stored data is ignored and the samples are shown.
4. `/api/mcp` answers JSON-RPC with `list_notices` and `get_notice` over the three sample notices (it cannot see
   notices pinned in a browser).
5. Front-end and server errors go to Sentry (errors only, personal data stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- No RSS feed, social sharing or persistent public record (claims removed from the portfolio card in the 2026-10
  review). States are labels only: nothing is scheduled, published or emailed.
- No editing of a pinned notice, no account, no sync. No product analytics beyond Vercel Analytics.

## Live URL and deploy state

- Live: https://announcements.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-announcements-frontend` is deployed only by CLI (last production 2026-10-23, CLI
  deploy of commit 1bdb723, the Next 16.4.2 security patch) and its Git link names the old repository
  `bookchaowalit/bookchaowalit-announcements-frontend`, so a push to `main` does not deploy. The live site lags
  `main` (no Sentry, template MCP route, fixed "23 Aug 2026" date) until the owner reconnects Vercel Git to this
  repository (owner action D9). `NEXT_PUBLIC_SENTRY_DSN` is already set on the Vercel project (Sentry project
  `community-announcements-web`, org `personal-yu0`).

## Boundaries

- Browser-only apart from the stateless `/api/mcp` route.
