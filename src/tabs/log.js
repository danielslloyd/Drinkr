import { addCheckIn, updateCheckIn, getCatalog } from '../db.js'
import { showToast, renderStarsHTML, localDatetimeValue, escapeHtml } from '../utils.js'

// Module-level state (avoids circular imports — no switchTab import needed)
let _prefill = {}
let _editingId = null

export function initLogTab() {
  renderLogForm()
}

/**
 * Open the log form pre-filled with data.
 * Called by startup.js and journal.js.
 */
export function openLogForm(data = {}) {
  _prefill = { ...data }
  _editingId = data.id || null
  renderLogForm(data)
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderLogForm(data = {}) {
  const container = document.getElementById('tab-log')
  const defaultDate = data.date || localDatetimeValue()
  const rating = data.rating || 0

  // Determine initial photo state
  const initialPhoto = data.photoDataUrl || data.catalogPhoto || null

  container.innerHTML = `
    <div class="tab-header">
      <h1>${_editingId ? 'Edit Check-In' : 'Log a Beer'}</h1>
    </div>
    <form id="log-form" class="log-form" novalidate>

      <div class="form-group">
        <label class="form-label" for="field-name">Beer Name *</label>
        <div class="autocomplete-wrapper">
          <input
            type="text" id="field-name" class="input-field"
            placeholder="e.g. Heady Topper"
            value="${escapeHtml(data.name || '')}"
            autocomplete="off" required
          >
          <div id="ac-dropdown" class="ac-dropdown hidden"></div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="field-brewery">Brewery</label>
        <input type="text" id="field-brewery" class="input-field"
          placeholder="e.g. The Alchemist"
          value="${escapeHtml(data.brewery || '')}">
      </div>

      <div class="form-group">
        <label class="form-label" for="field-style">Style</label>
        <input type="text" id="field-style" class="input-field"
          placeholder="e.g. Double IPA"
          value="${escapeHtml(data.style || '')}">
      </div>

      <div class="form-group">
        <label class="form-label">Rating</label>
        <div id="star-rating" class="star-rating" data-rating="${rating}">
          ${renderStarsHTML(rating)}
        </div>
        <span id="rating-display" class="rating-display">
          ${rating ? rating + ' / 5' : 'Tap to rate'}
        </span>
      </div>

      <div class="form-group">
        <label class="form-label" for="field-notes">Notes</label>
        <textarea id="field-notes" class="input-field" rows="3"
          placeholder="Tasting notes, where you had it..."
        >${escapeHtml(data.notes || '')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Photo</label>
        <div class="photo-section">
          <div id="photo-preview" class="photo-preview ${initialPhoto ? '' : 'hidden'}">
            ${initialPhoto ? `<img id="photo-img" src="${escapeHtml(initialPhoto)}" alt="Beer photo">` : ''}
            <button type="button" id="remove-photo" class="photo-remove">✕</button>
          </div>
          <div class="photo-buttons">
            <label class="btn btn-secondary btn-sm">
              📷 Camera
              <input type="file" id="photo-capture" accept="image/*" capture="environment" class="hidden">
            </label>
            <label class="btn btn-secondary btn-sm">
              🖼 Gallery
              <input type="file" id="photo-upload" accept="image/*" class="hidden">
            </label>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="field-date">Date & Time</label>
        <input type="datetime-local" id="field-date" class="input-field" value="${defaultDate}">
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-full">
          ${_editingId ? '✓ Update Check-In' : '🍺 Save Check-In'}
        </button>
        ${_editingId
          ? `<button type="button" id="btn-cancel-edit" class="btn btn-ghost btn-full">Cancel</button>`
          : ''
        }
      </div>

    </form>
  `

  setupForm(initialPhoto)
  setupAutocomplete()
}

// ── Form logic ─────────────────────────────────────────────────────────────

function setupForm(initialPhoto) {
  let currentRating = _prefill.rating || 0
  let photoDataUrl = _prefill.photoDataUrl || null
  let catalogPhoto = _prefill.catalogPhoto || null

  // If we came from catalog, the photo is a URL reference (not data URL)
  // We store the reference; on save we will store it as photoDataUrl only if user captures a new one
  if (catalogPhoto && !photoDataUrl) {
    // Display catalog photo but don't snapshot it as dataUrl
    const preview = document.getElementById('photo-preview')
    if (preview) preview.classList.remove('hidden')
  }

  // ── Star rating ────────────────────────────────────────────────────────
  const starRating = document.getElementById('star-rating')
  starRating.addEventListener('click', e => {
    const star = e.target.closest('.star')
    if (!star) return
    const rect = star.getBoundingClientRect()
    const isHalf = (e.clientX - rect.left) < rect.width / 2
    const value = parseFloat(star.dataset.value)
    currentRating = isHalf ? value - 0.5 : value
    // Clamp to 0.5 minimum
    if (currentRating < 0.5) currentRating = 0.5
    starRating.dataset.rating = currentRating
    starRating.innerHTML = renderStarsHTML(currentRating)
    document.getElementById('rating-display').textContent = currentRating + ' / 5'
  })

  // ── Photo capture ──────────────────────────────────────────────────────
  function handlePhotoFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      photoDataUrl = e.target.result
      catalogPhoto = null // override catalog photo
      const preview = document.getElementById('photo-preview')
      preview.innerHTML = `<img id="photo-img" src="${photoDataUrl}" alt="Beer photo">
        <button type="button" id="remove-photo" class="photo-remove">✕</button>`
      preview.classList.remove('hidden')
      document.getElementById('remove-photo').addEventListener('click', removePhoto)
    }
    reader.readAsDataURL(file)
  }

  function removePhoto() {
    photoDataUrl = null
    catalogPhoto = null
    const preview = document.getElementById('photo-preview')
    preview.innerHTML = ''
    preview.classList.add('hidden')
  }

  document.getElementById('photo-capture').addEventListener('change', e => handlePhotoFile(e.target.files[0]))
  document.getElementById('photo-upload').addEventListener('change', e => handlePhotoFile(e.target.files[0]))

  const removeBtn = document.getElementById('remove-photo')
  if (removeBtn) removeBtn.addEventListener('click', removePhoto)

  // ── Cancel edit ────────────────────────────────────────────────────────
  const cancelBtn = document.getElementById('btn-cancel-edit')
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      _editingId = null
      _prefill = {}
      renderLogForm()
    })
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  document.getElementById('log-form').addEventListener('submit', async e => {
    e.preventDefault()

    const name = document.getElementById('field-name').value.trim()
    if (!name) {
      document.getElementById('field-name').focus()
      showToast('Beer name is required', 'error')
      return
    }

    const fromStartup = _prefill.fromStartup
    const retailPrice = _prefill.retailPrice || null

    const checkin = {
      id: _editingId || crypto.randomUUID(),
      name,
      brewery: document.getElementById('field-brewery').value.trim(),
      style: document.getElementById('field-style').value.trim(),
      rating: currentRating,
      notes: document.getElementById('field-notes').value.trim(),
      photoDataUrl: photoDataUrl || null,
      date: document.getElementById('field-date').value || new Date().toISOString(),
      retailPrice
    }

    try {
      if (_editingId) {
        await updateCheckIn(checkin)
        showToast('Check-in updated!')
      } else {
        await addCheckIn(checkin)
        showToast('Beer logged! 🍺')
      }

      _editingId = null
      _prefill = {}
      renderLogForm()

      if (fromStartup) {
        document.dispatchEvent(new CustomEvent('requestTabSwitch', { detail: { tab: 'stats' } }))
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to save. Try again.', 'error')
    }
  })
}

// ── Autocomplete ───────────────────────────────────────────────────────────

async function setupAutocomplete() {
  const input = document.getElementById('field-name')
  const dropdown = document.getElementById('ac-dropdown')
  if (!input || !dropdown) return

  const catalog = await getCatalog()
  if (catalog.length === 0) return

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim()
    if (!q) { dropdown.classList.add('hidden'); return }

    const matches = catalog.filter(b =>
      (b.name || '').toLowerCase().includes(q) ||
      (b.brewery || '').toLowerCase().includes(q)
    ).slice(0, 8)

    if (matches.length === 0) { dropdown.classList.add('hidden'); return }

    dropdown.innerHTML = matches.map(b => `
      <div class="ac-item" data-id="${b.id}">
        <span class="ac-name">${escapeHtml(b.name)}</span>
        <span class="ac-meta">${escapeHtml(b.brewery || '')}${b.style ? ' · ' + escapeHtml(b.style) : ''}</span>
      </div>
    `).join('')
    dropdown.classList.remove('hidden')

    dropdown.querySelectorAll('.ac-item').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault() // prevent blur before click
        const beer = matches.find(b => String(b.id) === el.dataset.id)
        if (!beer) return
        document.getElementById('field-name').value = beer.name
        document.getElementById('field-brewery').value = beer.brewery || ''
        document.getElementById('field-style').value = beer.style || ''
        _prefill.retailPrice = beer.retailPrice || null
        dropdown.classList.add('hidden')
      })
    })
  })

  input.addEventListener('blur', () => {
    setTimeout(() => dropdown.classList.add('hidden'), 150)
  })
}
