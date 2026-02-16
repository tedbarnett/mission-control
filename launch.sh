#!/bin/bash
# Mission Control — open the dashboard
DASHBOARD_DIR="$HOME/.claude/dashboard"
PORT=3333

# If already running, just open
if lsof -i :$PORT > /dev/null 2>&1; then
  open "http://localhost:$PORT"
  exit 0
fi

cd "$DASHBOARD_DIR"

# Rebuild if source changed
if [ ! -d "dist" ] || [ "src/App.jsx" -nt "dist/index.html" ] || [ "src/projects.json" -nt "dist/index.html" ]; then
  npm run build > /dev/null 2>&1
fi

# Serve static files (no backend needed)
npx vite preview --port $PORT > /dev/null 2>&1 &
sleep 1
open "http://localhost:$PORT"
