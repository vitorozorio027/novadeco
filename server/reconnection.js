import { GAME_SETTINGS } from './config'
import { clearAllCache } from './cache'

class ReconnectionManager {
  constructor() {
    this.reconnectingPlayers = new Map()
  }

  addPlayer(playerId) {
    this.reconnectingPlayers.set(playerId, {
      timestamp: Date.now(),
      attempts: 0
    })
  }

  removePlayer(playerId) {
    this.reconnectingPlayers.delete(playerId)
  }

  isReconnecting(playerId) {
    return this.reconnectingPlayers.has(playerId)
  }

  incrementAttempts(playerId) {
    const player = this.reconnectingPlayers.get(playerId)
    if (player) {
      player.attempts++
      player.timestamp = Date.now()
      this.reconnectingPlayers.set(playerId, player)
    }
  }

  cleanup() {
    const now = Date.now()
    for (const [playerId, data] of this.reconnectingPlayers.entries()) {
      if (now - data.timestamp > GAME_SETTINGS.reconnectTimeout) {
        this.reconnectingPlayers.delete(playerId)
      }
    }
  }
}

const reconnectionManager = new ReconnectionManager()

export const handleDisconnect = async (playerId, supabase) => {
  reconnectionManager.addPlayer(playerId)
  
  // Atualiza o status do jogador
  await supabase
    .from('players')
    .update({ last_active: new Date().toISOString() })
    .eq('id', playerId)
}

export const handleReconnect = async (playerId, supabase) => {
  if (reconnectionManager.isReconnecting(playerId)) {
    reconnectionManager.incrementAttempts(playerId)
    
    // Recupera o estado do jogo
    const gameState = await getCachedGameState(supabase)
    const players = await getCachedPlayers(supabase)
    
    reconnectionManager.removePlayer(playerId)
    
    return {
      success: true,
      gameState,
      players
    }
  }
  
  return {
    success: false,
    error: 'Player not in reconnection state'
  }
}

export const handleError = async (error, supabase) => {
  console.error('Game error:', error)
  
  // Limpa o cache em caso de erro
  clearAllCache()
  
  // Tenta recuperar o estado do jogo
  try {
    const gameState = await getCachedGameState(supabase)
    if (gameState) {
      return {
        success: true,
        gameState
      }
    }
  } catch (e) {
    console.error('Error recovering game state:', e)
  }
  
  return {
    success: false,
    error: 'Failed to recover game state'
  }
}

// Função para verificar jogadores inativos
export const checkInactivePlayers = async (supabase) => {
  const now = new Date()
  const inactiveTime = new Date(now.getTime() - GAME_SETTINGS.maxInactiveTime)
  
  const { data: inactivePlayers } = await supabase
    .from('players')
    .select('id')
    .lt('last_active', inactiveTime.toISOString())
  
  if (inactivePlayers && inactivePlayers.length > 0) {
    // Remove jogadores inativos
    await supabase
      .from('players')
      .delete()
      .in('id', inactivePlayers.map(p => p.id))
    
    // Limpa o cache
    clearAllCache()
  }
}

// Função para iniciar o verificador de jogadores inativos
export const startInactivePlayersCheck = () => {
  if (process.client) {
    setInterval(() => {
      checkInactivePlayers(supabase)
    }, GAME_SETTINGS.cleanupInterval)
  }
} 