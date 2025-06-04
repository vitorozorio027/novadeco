import { GAME_SETTINGS, CACHE_KEYS } from './config'

class Cache {
  constructor() {
    this.cache = new Map()
    this.ttl = new Map()
  }

  set(key, value, ttl = GAME_SETTINGS.cacheTTL) {
    this.cache.set(key, value)
    this.ttl.set(key, Date.now() + (ttl * 1000))
  }

  get(key) {
    if (!this.cache.has(key)) return null
    
    if (Date.now() > this.ttl.get(key)) {
      this.cache.delete(key)
      this.ttl.delete(key)
      return null
    }
    
    return this.cache.get(key)
  }

  delete(key) {
    this.cache.delete(key)
    this.ttl.delete(key)
  }

  clear() {
    this.cache.clear()
    this.ttl.clear()
  }
}

// Cache singleton
const cache = new Cache()

// Funções auxiliares para cache
export const getCachedGameState = async (supabase) => {
  const cached = cache.get(CACHE_KEYS.GAME_STATE)
  if (cached) return cached

  const { data } = await supabase
    .from('game_state')
    .select('*')
    .single()

  if (data) {
    cache.set(CACHE_KEYS.GAME_STATE, data)
  }
  return data
}

export const getCachedPlayers = async (supabase) => {
  const cached = cache.get(CACHE_KEYS.PLAYERS)
  if (cached) return cached

  const { data } = await supabase
    .from('players')
    .select('*')
    .order('score', { ascending: false })

  if (data) {
    cache.set(CACHE_KEYS.PLAYERS, data)
  }
  return data
}

export const invalidateCache = (key) => {
  cache.delete(key)
}

export const clearAllCache = () => {
  cache.clear()
}

// Middleware para rate limiting
export const rateLimiter = new Map()

export const checkRateLimit = (userId) => {
  const now = Date.now()
  const userLimit = rateLimiter.get(userId) || { count: 0, resetTime: now + GAME_SETTINGS.rateLimit.windowMs }

  if (now > userLimit.resetTime) {
    userLimit.count = 1
    userLimit.resetTime = now + GAME_SETTINGS.rateLimit.windowMs
  } else {
    userLimit.count++
  }

  rateLimiter.set(userId, userLimit)
  return userLimit.count <= GAME_SETTINGS.rateLimit.max
}

// Função para limpar rate limits antigos
export const startRateLimitCleanup = () => {
  if (process.client) {
    setInterval(() => {
      const now = Date.now()
      for (const [userId, limit] of rateLimiter.entries()) {
        if (now > limit.resetTime) {
          rateLimiter.delete(userId)
        }
      }
    }, GAME_SETTINGS.cleanupInterval)
  }
} 