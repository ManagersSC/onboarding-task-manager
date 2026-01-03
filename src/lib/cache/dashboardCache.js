// Simple in-memory cache with TTL
const store = new Map()

export function getCached(key) {
  const entry = store.get(key)
  if (!entry) return null
  const now = Date.now()
  if (entry.expiresAt && entry.expiresAt <= now) {
    store.delete(key)
    return null
  }
  return entry.value
}

export function setCached(key, value, ttlMs = 60000) {
  const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : 0
  store.set(key, { value, expiresAt })
}


