import Chart from 'chart.js/auto'
import { getAllCheckIns, getConfig } from '../db.js'
import { formatDateShort } from '../utils.js'

// Keep references so we can destroy before re-creating
const _charts = {}

export function initStatsTab() {
  document.addEventListener('tabActivated', e => {
    if (e.detail.tab === 'stats') renderStats()
  })
}

// ── Render ─────────────────────────────────────────────────────────────────

async function renderStats() {
  const container = document.getElementById('tab-stats')
  const [checkIns, membership] = await Promise.all([
    getAllCheckIns(),
    getConfig('membership')
  ])

  // Destroy old charts to prevent canvas reuse errors
  Object.values(_charts).forEach(c => { try { c.destroy() } catch (_) {} })
  Object.keys(_charts).forEach(k => delete _charts[k])

  const hasData = checkIns.length > 0

  container.innerHTML = `
    <div class="tab-header">
      <h1>Stats</h1>
    </div>
    <div class="stats-content">

      <!-- Summary grid -->
      <div class="stats-grid">
        ${statCard(checkIns.length, 'Total Check-ins')}
        ${statCard(uniqueBeers(checkIns), 'Unique Beers')}
        ${hasData ? statCard(avgRating(checkIns), 'Avg Rating') : ''}
        ${hasData ? statCard(formatDateShort(checkIns[checkIns.length - 1].date), 'First Log') : ''}
      </div>

      ${hasData ? `
        <div class="chart-section">
          <h2>Beers by Style</h2>
          <div class="chart-container">
            <canvas id="chart-styles"></canvas>
          </div>
        </div>

        <div class="chart-section">
          <h2>Beers by Brewery</h2>
          <div class="chart-container chart-bar">
            <canvas id="chart-breweries"></canvas>
          </div>
        </div>

        <div class="chart-section">
          <h2>Avg Rating by Style</h2>
          <div class="chart-container chart-bar">
            <canvas id="chart-style-ratings"></canvas>
          </div>
        </div>

        <div class="chart-section">
          <h2>Avg Rating by Brewery</h2>
          <div class="chart-container chart-bar">
            <canvas id="chart-brewery-ratings"></canvas>
          </div>
        </div>
      ` : `
        <div class="empty-state">
          Log some beers to see your stats! 🍺
        </div>
      `}

      <!-- Pace dashboard -->
      ${membership
        ? renderPaceSection(checkIns, membership)
        : `<div class="pace-setup-prompt">
            <p>Set up <strong>Membership Tracking</strong> in Settings to see your break-even progress.</p>
           </div>`
      }

    </div>
  `

  if (hasData) {
    buildStyleChart(checkIns)
    buildBreweryChart(checkIns)
    buildStyleRatingChart(checkIns)
    buildBreweryRatingChart(checkIns)
  }
}

// ── Chart builders ─────────────────────────────────────────────────────────

function buildStyleChart(checkIns) {
  const counts = countBy(checkIns, c => c.style || 'Unknown')
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])

  _charts.styles = new Chart(document.getElementById('chart-styles'), {
    type: 'doughnut',
    data: {
      labels: sorted.map(([s]) => s),
      datasets: [{
        data: sorted.map(([, n]) => n),
        backgroundColor: palette(sorted.length),
        borderWidth: 2,
        borderColor: '#14100a'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#f0e0c0', font: { size: 11 }, boxWidth: 14 }
        }
      }
    }
  })
}

function buildBreweryChart(checkIns) {
  const counts = countBy(checkIns, c => c.brewery || 'Unknown')
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)

  _charts.breweries = new Chart(document.getElementById('chart-breweries'), {
    type: 'bar',
    data: {
      labels: sorted.map(([b]) => b),
      datasets: [{
        label: 'Check-ins',
        data: sorted.map(([, n]) => n),
        backgroundColor: '#d4943a',
        borderRadius: 4
      }]
    },
    options: chartBarOptions(false)
  })
}

function buildStyleRatingChart(checkIns) {
  const rated = checkIns.filter(c => c.rating > 0)
  if (rated.length === 0) return

  const byStyle = groupBy(rated, c => c.style || 'Unknown')
  const avgByStyle = Object.entries(byStyle)
    .map(([style, items]) => ({ style, avg: mean(items.map(c => c.rating)) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10)

  _charts.styleRatings = new Chart(document.getElementById('chart-style-ratings'), {
    type: 'bar',
    data: {
      labels: avgByStyle.map(s => s.style),
      datasets: [{
        label: 'Avg Rating',
        data: avgByStyle.map(s => +s.avg.toFixed(2)),
        backgroundColor: '#f0b85a',
        borderRadius: 4
      }]
    },
    options: chartBarOptions(true, 5)
  })
}

function buildBreweryRatingChart(checkIns) {
  const rated = checkIns.filter(c => c.rating > 0)
  if (rated.length === 0) return

  const byBrewery = groupBy(rated, c => c.brewery || 'Unknown')
  const avgByBrewery = Object.entries(byBrewery)
    .map(([brewery, items]) => ({ brewery, avg: mean(items.map(c => c.rating)) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10)

  _charts.breweryRatings = new Chart(document.getElementById('chart-brewery-ratings'), {
    type: 'bar',
    data: {
      labels: avgByBrewery.map(s => s.brewery),
      datasets: [{
        label: 'Avg Rating',
        data: avgByBrewery.map(s => +s.avg.toFixed(2)),
        backgroundColor: '#e8a03a',
        borderRadius: 4
      }]
    },
    options: chartBarOptions(true, 5)
  })
}

function chartBarOptions(horizontal = false, yMax = null) {
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: '#9e8060', font: { size: 11 } },
        grid: { color: horizontal ? '#2a1e0f' : '#2a1e0f' }
      },
      y: {
        ticks: { color: '#f0e0c0', font: { size: 11 } },
        grid: { color: horizontal ? 'transparent' : '#2a1e0f' }
      }
    }
  }
  if (!horizontal && yMax !== null) {
    opts.scales.y.min = 0
    opts.scales.y.max = yMax
  }
  return opts
}

// ── Pace dashboard ─────────────────────────────────────────────────────────

function renderPaceSection(checkIns, membership) {
  const { membershipCost, startDate } = membership
  const today = new Date()
  const start = new Date(startDate)
  const daysSinceStart = Math.max(1, Math.floor((today - start) / 86400000))

  const redemptions = checkIns.filter(c => c.retailPrice)
  const totalRedeemed = redemptions.reduce((s, c) => s + Number(c.retailPrice), 0)
  const redemptionsUsed = redemptions.length
  const missedDays = Math.max(0, daysSinceStart - redemptionsUsed)
  const dailyAvg = totalRedeemed / daysSinceStart
  const requiredRate = membershipCost / daysSinceStart
  const progressPct = Math.min(150, (totalRedeemed / membershipCost) * 100)
  const costPerDrink = checkIns.length > 0 ? membershipCost / checkIns.length : membershipCost

  const remaining = membershipCost - totalRedeemed
  const daysToBreakEven = dailyAvg > 0 ? Math.ceil(remaining / dailyAvg) : null
  const projectedDate = daysToBreakEven != null
    ? new Date(today.getTime() + daysToBreakEven * 86400000)
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  const isAhead = dailyAvg >= requiredRate
  const progressDisplay = Math.min(100, progressPct)

  return `
    <div class="pace-dashboard">
      <h2>Membership Pace</h2>
      <p class="pace-meta">Started ${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · $${Number(membershipCost).toFixed(2)} cost</p>

      <div class="pace-progress-wrap">
        <div class="pace-progress-bar">
          <div class="pace-progress-fill" style="width: ${progressDisplay.toFixed(1)}%"></div>
        </div>
        <div class="pace-progress-label">${progressPct.toFixed(1)}% to break-even</div>
      </div>

      <div class="pace-indicator ${isAhead ? 'pace-ahead' : 'pace-behind'}">
        ${isAhead ? '✅ Ahead of pace' : '⚠️ Behind pace'}
        <span class="pace-rate-detail">
          ($${dailyAvg.toFixed(2)}/day avg vs $${requiredRate.toFixed(2)}/day needed)
        </span>
      </div>

      <div class="stats-grid pace-grid">
        ${statCard('$' + totalRedeemed.toFixed(2), 'Total Redeemed')}
        ${statCard('$' + dailyAvg.toFixed(2), 'Daily Avg Value')}
        ${statCard(daysSinceStart, 'Days Since Start')}
        ${statCard(redemptionsUsed, 'Redemptions Used')}
        ${statCard(missedDays, 'Missed Days')}
        ${statCard('$' + costPerDrink.toFixed(2), 'Cost Per Drink')}
        ${statCard(projectedDate, 'Projected Break-Even')}
        ${statCard('$' + requiredRate.toFixed(2) + '/day', 'Required Rate')}
      </div>
    </div>
  `
}

// ── Helpers ────────────────────────────────────────────────────────────────

function statCard(value, label) {
  return `<div class="stat-card">
    <div class="stat-value">${value}</div>
    <div class="stat-label">${label}</div>
  </div>`
}

function uniqueBeers(checkIns) {
  return new Set(checkIns.map(c => `${c.name}|||${c.brewery}`)).size
}

function avgRating(checkIns) {
  const rated = checkIns.filter(c => c.rating > 0)
  if (!rated.length) return '—'
  return (rated.reduce((s, c) => s + c.rating, 0) / rated.length).toFixed(1) + '★'
}

function countBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}

function mean(nums) {
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function palette(n) {
  const colors = [
    '#d4943a', '#f0b85a', '#e87030', '#c06820', '#f0d080',
    '#a05820', '#e8a030', '#805010', '#f0c040', '#d08030',
    '#c87820', '#b06010'
  ]
  return Array.from({ length: n }, (_, i) => colors[i % colors.length])
}
