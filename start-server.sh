#!/bin/zsh
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/node@22/bin:$PATH"
cd "$HOME/.claude/dashboard"

# Wait for server to be ready, then open browser
(while ! curl -s http://localhost:3333 > /dev/null 2>&1; do sleep 1; done; open http://localhost:3333) &

exec npx vite --port 3333
