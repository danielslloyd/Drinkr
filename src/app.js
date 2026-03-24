import { showStartup } from './startup.js'
import { initLogTab } from './tabs/log.js'
import { initJournalTab } from './tabs/journal.js'
import { initStatsTab } from './tabs/stats.js'
import { initSettingsTab } from './tabs/settings.js'

export function initApp() {
  // Initialize tab modules
  initLogTab()
  initJournalTab()
  initStatsTab()
  initSettingsTab()

  // Bottom nav click handlers
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  })

  // Allow tab modules to request navigation without circular imports
  document.addEventListener('requestTabSwitch', e => {
    switchTab(e.detail.tab, e.detail.options)
  })

  // Show the startup prompt on every session
  showStartup()
}

export function switchTab(tabName, options = {}) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'))
  const pane = document.getElementById(`tab-${tabName}`)
  if (pane) pane.classList.remove('hidden')

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName)
  })

  document.getElementById('main-app').classList.remove('hidden')

  document.dispatchEvent(new CustomEvent('tabActivated', { detail: { tab: tabName, options } }))
}
