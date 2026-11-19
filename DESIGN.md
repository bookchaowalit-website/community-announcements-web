# Design

Since 2026-11-19 the notice desk uses the shared **App shell** (see `APP-SHELL.md`; `app/app-shell.css` and `components/app-shell.tsx` are copied byte for byte
from the reference site). It replaced the earlier one-off look, whose small uppercase labels, unloaded or
render-blocking fonts and low-contrast text failed the design floor (review 2026-11-11).

- Sidebar of board states (All / Published / Scheduled / Drafts with counts; a pill row on phones), head with
  h1, count, a labelled search and **New notice**, the composer in place (headline, body, desk, state).
- Rows: headline, one line of the body (Show more for longer ones), desk and date, a status pill (text + tint,
  never colour alone), then two plain actions, Copy and Remove. Removing is undoable for a few seconds.
- Pin stays disabled until headline and body have text, with a hint saying so.
- Colours are the shell tokens only (no stray hex values); one font, Geist (the fake "mono" second load of
  Work Sans is gone).

Floor: Geist via `next/font` (variable on `<html>`), text ≥ 12px, controls ≥ 44px, 4.5:1 text contrast in
light and dark, 3px focus ring, forced-colors support, no horizontal scroll at 320px. `/more-projects`
redirects (308) to https://bookchaowalit.com/ and the footer links there.
