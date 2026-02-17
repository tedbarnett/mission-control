import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const TERMINAL_COLORS_PATH = join(homedir(), '.claude/terminal-colors.sh')

function colorSyncPlugin() {
  return {
    name: 'color-sync',
    configureServer(server) {
      server.middlewares.use('/api/update-color', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const { name, hex } = JSON.parse(body)
            const content = fs.readFileSync(TERMINAL_COLORS_PATH, 'utf8')
            const lines = content.split('\n')
            let updated = false
            for (let i = 0; i < lines.length; i++) {
              // Match:   "Project Name"       "hexcolor"
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
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), colorSyncPlugin()],
  server: {
    proxy: {
      '/ws': {
        target: 'ws://localhost:3333',
        ws: true,
      },
    },
  },
})
