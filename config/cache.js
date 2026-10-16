/**
 * In-Memory Fast Cache with Event-Based Invalidation
 * Designed for public endpoints (bootstrap, settings, categories, stats).
 * Microsecond latency, zero external dependencies, thread-safe for Node.js event loop.
 */

class FastMemoryCache {
  constructor(defaultTtlMs = 10 * 60 * 1000) { // 10 minutes default TTL
    this.store = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now()
    });
    return value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.store.delete(key);
  }

  invalidateGroup(prefix) {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  invalidateAll() {
    const count = this.store.size;
    this.store.clear();
    return count;
  }

  stats() {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }
}

const cache = new FastMemoryCache();

module.exports = cache;
