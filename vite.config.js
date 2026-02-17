import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import { execFile, spawn } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'

const TERMINAL_COLORS_PATH = join(homedir(), '.claude/terminal-colors.sh')

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch (err) { reject(err) }
    })
  })
}

function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server) {
      // Update terminal-colors.sh
      server.middlewares.use('/api/update-color', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return }
        try {
          const { name, hex } = await readJsonBody(req)
          const content = fs.readFileSync(TERMINAL_COLORS_PATH, 'utf8')
          const lines = content.split('\n')
          let updated = false
          for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^(\s+"([^"]+)"\s+)"([a-fA-F0-9]{6})"/)
            if (match && (match[2] === name || name.includes(match[2]))) {
              lines[i] = `${match[1]}"${hex}"`
              updated = true
              break
            }
          }
          if (updated) {
            fs.writeFileSync(TERMINAL_COLORS_PATH, lines.join('\n'))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } else {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'Project not found in terminal-colors.sh' }))
          }
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })

      // Launch a server command in the background (detached)
      server.middlewares.use('/api/launch-server', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return }
        try {
          const { command } = await readJsonBody(req)
          const expanded = command.replace(/^~/, homedir())
          const child = spawn('zsh', ['-lc', expanded], {
            detached: true,
            stdio: 'ignore',
          })
          child.unref()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, pid: child.pid }))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })

      // Launch a command in a new Terminal.app window
      server.middlewares.use('/api/launch-terminal', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return }
        try {
          const { command } = await readJsonBody(req)
          const script = `tell application "Terminal"
  do script ${JSON.stringify(command)}
  activate
end tell`
          execFile('osascript', ['-e', script], (err) => {
            if (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            } else {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            }
          })
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  server: {
    port: 3333,
    proxy: {
      '/ws': {
        target: 'ws://localhost:3333',
        ws: true,
      },
    },
  },
})
