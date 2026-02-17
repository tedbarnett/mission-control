# Mission Control — Claude Instructions

## Project Overview
Mission Control is a React 19 + Vite dashboard at `~/.claude/dashboard/` that manages and launches Claude Code sessions across 21 projects. Runs on localhost:3333.

## Key Architecture
- Single-page React app, no backend — all state in localStorage
- `src/App.jsx` — all UI logic (single component)
- `src/App.css` — all styles (glassmorphic cards, responsive, dialog, drag-and-drop)
- `src/projects.json` — project data (categories, paths, tech, todos, URLs)
- `public/images/` — Mission Control screenshot
- `write-todos.cjs` — Node.js (CommonJS, not ESM!) script to sync todos into CLAUDE.md files
- CSS custom properties (`--tint-opacity`, `--content-scale`) driven by React state via `useEffect`

## Important Conventions
- Package.json has `"type": "module"` — use `.cjs` extension for any CommonJS scripts
- Settings, stars, todos, renames, star order all persist via localStorage with separate keys
- Card backgrounds use `color-mix(in srgb, ...)` for glassmorphic tints
- Use Unicode escapes (`'\u2197'`) not HTML entities (`&nearr;`) in JSX
- Todo sync uses markers `<!-- MC-TODOS-START -->` / `<!-- MC-TODOS-END -->` in each project's CLAUDE.md
- Terminal colors are mapped by project name in `TERMINAL_COLORS` object (matches `proj` shell colors)
- Filter is a compact dropdown (not a button bar)
- Starred view is a flat drag-and-drop list (no category grouping)

## Build & Run
```bash
npm run dev        # Dev mode with HMR
npm run build      # Production build to dist/
npm start          # Build + preview on port 3333
launch.sh          # Alternative: build + serve
```

## GitHub
Repository: https://github.com/tedbarnett/mission-control
