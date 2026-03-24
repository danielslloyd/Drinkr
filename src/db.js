import { openDB } from 'idb'

const DB_NAME = 'drinkr-db'
const DB_VERSION = 1

let _db = null

async function getDB() {
  if (!_db) {
    _db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('checkins')) {
          const store = db.createObjectStore('checkins', { keyPath: 'id' })
          store.createIndex('date', 'date')
          store.createIndex('brewery', 'brewery')
          store.createIndex('style', 'style')
        }
        if (!db.objectStoreNames.contains('catalog')) {
          db.createObjectStore('catalog', { keyPath: 'id', autoIncrement: true })
        }
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' })
        }
      }
    })
  }
  return _db
}

// ── Check-ins ──────────────────────────────────────────────────────────────

export async function addCheckIn(checkin) {
  const db = await getDB()
  return db.add('checkins', checkin)
}

export async function updateCheckIn(checkin) {
  const db = await getDB()
  return db.put('checkins', checkin)
}

export async function deleteCheckIn(id) {
  const db = await getDB()
  return db.delete('checkins', id)
}

export async function getAllCheckIns() {
  const db = await getDB()
  const all = await db.getAll('checkins')
  return all.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export async function getCheckInsForDate(dateStr) {
  const db = await getDB()
  const all = await db.getAll('checkins')
  return all.filter(c => c.date.startsWith(dateStr))
}

// ── Catalog ────────────────────────────────────────────────────────────────

export async function setCatalog(beers) {
  const db = await getDB()
  const tx = db.transaction('catalog', 'readwrite')
  await tx.store.clear()
  for (const beer of beers) {
    // Strip existing id so IndexedDB auto-assigns one
    const { id: _id, ...beerData } = beer
    await tx.store.add(beerData)
  }
  await tx.done
}

export async function getCatalog() {
  const db = await getDB()
  return db.getAll('catalog')
}

// ── Config ─────────────────────────────────────────────────────────────────

export async function getConfig(key) {
  const db = await getDB()
  const record = await db.get('config', key)
  return record ? record.value : null
}

export async function setConfig(key, value) {
  const db = await getDB()
  return db.put('config', { key, value })
}

// ── Bulk operations ────────────────────────────────────────────────────────

export async function clearAllData() {
  const db = await getDB()
  const tx = db.transaction(['checkins', 'catalog', 'config'], 'readwrite')
  await tx.objectStore('checkins').clear()
  await tx.objectStore('catalog').clear()
  await tx.objectStore('config').clear()
  await tx.done
}
