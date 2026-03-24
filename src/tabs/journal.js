import { getAllCheckIns, deleteCheckIn } from '../db.js'
import { openLogForm } from './log.js'
import { showToast, formatDateTime, renderStarsDisplay, escapeHtml } from '../utils.js'

export function initJournalTab() {
  document.addEventListener('tabActivated', e => {
    if (e.detail.tab === 'journal') renderJournal()
  })
}

// ── Render ─────────────────────────────────────────────────────────────────

async function renderJournal() {
  const container = document.getElementById('tab-journal')
  container.innerHTML = `
    <div class="tab-header">
      <h1>Journal</h1>
    </div>
    <div class="journal-filters">
      <input type="text" id="journal-search" class="input-field"
        placeholder="Search by name, brewery, style...">
      <div class="filter-row">
        <div class="filter-field">
          <label class="filter-label">From</label>
          <input type="date" id="filter-from" class="input-field input-sm">
        </div>
        <div class="filter-field">
          <label class="filter-label">To</label>
          <input type="date" id="filter-to" class="input-field input-sm">
        </div>
      </div>
    </div>
    <div id="journal-list" class="journal-list">
      <div class="loading">Loading...</div>
    </div>
  `

  let allCheckIns = await getAllCheckIns()
  let filtered = [...allCheckIns]

  function applyFilters() {
    const q = document.getElementById('journal-search').value.toLowerCase().trim()
    const from = document.getElementById('filter-from').value
    const to = document.getElementById('filter-to').value

    filtered = allCheckIns.filter(c => {
      if (q) {
        const haystack = [c.name, c.brewery, c.style, c.notes].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (from && c.date.slice(0, 10) < from) return false
      if (to && c.date.slice(0, 10) > to) return false
      return true
    })
    renderList()
  }

  function renderList() {
    const list = document.getElementById('journal-list')
    if (!list) return

    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty-state">No beers found. 🍺<br>Start logging above!</div>'
      return
    }

    list.innerHTML = filtered.map(c => `
      <div class="checkin-card" data-id="${c.id}">
        <div class="card-main">
          ${c.photoDataUrl
            ? `<div class="card-photo"><img src="${c.photoDataUrl}" alt="${escapeHtml(c.name)}" loading="lazy"></div>`
            : `<div class="card-photo card-photo-placeholder">🍺</div>`
          }
          <div class="card-info">
            <div class="card-name">${escapeHtml(c.name)}</div>
            <div class="card-brewery">${escapeHtml(c.brewery || '—')}</div>
            <div class="card-row">
              <span class="card-style">${escapeHtml(c.style || '—')}</span>
              <span class="card-rating">${renderStarsDisplay(c.rating)}</span>
            </div>
            <div class="card-date">${formatDateTime(c.date)}</div>
          </div>
          <button class="card-toggle" aria-label="Expand" data-id="${c.id}">›</button>
        </div>
        <div class="card-expanded hidden" id="exp-${c.id}">
          ${c.notes ? `<p class="card-notes">${escapeHtml(c.notes)}</p>` : '<p class="card-notes muted">No notes.</p>'}
          ${c.retailPrice ? `<p class="card-price">Retail value: $${Number(c.retailPrice).toFixed(2)}</p>` : ''}
          <div class="card-actions">
            <button class="btn btn-secondary btn-sm btn-edit" data-id="${c.id}">✏️ Edit</button>
            <button class="btn btn-danger btn-sm btn-delete" data-id="${c.id}">🗑 Delete</button>
          </div>
        </div>
      </div>
    `).join('')

    // Toggle expand/collapse
    list.querySelectorAll('.card-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = document.getElementById(`exp-${btn.dataset.id}`)
        const isOpen = !panel.classList.contains('hidden')
        panel.classList.toggle('hidden', isOpen)
        btn.textContent = isOpen ? '›' : '‹'
        btn.setAttribute('aria-label', isOpen ? 'Expand' : 'Collapse')
      })
    })

    // Edit
    list.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const checkin = allCheckIns.find(c => c.id === btn.dataset.id)
        if (!checkin) return
        openLogForm(checkin)
        document.dispatchEvent(new CustomEvent('requestTabSwitch', { detail: { tab: 'log' } }))
      })
    })

    // Delete
    list.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this check-in?')) return
        await deleteCheckIn(btn.dataset.id)
        allCheckIns = allCheckIns.filter(c => c.id !== btn.dataset.id)
        filtered = filtered.filter(c => c.id !== btn.dataset.id)
        renderList()
        showToast('Check-in deleted.')
      })
    })
  }

  document.getElementById('journal-search').addEventListener('input', applyFilters)
  document.getElementById('filter-from').addEventListener('change', applyFilters)
  document.getElementById('filter-to').addEventListener('change', applyFilters)

  renderList()
}
