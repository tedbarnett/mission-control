import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import { execFile, spawn } from 'child_process'
import { homedir } from 'os'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

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

      // Scan for new project directories not yet in projects.json
      server.middlewares.use('/api/scan-projects', async (req, res) => {
        if (req.method !== 'GET') { res.statusCode = 405; res.end('Method not allowed'); return }
        try {
          const projectsPath = join(__dirname, 'src', 'projects.json')
          const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf8'))
          const home = homedir()

          // Collect all existing paths, normalized to absolute
          const existingPaths = new Set()
          for (const cat of projectsData.categories) {
            for (const p of cat.projects) {
              if (!p.path) continue
              const abs = p.path.replace(/^~/, home).replace(/\.\.\./, '')
              existingPaths.add(abs)
              // Also store the basename so we can match abbreviations like "~/barnettlabs Dropbox/.../X"
              existingPaths.add(resolve(abs))
            }
          }

          const scanDirs = [
            { dir: join(home, 'Github'), source: 'github' },
            { dir: join(home, 'barnettlabs Dropbox', 'Ted Barnett', 'Projects'), source: 'dropbox' },
          ]

          const discovered = []
          for (const { dir, source } of scanDirs) {
            if (!fs.existsSync(dir)) continue
            const entries = fs.readdirSync(dir, { withFileTypes: true })
            for (const entry of entries) {
              if (!entry.isDirectory() || entry.name.startsWith('.')) continue
              const fullPath = join(dir, entry.name)
              const tilePath = fullPath.replace(home, '~')

              // Check if this path is already tracked
              let alreadyTracked = existingPaths.has(fullPath) || existingPaths.has(resolve(fullPath))
              // Also check if any existing path ends with this directory name
              if (!alreadyTracked) {
                for (const ep of existingPaths) {
                  if (ep.endsWith('/' + entry.name) || ep.endsWith('\\' + entry.name)) {
                    alreadyTracked = true
                    break
                  }
                }
              }
              if (alreadyTracked) continue

              const hasGit = fs.existsSync(join(fullPath, '.git'))
              const hasClaude = fs.existsSync(join(fullPath, 'CLAUDE.md'))

              discovered.push({
                dirName: entry.name,
                path: tilePath,
                source,
                hasGit,
                hasClaude,
              })
            }
          }

          discovered.sort((a, b) => a.dirName.localeCompare(b.dirName))
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ discovered }))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })

      // Add new projects to projects.json
      server.middlewares.use('/api/add-projects', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method not allowed'); return }
        try {
          const { projects } = await readJsonBody(req)
          if (!projects || !Array.isArray(projects) || projects.length === 0) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'No projects provided' }))
            return
          }

          const projectsPath = join(__dirname, 'src', 'projects.json')
          const data = JSON.parse(fs.readFileSync(projectsPath, 'utf8'))

          // Find max ID across all categories
          let maxId = 0
          for (const cat of data.categories) {
            for (const p of cat.projects) {
              if (p.id > maxId) maxId = p.id
            }
          }

          for (const proj of projects) {
            maxId++
            const newProject = {
              id: maxId,
              name: proj.name,
              path: proj.path,
              tech: proj.tech || [],
              status: proj.status || 'New project',
              nextSteps: proj.nextSteps || 'Set up project',
              todos: [],
            }

            // Find the target category (default to "Lab")
            const targetCat = proj.category || 'Lab'
            let category = data.categories.find((c) => c.name === targetCat)
            if (!category) {
              category = data.categories.find((c) => c.name === 'Lab')
            }
            category.projects.push(newProject)
          }

          data.lastUpdated = new Date().toISOString().slice(0, 10)
          fs.writeFileSync(projectsPath, JSON.stringify(data, null, 2) + '\n')

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, added: projects.length }))
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
