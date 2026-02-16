import { useState, useEffect, useRef } from 'react'
import projectData from './projects.json'
import './App.css'

const STORAGE_KEY = 'mission-control-renames'
const STARS_KEY = 'mission-control-stars'
const SETTINGS_KEY = 'mission-control-settings'
const TODOS_KEY = 'mission-control-user-todos'
const STAR_ORDER_KEY = 'mission-control-star-order'

const DEFAULT_SETTINGS = {
  tintOpacity: 18,
  contentScale: 100,
  showTags: false,
  showTodos: true,
  showNextSteps: true,
  showStatus: false,
  showPath: false,
  showIcons: true,
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

const PROJECT_IMAGES = {
  1: 'mission-control.jpg',
  2: 'post-scarcity.svg',
  3: 'reason-ai.svg',
  4: 'home-movies.svg',
  5: 'growing-up.svg',
  6: 'mapwalk.svg',
  7: 'digital-twins.svg',
  8: 'boswell.svg',
  9: 'dreambuilder.svg',
  10: 'timewalk-mobile.svg',
  11: 'timewalk-photo.svg',
  12: 'videowatcher.svg',
  13: 'dailybroadcast.svg',
  14: 'vp-supervisor.svg',
  15: 'timewalk-avp.svg',
  16: 'clawd.svg',
  17: 'manhattan-ai.svg',
  18: 'moms-health.svg',
  19: 'olivia-blaine.svg',
  20: 'willa.svg',
  21: 'reason-weekend.svg',
}

function App() {
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [renames, setRenames] = useState(() => load(STORAGE_KEY, {}))
  const [stars, setStars] = useState(() => load(STARS_KEY, []))
  const [settings, setSettings] = useState(() => load(SETTINGS_KEY, DEFAULT_SETTINGS))
  const [userTodos, setUserTodos] = useState(() => load(TODOS_KEY, {}))
  const [starOrder, setStarOrder] = useState(() => load(STAR_ORDER_KEY, []))
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuTab, setMenuTab] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [addingTodoId, setAddingTodoId] = useState(null)
  const [newTodoText, setNewTodoText] = useState('')
  const [launchDialog, setLaunchDialog] = useState(null)
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

  // Launch dialog — just cd + claude, todos synced separately
  const openLaunchDialog = (e, project) => {
    e.stopPropagation()
    if (!project.path) return
    setLaunchDialog({ project, command: `cd "${project.path}" && claude` })
  }

  const copyLaunchCmd = () => {
    if (!launchDialog) return
    navigator.clipboard.writeText(launchDialog.command)
    showToast('Copied to clipboard')
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
    setLaunchDialog({ project, command: `cd "${project.path}" && claude` })
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
        className={`project-card ${dragIndex === index && draggable ? 'dragging' : ''}`}
        style={{ '--accent-color': category.color }}
        onClick={() => handleCardClick(project)}
        title={project.path ? 'Click to launch' : ''}
        draggable={draggable}
        onDragStart={draggable ? (e) => handleDragStart(e, index) : undefined}
        onDragOver={draggable ? (e) => handleDragOver(e) : undefined}
        onDrop={draggable ? (e) => handleDrop(e, index) : undefined}
        onDragEnd={draggable ? handleDragEnd : undefined}
      >
        {(settings.showIcons ?? true) && PROJECT_IMAGES[project.id] && (
          <div
            className="card-bg-image"
            style={{ backgroundImage: `url(/images/${PROJECT_IMAGES[project.id]})` }}
          />
        )}
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
                {'\u2197'}
              </a>
            )}
            <button className={`star-btn ${isStarred(project.id) ? 'starred' : ''}`}
              onClick={(e) => toggleStar(e, project.id)}
              title={isStarred(project.id) ? 'Unstar' : 'Star'}>
              {isStarred(project.id) ? '\u2605' : '\u2606'}
            </button>
            <span className="project-id">#{project.id}</span>
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
        <div className="header-left">
          <h1>Mission Control</h1>
          <span className="header-meta">
            {totalProjects} projects &middot; {projectData.lastUpdated}
          </span>
        </div>
        <div className="header-center">
          <div className="search-bar">
            <span className="search-icon">&#x2315;</span>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>
                &times;
              </button>
            )}
          </div>
        </div>
        <div className="header-right" ref={menuRef}>
          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <button className="menu-item menu-nav" onClick={() => setMenuTab(menuTab === 'settings' ? null : 'settings')}>
                {'\u2699'} Settings
                <span className="menu-arrow">{menuTab === 'settings' ? '\u2303' : '\u2304'}</span>
              </button>
              {menuTab === 'settings' && (
                <div className="menu-panel">
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
                  <div className="menu-section">Show on Cards</div>
                  {[
                    { key: 'showIcons', label: 'Background Image' },
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
                    {'\u{1F504}'} Sync Todos to Projects
                  </button>
                  <button className="menu-item" onClick={() => {
                    setSettings(DEFAULT_SETTINGS)
                    save(SETTINGS_KEY, DEFAULT_SETTINGS)
                    showToast('Settings reset')
                  }}>Reset to defaults</button>
                </div>
              )}

              <button className="menu-item menu-nav" onClick={() => setMenuTab(menuTab === 'links' ? null : 'links')}>
                {'\u{1F517}'} Links
                <span className="menu-arrow">{menuTab === 'links' ? '\u2303' : '\u2304'}</span>
              </button>
              {menuTab === 'links' && (
                <div className="menu-panel">
                  {liveProjects.map((p) => (
                    <a key={p.id} className="menu-item" href={p.url} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
                      {p.name}
                      <span className="menu-arrow">{'\u2197'}</span>
                    </a>
                  ))}
                </div>
              )}

              <button className="menu-item menu-nav" onClick={() => setMenuTab(menuTab === 'about' ? null : 'about')}>
                {'\u2139'} About
                <span className="menu-arrow">{menuTab === 'about' ? '\u2303' : '\u2304'}</span>
              </button>
              {menuTab === 'about' && (
                <div className="menu-panel about-panel">
                  <div className="about-title">Mission Control</div>
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
              )}
            </div>
          )}
        </div>
      </header>

      <div className="filter-row">
        <div className="filter-dropdown" ref={filterRef}>
          <button className="filter-trigger" onClick={() => setFilterOpen(!filterOpen)}>
            <span className="filter-label">
              {activeFilter === 'all' ? 'All Projects' :
               activeFilter === 'starred' ? `Starred (${starCount})` :
               activeFilter}
            </span>
            <span className="filter-chevron">{filterOpen ? '\u2303' : '\u2304'}</span>
          </button>
          {filterOpen && (
            <div className="filter-popdown">
              <button className={`filter-option ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setActiveFilter('all'); setFilterOpen(false) }}>
                {activeFilter === 'all' && <span className="filter-check">{'\u2713'}</span>}
                All Projects
                <span className="filter-option-count">{totalProjects}</span>
              </button>
              <button className={`filter-option ${activeFilter === 'starred' ? 'active' : ''}`}
                onClick={() => { setActiveFilter('starred'); setFilterOpen(false) }}>
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
                    onClick={() => { setActiveFilter(activeFilter === name ? 'all' : name); setFilterOpen(false) }}>
                    {activeFilter === name && <span className="filter-check">{'\u2713'}</span>}
                    <span className="filter-option-icon">{cat?.icon}</span>
                    {name}
                    <span className="filter-option-count">{count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        {activeFilter !== 'all' && (
          <span className="filter-active-info">
            {visibleProjects} of {totalProjects}
            <button className="clear-filter" onClick={() => { setActiveFilter('all'); setSearch('') }}>
              Clear
            </button>
          </span>
        )}
      </div>

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
          <div className="category-header">
            <span className="category-icon">{category.icon}</span>
            <span className="category-name" style={{ color: category.color }}>{category.name}</span>
            <span className="category-count">{category.projects.length}</span>
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
      {launchDialog && (
        <div className="dialog-overlay" onClick={() => setLaunchDialog(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <span className="dialog-title">Launch {getName(launchDialog.project)}</span>
              <button className="dialog-close" onClick={() => setLaunchDialog(null)}>&times;</button>
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
              <button className="dialog-copy" onClick={copyLaunchCmd}>Copy & Close</button>
              <button className="dialog-cancel" onClick={() => setLaunchDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast ? 'visible' : ''}`}>{toast}</div>
    </>
  )
}

export default App
