import { setCatalog, getCatalog, getAllCheckIns, clearAllData, getConfig, setConfig } from '../db.js'
import { showToast } from '../utils.js'

export function initSettingsTab() {
  document.addEventListener('tabActivated', e => {
    if (e.detail.tab === 'settings') renderSettings()
  })
}

// ── Render ─────────────────────────────────────────────────────────────────

async function renderSettings() {
  const container = document.getElementById('tab-settings')
  const [catalog, membership] = await Promise.all([
    getCatalog(),
    getConfig('membership')
  ])

  container.innerHTML = `
    <div class="tab-header">
      <h1>Settings</h1>
    </div>
    <div class="settings-content">

      <!-- Beer Catalog Import -->
      <section class="settings-section">
        <h2>Beer Catalog</h2>
        <p class="settings-desc">
          Import a <code>.json</code> file to enable autocomplete in the log form.
          Place beer images in <code>public/catalog-images/</code> and reference
          them by filename in the JSON.
        </p>
        ${catalog.length > 0
          ? `<p class="settings-info">✓ ${catalog.length} beer${catalog.length !== 1 ? 's' : ''} loaded</p>`
          : `<p class="settings-info muted">No catalog loaded yet.</p>`
        }
        <label class="btn btn-secondary">
          📂 Import Catalog JSON
          <input type="file" id="import-catalog" accept=".json" class="hidden">
        </label>
        <details class="settings-help">
          <summary>JSON format</summary>
          <pre class="code-block">[
  {
    "name": "Heady Topper",
    "brewery": "The Alchemist",
    "style": "Double IPA",
    "photo": "heady-topper.jpg",
    "retailPrice": 12.00
  }
]</pre>
        </details>
      </section>

      <!-- Membership Tracking -->
      <section class="settings-section">
        <h2>Membership Tracking</h2>
        <p class="settings-desc">
          Track break-even progress on a membership or subscription (e.g. "1 free drink per day for life").
        </p>
        <form id="membership-form">
          <div class="form-group">
            <label class="form-label" for="m-cost">Membership Cost ($)</label>
            <input type="number" id="m-cost" class="input-field"
              placeholder="e.g. 2000"
              value="${membership ? membership.membershipCost : ''}"
              min="0" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label" for="m-start">Start Date</label>
            <input type="date" id="m-start" class="input-field"
              value="${membership ? (membership.startDate || '').slice(0, 10) : ''}">
          </div>
          <p class="settings-desc" style="margin-top:4px;">
            Entitlement: <em>1 free drink per day for life</em>
          </p>
          <button type="submit" class="btn btn-primary">Save Membership Config</button>
          ${membership
            ? `<button type="button" id="clear-membership" class="btn btn-ghost btn-sm">Clear membership config</button>`
            : ''
          }
        </form>
      </section>

      <!-- Export -->
      <section class="settings-section">
        <h2>Export Data</h2>
        <p class="settings-desc">Download all check-ins as a <code>.json</code> file.</p>
        <button id="export-btn" class="btn btn-secondary">💾 Export Check-ins</button>
      </section>

      <!-- Danger zone -->
      <section class="settings-section settings-danger">
        <h2>Danger Zone</h2>
        <p class="settings-desc">Permanently delete <em>all</em> check-ins, catalog, and settings. This cannot be undone.</p>
        <button id="clear-all-btn" class="btn btn-danger">🗑 Clear All Data</button>
      </section>

    </div>
  `

  bindEvents()
}

function bindEvents() {
  // ── Catalog import ───────────────────────────────────────────────────────
  document.getElementById('import-catalog').addEventListener('change', async e => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const text = await file.text()
      const beers = JSON.parse(text)
      if (!Array.isArray(beers)) throw new Error('Root value must be a JSON array.')
      if (beers.length === 0) throw new Error('The file contains no beers.')
      await setCatalog(beers)
      showToast(`Imported ${beers.length} beer${beers.length !== 1 ? 's' : ''}!`)
      renderSettings()
    } catch (err) {
      showToast('Import failed: ' + err.message, 'error')
    }
  })

  // ── Membership form ──────────────────────────────────────────────────────
  document.getElementById('membership-form').addEventListener('submit', async e => {
    e.preventDefault()
    const cost = parseFloat(document.getElementById('m-cost').value)
    const startDate = document.getElementById('m-start').value
    if (!cost || cost <= 0) { showToast('Enter a valid membership cost.', 'error'); return }
    if (!startDate) { showToast('Enter a start date.', 'error'); return }
    await setConfig('membership', { membershipCost: cost, startDate })
    showToast('Membership config saved!')
  })

  const clearMembership = document.getElementById('clear-membership')
  if (clearMembership) {
    clearMembership.addEventListener('click', async () => {
      if (!confirm('Remove membership tracking config?')) return
      await setConfig('membership', null)
      showToast('Membership config removed.')
      renderSettings()
    })
  }

  // ── Export ───────────────────────────────────────────────────────────────
  document.getElementById('export-btn').addEventListener('click', async () => {
    const checkIns = await getAllCheckIns()
    if (checkIns.length === 0) { showToast('No check-ins to export yet.', 'error'); return }
    const json = JSON.stringify(checkIns, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `drinkr-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${checkIns.length} check-in${checkIns.length !== 1 ? 's' : ''}.`)
  })

  // ── Clear all ────────────────────────────────────────────────────────────
  document.getElementById('clear-all-btn').addEventListener('click', async () => {
    if (!confirm('Delete ALL data? This cannot be undone.')) return
    if (!confirm('Really? All check-ins, your catalog, and settings will be permanently deleted.')) return
    await clearAllData()
    showToast('All data cleared.')
    renderSettings()
  })
}
