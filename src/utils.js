// ── Toast notifications ────────────────────────────────────────────────────

export function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message
  document.body.appendChild(toast)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'))
  })

  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 2500)
}

// ── Date helpers ───────────────────────────────────────────────────────────

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  })
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function localDatetimeValue(date = new Date()) {
  // Returns value suitable for datetime-local input
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// ── Star rating ────────────────────────────────────────────────────────────

export function renderStarsHTML(rating) {
  let html = ''
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      html += `<span class="star full" data-value="${i}">★</span>`
    } else if (rating >= i - 0.5) {
      html += `<span class="star half" data-value="${i - 0.5}">★</span>`
    } else {
      html += `<span class="star empty" data-value="${i}">★</span>`
    }
  }
  return html
}

export function renderStarsDisplay(rating) {
  if (!rating) return '<span class="no-rating">—</span>'
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  return '★'.repeat(full) + (half ? '½' : '') + `<span class="rating-num"> ${rating}</span>`
}

// ── Misc ───────────────────────────────────────────────────────────────────

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
