# CrimeOS — Frontend

Dashboard UI for the CrimeOS cybercrime investigation platform, built to match the
provided concept art. React 19 + Vite, CSS Modules for styling, Framer Motion for
the small entrance/hover animations, React Router for navigation.

## Run it

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## What's here

```
src/
  components/
    Sidebar/        nav + theme toggle + profile, collapses to a drawer under 1024px
    TopNav/          greeting, search, notifications, + New Case
    StatCard/        the four hero stat cards
    CaseCard/        one row in Recent Investigations
    ActivityFeed/     right-panel "Today's Activity" timeline
    QuickActions/     right-panel action tiles
    Icons/            inline SVG icon set (swap for lucide-react later if you want)
  context/
    ThemeContext.jsx  dark/light mode, toggles a data-theme attribute, no layout change
  data/
    mockData.js       shape mirrors the future /api/stats, /api/cases, /api/activity responses
  pages/
    Dashboard.jsx      the page in the concept art
    PlaceholderPage.jsx  stub for Cases / New Case / Analysis / Reports / Settings
  App.jsx             sidebar + main column shell, background grid/glow, routes
  index.css           all theme tokens (colors, radii, shadows) as CSS variables
```

## Wiring up the backend

Nothing here calls the API yet — `src/data/mockData.js` stands in for it. To connect:

1. Replace the imports in `Dashboard.jsx` with `axios` calls (`GET /api/stats`,
   `GET /api/cases?limit=4`, `GET /api/activity`) inside a `useEffect`, keeping the
   same prop shapes so `StatCard` / `CaseCard` / `ActivityFeed` don't need to change.
2. `evidence` on a case is an array of `{ type: 'pdf' | 'image' | 'audio' }` — map
   your ingestion pipeline's file types onto those three.
3. `New Case` and the Quick Actions tiles already route to their pages — wire the
   forms once the intake endpoints exist.

## Theming

Every color is a CSS variable defined per-theme in `index.css`
(`[data-theme='dark']` / `[data-theme='light']`). To restyle, edit variables there —
components never hardcode colors, so nothing else needs to change.

## Responsive behavior

- Sidebar is a static column ≥1024px, a slide-in drawer below that.
- Stat cards: 4 → 2 → 1 columns as the viewport narrows.
- Right panel (Activity + Quick Actions) drops below the main column under 1100px.
- Case rows collapse from a table-like row into a stacked card under 860px.
