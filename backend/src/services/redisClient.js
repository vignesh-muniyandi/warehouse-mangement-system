const Redis = require('ioredis');

let redis;

// Try to connect to Redis; fall back to in-memory store if unavailable
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  
  redis.on('error', (err) => {
    // Silently use fallback on error
    redis = createMemoryFallback();
  });

  // Test connection immediately
  redis.ping().catch(() => {
    redis = createMemoryFallback();
  });
} catch (err) {
  redis = createMemoryFallback();
}

// In-memory fallback store for development
function createMemoryFallback() {
  const store = new Map();
  const expirations = new Map();

  return {
    get: async (key) => store.get(key) || null,
    set: async (key, value, mode, ttl) => {
      store.set(key, value);
      if (mode === 'EX' && ttl) {
        const expiryTime = Date.now() + ttl * 1000;
        expirations.set(key, expiryTime);
        setTimeout(() => {
          store.delete(key);
          expirations.delete(key);
        }, ttl * 1000);
      }
      return 'OK';
    },
    del: async (key) => {
      store.delete(key);
      expirations.delete(key);
      return 1;
    },
    incr: async (key) => {
      const current = parseInt(store.get(key) || '0', 10);
      const newVal = current + 1;
      store.set(key, newVal.toString());
      return newVal;
    },
    expire: async (key, seconds) => {
      if (!store.has(key)) return 0;
      const expiryTime = Date.now() + seconds * 1000;
      expirations.set(key, expiryTime);
      setTimeout(() => {
        store.delete(key);
        expirations.delete(key);
      }, seconds * 1000);
      return 1;
    },
    ping: async () => 'PONG',
    on: () => {}, // no-op
  };
}

module.exports = redis;
