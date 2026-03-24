import { getAllCheckIns, getCatalog } from './db.js'
import { openLogForm } from './tabs/log.js'
import { todayStr, localDatetimeValue, escapeHtml } from './utils.js'

export async function showStartup() {
  const overlay = document.getElementById('startup-overlay')
  overlay.classList.remove('hidden')

  // Check if there are any check-ins today
  const today = todayStr()
  const allCheckIns = await getAllCheckIns()
  const todayCheckIns = allCheckIns.filter(c => c.date.startsWith(today))

  const title = document.getElementById('startup-title')
  title.textContent = todayCheckIns.length > 0
    ? 'Looks like you already logged one today — have another?'
    : 'Did you have a beer today?'

  // ── Yes ──────────────────────────────────────────────────────────────────
  document.getElementById('btn-yes').addEventListener('click', async () => {
    await showYesFlow()
  })

  // ── No ───────────────────────────────────────────────────────────────────
  document.getElementById('btn-no').addEventListener('click', () => {
    document.getElementById('startup-buttons').classList.add('hidden')
    document.getElementById('startup-no-options').classList.remove('hidden')
  })

  document.getElementById('btn-log-past').addEventListener('click', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    closeStartup()
    openLogForm({ date: localDatetimeValue(yesterday) })
    document.dispatchEvent(new CustomEvent('requestTabSwitch', { detail: { tab: 'log' } }))
  })

  document.getElementById('btn-view-stats').addEventListener('click', () => {
    closeStartup()
    document.dispatchEvent(new CustomEvent('requestTabSwitch', { detail: { tab: 'stats' } }))
  })
}

async function showYesFlow() {
  const catalog = await getCatalog()

  document.getElementById('startup-buttons').classList.add('hidden')
  const yesFlow = document.getElementById('startup-yes-flow')
  yesFlow.classList.remove('hidden')

  if (catalog.length === 0) {
    // No catalog loaded — go straight to blank log form
    closeStartup()
    openLogForm({ fromStartup: true })
    document.dispatchEvent(new CustomEvent('requestTabSwitch', { detail: { tab: 'log' } }))
    return
  }

  // ── Catalog search UI ─────────────────────────────────────────────────
  yesFlow.innerHTML = `
    <div class="catalog-search">
      <input
        type="text"
        id="startup-search"
        class="input-field"
        placeholder="Search catalog..."
        autocomplete="off"
        autofocus
      >
      <div id="startup-catalog-list" class="catalog-list"></div>
      <button id="startup-skip" class="btn btn-ghost btn-full">Enter manually →</button>
    </div>
  `

  const searchInput = document.getElementById('startup-search')
  const catalogList = document.getElementById('startup-catalog-list')

  function renderItems(items) {
    if (items.length === 0) {
      catalogList.innerHTML = '<p class="catalog-empty">No matches found.</p>'
      return
    }
    catalogList.innerHTML = items.slice(0, 25).map(beer => `
      <div class="catalog-item" data-id="${beer.id}">
        <div class="catalog-item-photo">
          <img
            src="/catalog-images/${escapeHtml(beer.photo || '')}"
            alt="${escapeHtml(beer.name)}"
            onerror="this.src='/images/placeholder-beer.svg'"
          >
        </div>
        <div class="catalog-item-info">
          <div class="catalog-item-name">${escapeHtml(beer.name)}</div>
          <div class="catalog-item-brewery">${escapeHtml(beer.brewery || '')}</div>
          <div class="catalog-item-style">${escapeHtml(beer.style || '')}</div>
          ${beer.retailPrice ? `<div class="catalog-item-price">$${Number(beer.retailPrice).toFixed(2)}</div>` : ''}
        </div>
      </div>
    `).join('')

    catalogList.querySelectorAll('.catalog-item').forEach(el => {
      el.addEventListener('click', () => {
        const beer = items.find(b => String(b.id) === el.dataset.id)
        if (!beer) return
        closeStartup()
        openLogForm({
          name: beer.name,
          brewery: beer.brewery || '',
          style: beer.style || '',
          catalogPhoto: beer.photo ? `/catalog-images/${beer.photo}` : null,
          retailPrice: beer.retailPrice || null,
          fromStartup: true
        })
        document.dispatchEvent(new CustomEvent('requestTabSwitch', { detail: { tab: 'log' } }))
      })
    })
  }

  renderItems(catalog)

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim()
    if (!q) {
      renderItems(catalog)
      return
    }
    const filtered = catalog.filter(b =>
      (b.name || '').toLowerCase().includes(q) ||
      (b.brewery || '').toLowerCase().includes(q) ||
      (b.style || '').toLowerCase().includes(q)
    )
    renderItems(filtered)
  })

  document.getElementById('startup-skip').addEventListener('click', () => {
    closeStartup()
    openLogForm({ fromStartup: true })
    document.dispatchEvent(new CustomEvent('requestTabSwitch', { detail: { tab: 'log' } }))
  })
}

function closeStartup() {
  document.getElementById('startup-overlay').classList.add('hidden')
}
