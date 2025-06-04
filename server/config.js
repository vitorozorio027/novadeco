export const FIXED_HOST_ID = process.env.FIXED_HOST_ID || '00000000-0000-0000-0000-000000000000'

export const GAME_SETTINGS = {
  timeLimit: 30,
  minPlayers: 2,
  maxPlayers: 50,
  difficulty: 'medium',
  reconnectTimeout: 30000, // 30 segundos
  cleanupInterval: 60000, // 1 minuto
  maxInactiveTime: 300000, // 5 minutos
  cacheTTL: 60, // 60 segundos
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // limite de 100 requisições por janela
  }
}

export const CACHE_KEYS = {
  GAME_STATE: 'game_state',
  PLAYERS: 'players',
  RANKING: 'ranking'
}

export const DIFFICULTY_SETTINGS = {
  easy: {
    minShift: 1,
    maxShift: 5,
    timeLimit: 45
  },
  medium: {
    minShift: 1,
    maxShift: 13,
    timeLimit: 30
  },
  hard: {
    minShift: 1,
    maxShift: 25,
    timeLimit: 20
  }
} 