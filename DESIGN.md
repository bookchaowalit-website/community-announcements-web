# Circular — Design direction

## Product surface

Circular is a local notice desk for composing, filtering, reviewing, and copying public-facing announcements. It does not claim to publish or deliver messages.

## Visual world

A civic bulletin board translated into a quiet editorial desk: cream paper, blue ink, red corrections, and notices that read like short pieces of public copy rather than generic dashboard cards.

## Direction seed

Impeccable direction seed `3139c6ee`, operate mode, assigned direction 4. The grounded interpretation is a civic bulletin with compose/edit state and a readable notice board.

## System

- Palette: cream `#f5f0e7`, navy ink `#15263a`, bulletin blue `#285c79`, correction red `#b84235`.
- Typography: Lora carries headlines; Work Sans carries controls and archive labels.
- Composition: a broadsheet-like hero splits into compose and board columns; notices use ruled edges and state-specific tabs.
- Interaction: create, search, filter by lifecycle state, copy, remove, and local persistence.
- Responsive: compose comes first, then the board; filter controls remain readable as a wrapping row.

## Honesty constraints

Local state is labeled plainly. No email, CMS, public feed, or distribution promise is hidden in the interface.


---

## Storybook

Storybook 10 (`@storybook/nextjs-vite`) shows this design system with the app's real CSS, tokens and fonts.

```bash
npm run storybook        # http://localhost:6006
npm run build-storybook  # static build in storybook-static/ (CI: .github/workflows/storybook.yml)
```

- **Foundations/Tokens** reads every CSS custom property the app defines at runtime, so it never drifts from the code.
- **Design/DESIGN.md** renders this file.
- **Components/**, **Sections/** and **Pages/** show the UI with mock data only (no network, analytics off).
- Toolbar: locale, theme (light / dark, when the app has a dark theme), viewports 320 / 375 / 768 / 1440. The a11y panel runs axe (WCAG 2.2 AA).
- Rule: a new shared component or page section ships with a story in `stories/`.
