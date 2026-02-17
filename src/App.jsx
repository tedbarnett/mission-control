import { useState, useEffect, useRef, useCallback } from 'react'
import projectData from './projects.json'
import './App.css'

function useDraggable() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })

  const onMouseDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return
    dragging.current = true
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()

    const onMouseMove = (e) => {
      if (!dragging.current) return
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y })
    }
    const onMouseUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [pos.x, pos.y])

  const reset = useCallback(() => setPos({ x: 0, y: 0 }), [])

  return { pos, onMouseDown, reset }
}

const STORAGE_KEY = 'mission-control-renames'
const STARS_KEY = 'mission-control-stars'
const SETTINGS_KEY = 'mission-control-settings'
const TODOS_KEY = 'mission-control-user-todos'
const STAR_ORDER_KEY = 'mission-control-star-order'
const CUSTOM_COLORS_KEY = 'mission-control-custom-colors'

const TERMINAL_COLORS = {
  'Mission Control': '#d1d1ff',
  'Post-Scarcity': '#d1ffd1',
  'Reason AI': '#ffd1d1',
  'Home Movies': '#ffe9d1',
  'Growing Up': '#d1ffe9',
  'MapWalk iOS': '#d1e6ff',
  'Digital Twins — Neil': '#ffd1e9',
  'Boswell': '#e9d1ff',
  'DreamBuilder iOS': '#d1ffdc',
  'TimeWalk Mobile': '#dcffd1',
  'TimeWalk Photo': '#fffcd1',
  'VideoWatcher': '#ffd7e1',
  'DailyBroadcast': '#d1f5ff',
  'VP Supervisor': '#ffe6d1',
  'TimeWalk AVP': '#dcd1ff',
  'Clawd': '#ebffd1',
  'Manhattan AI': '#d1ffff',
}

const DEFAULT_SETTINGS = {
  tintOpacity: 18,
  contentScale: 100,
  showTags: false,
  showTodos: true,
  showNextSteps: true,
  showStatus: false,
  showPath: false,
  terminalColors: false,
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback }
  catch { return fallback }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

const defaultTodos = {}
projectData.categories.forEach((cat) =>
  cat.projects.forEach((p) => { defaultTodos[p.id] = p.todos || [] })
)

const allCategories = projectData.categories.map((c) => c.name)
const allProjects = projectData.categories.flatMap((c) => c.projects)


function App() {
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [renames, setRenames] = useState(() => load(STORAGE_KEY, {}))
  const [stars, setStars] = useState(() => load(STARS_KEY, []))
  const [settings, setSettings] = useState(() => load(SETTINGS_KEY, DEFAULT_SETTINGS))
  const [userTodos, setUserTodos] = useState(() => load(TODOS_KEY, {}))
  const [starOrder, setStarOrder] = useState(() => load(STAR_ORDER_KEY, []))
  const [customColors, setCustomColors] = useState(() => load(CUSTOM_COLORS_KEY, {}))
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuTab, setMenuTab] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [addingTodoId, setAddingTodoId] = useState(null)
  const [newTodoText, setNewTodoText] = useState('')
  const [launchDialog, setLaunchDialog] = useState(null)
  const [newProjectDialog, setNewProjectDialog] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', path: '', tech: '', status: '' })
  const settingsDrag = useDraggable()
  const aboutDrag = useDraggable()
  const newProjectDrag = useDraggable()
  const launchDrag = useDraggable()
  const [dragIndex, setDragIndex] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const searchRef = useRef(null)
  const editRef = useRef(null)
  const menuRef = useRef(null)
  const filterRef = useRef(null)
  const todoInputRef = useRef(null)
  const cmdRef = useRef(null)

  const getTodos = (projectId) => {
    if (userTodos[projectId] !== undefined) return userTodos[projectId]
    return defaultTodos[projectId] || []
  }

  const setProjectTodos = (projectId, todos) => {
    const next = { ...userTodos, [projectId]: todos }
    setUserTodos(next)
    save(TODOS_KEY, next)
  }

  // Push CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--tint-opacity', settings.tintOpacity / 100)
    document.documentElement.style.setProperty('--tint-hover-opacity', Math.min((settings.tintOpacity + 8) / 100, 0.4))
    document.documentElement.style.setProperty('--content-scale', (settings.contentScale ?? 100) / 100)
  }, [settings.tintOpacity, settings.contentScale])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingId || addingTodoId) return
      if (e.key === 'Escape') {
        if (launchDialog) { setLaunchDialog(null); return }
        setSearch('')
        setMenuOpen(false)
        setActiveFilter('all')
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingId, addingTodoId, launchDialog])

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [editingId])

  useEffect(() => {
    if (addingTodoId && todoInputRef.current) {
      todoInputRef.current.focus()
    }
  }, [addingTodoId])

  useEffect(() => {
    if (launchDialog && cmdRef.current) {
      cmdRef.current.focus()
      cmdRef.current.select()
    }
  }, [launchDialog])

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  useEffect(() => {
    if (!filterOpen) return
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filterOpen])

  // Keep starOrder in sync with stars
  useEffect(() => {
    const currentOrder = starOrder
    const updated = [
      ...currentOrder.filter((id) => stars.includes(id)),
      ...stars.filter((id) => !currentOrder.includes(id)).sort()
    ]
    if (JSON.stringify(updated) !== JSON.stringify(currentOrder)) {
      setStarOrder(updated)
      save(STAR_ORDER_KEY, updated)
    }
  }, [stars])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    save(SETTINGS_KEY, next)
  }

  const getName = (project) => renames[project.id] || project.name
  const isStarred = (id) => stars.includes(id)

  const toggleStar = (e, id) => {
    e.stopPropagation()
    const next = isStarred(id) ? stars.filter((s) => s !== id) : [...stars, id]
    setStars(next)
    save(STARS_KEY, next)
  }

  const startRename = (e, project) => {
    e.stopPropagation()
    setEditingId(project.id)
    setEditValue(getName(project))
  }

  const commitRename = () => {
    if (!editingId) return
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== allProjects.find((p) => p.id === editingId)?.name) {
      const next = { ...renames, [editingId]: trimmed }
      setRenames(next)
      save(STORAGE_KEY, next)
      showToast(`Renamed to "${trimmed}"`)
    } else {
      const next = { ...renames }
      delete next[editingId]
      setRenames(next)
      save(STORAGE_KEY, next)
    }
    setEditingId(null)
  }

  const cancelRename = () => setEditingId(null)

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitRename() }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelRename() }
  }

  // Todo management
  const addTodo = (e, projectId) => {
    e.stopPropagation()
    setAddingTodoId(projectId)
    setNewTodoText('')
  }

  const commitTodo = (e) => {
    if (e) e.stopPropagation()
    const trimmed = newTodoText.trim()
    if (trimmed && addingTodoId) {
      const current = getTodos(addingTodoId)
      setProjectTodos(addingTodoId, [...current, trimmed])
    }
    setAddingTodoId(null)
    setNewTodoText('')
  }

  const removeTodo = (e, projectId, index) => {
    e.stopPropagation()
    const current = [...getTodos(projectId)]
    current.splice(index, 1)
    setProjectTodos(projectId, current)
  }

  const handleTodoKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitTodo(e) }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAddingTodoId(null) }
  }

  const expandPath = (p) => p.replace(/^~/, '/Users/tedbarnett')

  const syncColorToTerminal = (name, hex) => {
    fetch('/api/update-color', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, hex }),
    }).catch(() => {})
  }

  const setProjectColor = (id, color) => {
    const next = { ...customColors, [id]: color }
    setCustomColors(next)
    save(CUSTOM_COLORS_KEY, next)
    const project = allProjects.find((p) => p.id === id)
    if (project) syncColorToTerminal(project.name, color.replace('#', ''))
  }

  const clearProjectColor = (id) => {
    const next = { ...customColors }
    delete next[id]
    setCustomColors(next)
    save(CUSTOM_COLORS_KEY, next)
    // Restore default color in terminal-colors.sh
    const project = allProjects.find((p) => p.id === id)
    if (project && TERMINAL_COLORS[project.name]) {
      syncColorToTerminal(project.name, TERMINAL_COLORS[project.name].replace('#', ''))
    }
  }

  const getResolvedColor = (project, category) => {
    if (customColors[project.id]) return customColors[project.id]
    if (settings.terminalColors && TERMINAL_COLORS[project.name]) return TERMINAL_COLORS[project.name]
    return category.color
  }

  // Launch dialog — just cd + claude, todos synced separately
  const openLaunchDialog = (e, project) => {
    e.stopPropagation()
    if (!project.path) return
    setLaunchDialog({ project, command: `cd "${expandPath(project.path)}" && claude` })
  }

  const copyLaunchCmd = () => {
    if (!launchDialog) return
    navigator.clipboard.writeText(launchDialog.command)
    showToast('Copied to clipboard')
    setLaunchDialog(null)
  }

  const launchInTerminal = () => {
    if (!launchDialog) return
    fetch('/api/launch-terminal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: launchDialog.command }),
    })
      .then((r) => r.json())
      .then(() => showToast('Launched in Terminal'))
      .catch(() => {
        navigator.clipboard.writeText(launchDialog.command)
        showToast('Fallback: copied to clipboard')
      })
    setLaunchDialog(null)
  }

  // Sync all todos to CLAUDE.md files via a terminal command
  const syncTodos = () => {
    const todosMap = {}
    allProjects.forEach((p) => {
      if (!p.path) return
      const todos = getTodos(p.id)
      if (todos.length > 0) todosMap[p.path] = todos
    })
    const escaped = JSON.stringify(todosMap).replace(/'/g, "'\\''")
    const cmd = `echo '${escaped}' | node ~/.claude/dashboard/write-todos.cjs --sync-all`
    navigator.clipboard.writeText(cmd)
    showToast('Sync command copied — paste in terminal')
  }

  // Drag-and-drop for starred view
  const handleDragStart = (e, index) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === dropIndex) return
    const newOrder = [...starOrder]
    const [moved] = newOrder.splice(dragIndex, 1)
    newOrder.splice(dropIndex, 0, moved)
    setStarOrder(newOrder)
    save(STAR_ORDER_KEY, newOrder)
    setDragIndex(null)
  }

  const handleDragEnd = () => setDragIndex(null)

  const handleCardClick = (project) => {
    if (!project.path) return
    setLaunchDialog({ project, command: `cd "${expandPath(project.path)}" && claude` })
  }

  const liveProjects = allProjects.filter((p) => p.url)

  const searchFiltered = projectData.categories
    .map((cat) => ({
      ...cat,
      projects: cat.projects.filter((p) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
          getName(p).toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q) ||
          p.nextSteps.toLowerCase().includes(q) ||
          p.tech.some((t) => t.toLowerCase().includes(q)) ||
          getTodos(p.id).some((t) => t.toLowerCase().includes(q))
        )
      }),
    }))

  // Starred view: flat list sorted by user-defined order
  const starredProjects = starOrder
    .map((id) => allProjects.find((p) => p.id === id))
    .filter(Boolean)
    .filter((p) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        getName(p).toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q) ||
        p.nextSteps.toLowerCase().includes(q) ||
        p.tech.some((t) => t.toLowerCase().includes(q)) ||
        getTodos(p.id).some((t) => t.toLowerCase().includes(q))
      )
    })

  const filtered = activeFilter === 'starred' ? [] : searchFiltered
    .map((cat) => ({
      ...cat,
      projects: cat.projects.filter((p) => {
        if (activeFilter === 'all') return true
        return cat.name === activeFilter
      }),
    }))
    .filter((cat) => cat.projects.length > 0)

  const totalProjects = allProjects.length
  const visibleProjects = activeFilter === 'starred'
    ? starredProjects.length
    : filtered.reduce((sum, cat) => sum + cat.projects.length, 0)
  const starCount = stars.length

  const getCategoryForProject = (projectId) => {
    for (const cat of projectData.categories) {
      if (cat.projects.some((p) => p.id === projectId)) return cat
    }
    return { color: '#888' }
  }

  const renderCard = (project, category, opts = {}) => {
    const todos = getTodos(project.id)
    const { draggable, index } = opts
    return (
      <div
        key={project.id}
        className={`project-card ${dragIndex === index && draggable ? 'dragging' : ''} ${customColors[project.id] || (settings.terminalColors && TERMINAL_COLORS[project.name]) ? 'terminal-mode' : ''}`}
        style={{ '--accent-color': getResolvedColor(project, category) }}
        onClick={() => handleCardClick(project)}
        title={project.path ? 'Click to launch' : ''}
        draggable={draggable}
        onDragStart={draggable ? (e) => handleDragStart(e, index) : undefined}
        onDragOver={draggable ? (e) => handleDragOver(e) : undefined}
        onDrop={draggable ? (e) => handleDrop(e, index) : undefined}
        onDragEnd={draggable ? handleDragEnd : undefined}
      >
        <div className="card-top">
          {editingId === project.id ? (
            <input ref={editRef} className="rename-input" value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename} onKeyDown={handleEditKeyDown}
              onClick={(e) => e.stopPropagation()} />
          ) : (
            <span className="project-name"
              onDoubleClick={(e) => startRename(e, project)}
              title="Double-click to rename">
              {getName(project)}
            </span>
          )}
          <div className="card-top-right">
            {project.url && (
              <a className="live-link" href={project.url} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} title={project.url}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
            <button className={`star-btn ${isStarred(project.id) ? 'starred' : ''}`}
              onClick={(e) => toggleStar(e, project.id)}
              title={isStarred(project.id) ? 'Unstar' : 'Star'}>
              {isStarred(project.id) ? '\u2605' : '\u2606'}
            </button>
          </div>
        </div>

        {settings.showStatus && (
          <div className="project-status">{project.status}</div>
        )}

        {settings.showTags && project.tech.length > 0 && (
          <div className="tech-tags">
            {project.tech.map((t) => (
              <span key={t} className="tech-tag">{t}</span>
            ))}
          </div>
        )}

        {settings.showNextSteps && (
          <div className="next-steps" onClick={(e) => openLaunchDialog(e, project)}
            title="Click to launch">
            <span className="next-arrow">{'\u2192'}</span>
            <span>{project.nextSteps}</span>
          </div>
        )}

        {settings.showTodos && (
          <div className="todo-list" onClick={(e) => e.stopPropagation()}>
            {todos.map((todo, i) => (
              <div key={i} className="todo-item">
                <span className="todo-bullet" />
                <span className="todo-text">{todo}</span>
                <button className="todo-remove"
                  onClick={(e) => removeTodo(e, project.id, i)}
                  title="Remove">&times;</button>
              </div>
            ))}
            {addingTodoId === project.id ? (
              <div className="todo-add-row">
                <input
                  ref={todoInputRef}
                  className="todo-add-input"
                  placeholder="New todo..."
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  onKeyDown={handleTodoKeyDown}
                  onBlur={() => { commitTodo(); }}
                />
              </div>
            ) : (
              <button className="todo-add-btn"
                onClick={(e) => addTodo(e, project.id)}>
                + Add todo
              </button>
            )}
          </div>
        )}

        {settings.showPath && project.path && (
          <div className="project-path">{project.path}</div>
        )}
      </div>
    )
  }

  return (
    <>
      <header className="header">
        <div className="header-left" ref={menuRef}>
          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <button className="menu-item menu-nav" onClick={() => { setNewProjectDialog(true); setMenuOpen(false) }}>
                New Project
              </button>
              <button className="menu-item menu-nav" onClick={() => { setMenuTab('settings'); setMenuOpen(false) }}>
                Settings
              </button>
              <button className="menu-item menu-nav" onClick={() => { setMenuTab('about'); setMenuOpen(false) }}>
                About
              </button>
            </div>
          )}
        </div>
        <div className="header-center">
          <h1>My Projects</h1>
        </div>
        <div className="header-right" ref={filterRef}>
          <div className="filter-dropdown">
            <button className="filter-trigger" onClick={() => setFilterOpen(!filterOpen)}>
              <span className="filter-chevron">{filterOpen ? '\u2303' : '\u2304'}</span>
              <span className="filter-label">
                {search ? `Search: ${search}` :
                 activeFilter === 'all' ? 'All Projects' :
                 activeFilter === 'starred' ? `Starred (${starCount})` :
                 activeFilter}
              </span>
            </button>
            {filterOpen && (
              <div className="filter-popdown">
                <div className="filter-search">
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search projects..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                  {search && (
                    <button className="filter-search-clear" onClick={() => setSearch('')}>&times;</button>
                  )}
                </div>
                <div className="filter-pop-divider" />
                <button className={`filter-option ${activeFilter === 'all' && !search ? 'active' : ''}`}
                  onClick={() => { setActiveFilter('all'); setSearch(''); setFilterOpen(false) }}>
                  {activeFilter === 'all' && !search && <span className="filter-check">{'\u2713'}</span>}
                  All Projects
                  <span className="filter-option-count">{totalProjects}</span>
                </button>
                <button className={`filter-option ${activeFilter === 'starred' ? 'active' : ''}`}
                  onClick={() => { setActiveFilter('starred'); setSearch(''); setFilterOpen(false) }}>
                  {activeFilter === 'starred' && <span className="filter-check">{'\u2713'}</span>}
                  {'\u2605'} Starred
                  <span className="filter-option-count">{starCount}</span>
                </button>
                <div className="filter-pop-divider" />
                {allCategories.map((name) => {
                  const cat = projectData.categories.find((c) => c.name === name)
                  const count = cat ? cat.projects.length : 0
                  return (
                    <button key={name}
                      className={`filter-option ${activeFilter === name ? 'active' : ''}`}
                      onClick={() => { setActiveFilter(activeFilter === name ? 'all' : name); setSearch(''); setFilterOpen(false) }}>
                      {activeFilter === name && <span className="filter-check">{'\u2713'}</span>}
                      {name}
                      <span className="filter-option-count">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Starred view: flat list with drag-and-drop */}
      {activeFilter === 'starred' && (
        <div className="starred-view">
          <div className="project-grid">
            {starredProjects.map((project, index) => {
              const cat = getCategoryForProject(project.id)
              return renderCard(project, cat, { draggable: true, index })
            })}
          </div>
          {starredProjects.length === 0 && (
            <div className="empty-state">
              No starred projects yet. Click the star on any card to add it here.
            </div>
          )}
        </div>
      )}

      {/* Category view */}
      {activeFilter !== 'starred' && filtered.map((category) => (
        <div className="category" key={category.name}>
          <div className="category-label">
            <span className="category-name">{category.name}</span>
          </div>
          <div className="project-grid">
            {category.projects.map((project) => renderCard(project, category))}
          </div>
        </div>
      ))}

      {activeFilter !== 'starred' && filtered.length === 0 && (
        <div className="empty-state">
          No projects match your filters.
          <button className="clear-filter" onClick={() => { setActiveFilter('all'); setSearch('') }}>
            Clear filters
          </button>
        </div>
      )}

      {/* Launch dialog */}
      {newProjectDialog && (
        <div className="dialog-overlay" onClick={() => { setNewProjectDialog(false); newProjectDrag.reset() }}>
          <div className="dialog new-project-dialog" onClick={(e) => e.stopPropagation()}
            style={{ transform: `translate(${newProjectDrag.pos.x}px, ${newProjectDrag.pos.y}px)` }}>
            <div className="dialog-header draggable-header" onMouseDown={newProjectDrag.onMouseDown}>
              <span className="dialog-title">New Project</span>
              <button className="dialog-close" onClick={() => { setNewProjectDialog(false); newProjectDrag.reset() }}>&times;</button>
            </div>
            <div className="new-project-form">
              <label className="new-project-label">
                Name
                <input type="text" value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Project Name" />
              </label>
              <label className="new-project-label">
                Path
                <input type="text" value={newProject.path}
                  onChange={(e) => setNewProject({ ...newProject, path: e.target.value })}
                  placeholder="~/path/to/project" />
              </label>
              <label className="new-project-label">
                Tech (comma-separated)
                <input type="text" value={newProject.tech}
                  onChange={(e) => setNewProject({ ...newProject, tech: e.target.value })}
                  placeholder="React, Node.js" />
              </label>
              <label className="new-project-label">
                Status
                <input type="text" value={newProject.status}
                  onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                  placeholder="Current status" />
              </label>
            </div>
            <div className="dialog-actions">
              <button className="dialog-copy" onClick={() => {
                showToast(`Scan for new projects (coming soon)`)
                setNewProjectDialog(false)
              }}>Scan for New Projects</button>
              <button className="dialog-cancel" onClick={() => setNewProjectDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {launchDialog && (
        <div className="dialog-overlay" onClick={() => { setLaunchDialog(null); launchDrag.reset() }}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}
            style={{ transform: `translate(${launchDrag.pos.x}px, ${launchDrag.pos.y}px)` }}>
            <div className="dialog-header draggable-header" onMouseDown={launchDrag.onMouseDown}>
              <span className="dialog-title">Launch {getName(launchDialog.project)}</span>
              <button className="dialog-close" onClick={() => { setLaunchDialog(null); launchDrag.reset() }}>&times;</button>
            </div>
            <div className="color-picker-row">
              <span className="color-picker-label">Card Color</span>
              <input
                type="color"
                className="color-picker-input"
                value={getResolvedColor(launchDialog.project, getCategoryForProject(launchDialog.project.id))}
                onChange={(e) => setProjectColor(launchDialog.project.id, e.target.value)}
              />
              <span className="color-picker-hex">
                {getResolvedColor(launchDialog.project, getCategoryForProject(launchDialog.project.id))}
              </span>
              {customColors[launchDialog.project.id] && (
                <button className="color-picker-reset" onClick={() => clearProjectColor(launchDialog.project.id)}>
                  Reset
                </button>
              )}
            </div>
            <textarea
              ref={cmdRef}
              className="dialog-cmd"
              value={launchDialog.command}
              onChange={(e) => setLaunchDialog({ ...launchDialog, command: e.target.value })}
              rows={3}
              spellCheck={false}
            />
            <div className="dialog-actions">
              <button className="dialog-launch" onClick={launchInTerminal}>Launch</button>
              <button className="dialog-copy" onClick={copyLaunchCmd}>Copy</button>
              <button className="dialog-cancel" onClick={() => setLaunchDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {menuTab === 'settings' && (
        <div className="dialog-overlay" onClick={() => { setMenuTab(null); settingsDrag.reset() }}>
          <div className="dialog dialog-narrow" onClick={(e) => e.stopPropagation()}
            style={{ transform: `translate(${settingsDrag.pos.x}px, ${settingsDrag.pos.y}px)` }}>
            <div className="dialog-header draggable-header" onMouseDown={settingsDrag.onMouseDown}>
              <span className="dialog-title">Settings</span>
              <button className="dialog-close" onClick={() => { setMenuTab(null); settingsDrag.reset() }}>&times;</button>
            </div>
            <div className="settings-panel">
              <div className="menu-section">Content Scale</div>
              <div className="setting-row">
                <input type="range" min="70" max="130" value={settings.contentScale ?? 100}
                  onChange={(e) => updateSetting('contentScale', Number(e.target.value))}
                  className="setting-slider" />
                <span className="setting-value">{settings.contentScale ?? 100}%</span>
              </div>
              <div className="menu-section">Card Tint</div>
              <div className="setting-row">
                <input type="range" min="0" max="40" value={settings.tintOpacity}
                  onChange={(e) => updateSetting('tintOpacity', Number(e.target.value))}
                  className="setting-slider" />
                <span className="setting-value">{settings.tintOpacity}%</span>
              </div>
              <label className="setting-toggle">
                <input type="checkbox" checked={settings.terminalColors ?? false}
                  onChange={(e) => updateSetting('terminalColors', e.target.checked)} />
                <span className="toggle-track"><span className="toggle-thumb" /></span>
                Terminal Colors
              </label>
              <div className="menu-section">Show on Cards</div>
              {[
                { key: 'showNextSteps', label: 'Next Steps' },
                { key: 'showTodos', label: 'To-do List' },
                { key: 'showTags', label: 'Tech Tags' },
                { key: 'showStatus', label: 'Status' },
                { key: 'showPath', label: 'Path' },
              ].map(({ key, label }) => (
                <label key={key} className="setting-toggle">
                  <input type="checkbox" checked={settings[key] ?? DEFAULT_SETTINGS[key]}
                    onChange={(e) => updateSetting(key, e.target.checked)} />
                  <span className="toggle-track"><span className="toggle-thumb" /></span>
                  {label}
                </label>
              ))}
              <div className="menu-divider" />
              <button className="menu-item" onClick={syncTodos}>
                Sync Todos to Projects
              </button>
              <button className="menu-item" onClick={() => {
                setSettings(DEFAULT_SETTINGS)
                save(SETTINGS_KEY, DEFAULT_SETTINGS)
                setCustomColors({})
                save(CUSTOM_COLORS_KEY, {})
                showToast('Settings reset')
              }}>Reset to defaults</button>
            </div>
          </div>
        </div>
      )}

      {menuTab === 'about' && (
        <div className="dialog-overlay" onClick={() => { setMenuTab(null); aboutDrag.reset() }}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}
            style={{ transform: `translate(${aboutDrag.pos.x}px, ${aboutDrag.pos.y}px)` }}>
            <div className="dialog-header draggable-header" onMouseDown={aboutDrag.onMouseDown}>
              <span className="dialog-title">About</span>
              <button className="dialog-close" onClick={() => { setMenuTab(null); aboutDrag.reset() }}>&times;</button>
            </div>
            <div className="settings-panel">
              <div className="about-text">
                A project dashboard built by <strong>Ted Barnett</strong> and <strong>Claude Code</strong> (Anthropic).
              </div>
              <div className="about-text">
                Manage, launch, and track all your projects from one place. Todos sync directly to each project's CLAUDE.md for seamless AI-assisted development.
              </div>
              <div className="about-meta">
                React 19 + Vite &middot; {totalProjects} projects &middot; {projectData.lastUpdated}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast ? 'visible' : ''}`}>{toast}</div>
    </>
  )
}

export default App
