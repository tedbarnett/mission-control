# Mission Control — Claude Instructions

## Project Overview
Mission Control is a React 19 + Vite dashboard that manages and launches Claude Code sessions across projects. Runs on localhost:3333.

**Deployment**: The canonical source is `~/Github/mission-control/`. The path `~/.claude/dashboard/` is a symlink pointing here — the LaunchAgent, shell aliases (`cc`, `dashboard`), and `start-server.sh` all reference `~/.claude/dashboard/`, so the symlink keeps everything in sync with a single copy of the code.

## Key Architecture
- Single-page React app with Vite dev server API for terminal color sync
- `src/App.jsx` — all UI logic (single component)
- `src/App.css` — all styles (glassmorphic cards, responsive, dialog, drag-and-drop)
- `src/projects.json` — project data (categories, paths, tech, todos, URLs)
- `vite.config.js` — Vite config + platform-aware API endpoints (terminal launch, directory browse, color sync, project scan, repo clone). Uses `osascript` on macOS, `cmd`/PowerShell on Windows.
- `start-server.sh` — used by the LaunchAgent (`com.tedbarnett.mission-control.plist`) for auto-start on login (macOS only)
- `write-todos.cjs` — Node.js (CommonJS, not ESM!) script to sync todos into CLAUDE.md files
- CSS custom properties (`--tint-opacity`, `--content-scale`) driven by React state via `useEffect`

## Important Conventions
- Package.json has `"type": "module"` — use `.cjs` extension for any CommonJS scripts
- Settings, stars, todos, renames, star order all persist via localStorage with separate keys
- Card backgrounds use `color-mix(in srgb, ...)` for glassmorphic tints
- Use Unicode escapes (`'\u2197'`) not HTML entities (`&nearr;`) in JSX
- Todo sync uses markers `<!-- MC-TODOS-START -->` / `<!-- MC-TODOS-END -->` in each project's CLAUDE.md
- Terminal colors are mapped by project name in `TERMINAL_COLORS` object (matches `proj` shell colors)
- Color picker in launch dialog auto-syncs to `~/.claude/terminal-colors.sh` via Vite server plugin
- Per-project edit dialog (pencil icon on each card) allows overriding name, category, status, next steps, description, tech tags, and GitHub repo URL — overrides persist in localStorage
- Projects can have a `repo` field (GitHub URL) in `projects.json`; used by launch dialog to offer cloning when directory is missing
- Filter is a compact dropdown (not a button bar)
- Starred view is a flat drag-and-drop list (no category grouping)

## Cross-Platform Support
- All Vite API endpoints detect `process.platform` and branch between macOS (`osascript`, `zsh`) and Windows (`cmd`, PowerShell)
- `/api/platform` endpoint provides platform and home directory to the frontend
- `/api/check-path` verifies project directories exist before launch
- `/api/clone-repo` clones a GitHub repo when a project directory is missing
- `/api/browse-directory` uses PowerShell `FolderBrowserDialog` on Windows, `osascript` on macOS
- `/api/update-color` gracefully handles missing `terminal-colors.sh` (returns `not-supported`)
- `/api/scan-projects` includes Windows-specific scan directories (`D:\Github-D`, `~/Documents/GitHub`)
- Frontend `expandPath` resolves `~` to actual home directory via `/api/platform` instead of relying on shell `$HOME`

## Build & Run
```bash
npm run dev        # Dev mode with HMR
npm run build      # Production build to dist/
npm start          # Build + preview on port 3333
launch.sh          # Alternative: build + serve
```

## GitHub
Repository: https://github.com/tedbarnett/mission-control
