<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="8">
        <v-card class="mb-4">
  <v-card-title class="d-flex justify-space-between align-center">
    <!-- bloco da esquerda: título + chips -->
    <div class="d-flex align-center text-h5">
      Sala de Jogo

      <v-chip
        color="primary"
        class="ml-2"
        v-if="gameState === 'waiting'"
      >
        Aguardando início...
      </v-chip>
      <v-chip
        color="warning"
        class="ml-2"
        v-if="gameState === 'countdown'"
      >
        Preparando...
      </v-chip>
      <v-chip
        color="success"
        class="ml-2"
        v-else-if="gameState === 'playing'"
      >
        Jogando!
      </v-chip>
      <v-chip
        color="error"
        class="ml-2"
        v-else-if="gameState === 'ended'"
      >
        Jogo Finalizado
      </v-chip>
    </div>

    <!-- bloco da direita: ícone de ranking -->
    <v-btn
      v-if="gameState !== 'waiting'"
      icon
      color="primary"
      @click="showRanking = true"
    >
      <v-icon>mdi-trophy</v-icon>
    </v-btn>
  </v-card-title>

          <v-card-text>
            <div v-if="gameState === 'waiting'" class="text-center">
              <div v-if="isHost" class="text-h5 mb-4 text-primary">
                Você é o Host
              </div>
              <div v-else class="text-h5 mb-4 text-secondary">
                Aguarde o host iniciar o jogo
              </div>
              <v-btn
                color="primary"
                @click="startGame"
                :disabled="!isHost"
              >
                Iniciar Jogo
              </v-btn>
            </div>

            <div v-else-if="gameState === 'countdown'" class="text-center">
              <div class="text-h2">{{ countdown }}</div>
            </div>

            <div v-else-if="gameState === 'playing'" class="text-center">
              <div class="text-h4 mb-4">
                Palavra Cifrada: {{ currentChallenge.encrypted }}
              </div>
              <div class="text-h6 mb-4">
                Deslocamento: {{ currentChallenge.shift }}
              </div>
              <v-text-field
                v-model="userAnswer"
                label="Sua resposta"
                @keyup.enter="submitAnswer"
                :disabled="hasAnswered"
              ></v-text-field>
              <v-btn
                color="primary"
                @click="submitAnswer"
                :disabled="hasAnswered"
                class="mr-2"
              >
                Enviar Resposta
              </v-btn>
              <v-btn
                v-if="isHost"
                color="error"
                @click="endGame"
                class="ml-2"
              >
                Terminar Jogo
              </v-btn>
              <div class="text-h2 mt-4">{{ timeLeft }}s</div>
            </div>

            <div v-else-if="gameState === 'ended'" class="text-center">
              <div class="text-h4 mb-4">Jogo Finalizado</div>
              <v-btn
                v-if="isHost"
                color="primary"
                @click="startGame"
              >
                Iniciar Novo Jogo
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card v-if="gameState === 'waiting'">
          <v-card-title>Ranking</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item
                v-for="player in sortedPlayers"
                :key="player.id"
                :class="{ 'highlight-player': player.id === currentPlayer.id }"
              >
                <v-list-item-title>
                  {{ player.username }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  Pontos: {{ player.score }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <CaesarWheel v-if="gameState === 'playing'" class="mt-4" />
      </v-col>
    </v-row>

    <!-- Ranking Modal -->
    <v-dialog v-model="showRanking" max-width="500">
      <v-card>
        <v-card-title class="text-h5">
          Ranking
          <v-spacer></v-spacer>
          <v-btn icon @click="showRanking = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item
              v-for="player in sortedPlayers"
              :key="player.id"
              :class="{ 'highlight-player': player.id === currentPlayer.id }"
            >
              <v-list-item-title>
                {{ player.username }}
              </v-list-item-title>
              <v-list-item-subtitle>
                Pontos: {{ player.score }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { encrypt, decrypt, generateRandomShift, generateRandomWord } from '~/utils/caesarCipher'
import { FIXED_HOST_ID, GAME_SETTINGS, DIFFICULTY_SETTINGS } from '~/server/config'
import { getCachedGameState, getCachedPlayers, invalidateCache, startRateLimitCleanup } from '~/server/cache'
import { handleDisconnect, handleReconnect, handleError, startInactivePlayersCheck } from '~/server/reconnection'
import { useSupabaseClient } from '#imports'

const props = defineProps({
  currentPlayer: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['game-state-change'])

const supabase = useSupabaseClient()

const gameState = ref('waiting')
const countdown = ref(0)
const timeLeft = ref(DIFFICULTY_SETTINGS[GAME_SETTINGS.difficulty].timeLimit)
const userAnswer = ref('')
const hasAnswered = ref(false)
const players = ref([])
const currentChallenge = ref(null)
const currentHostId = ref(null)
const answeredChallenges = ref(new Set())
const isHost = computed(() => props.currentPlayer.id === currentHostId.value)
const gameInterval = ref(null)
const timerInterval = ref(null)
const autoGameInterval = ref(null)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 3
const showRanking = ref(false)

const sortedPlayers = computed(() => {
  return [...players.value].sort((a, b) => b.score - a.score)
})

onMounted(async () => {
  try {
    // Iniciar verificadores apenas no cliente
    if (process.client) {
      startRateLimitCleanup()
      startInactivePlayersCheck()
    }

    // Carregar estado inicial do jogo
    const { data: initialGameState } = await supabase
      .from('game_state')
      .select('*')
      .single()

    if (initialGameState) {
      currentHostId.value = initialGameState.host_id
      gameState.value = initialGameState.state
    }

    // Subscribe to game state changes with reconnection handling
    const gameChannel = supabase
      .channel('game-state')
      .on('broadcast', { event: 'game-state' }, ({ payload }) => {
        handleGameStateUpdate(payload)
      })
      .on('disconnect', () => {
        handleDisconnect(props.currentPlayer.id, supabase)
      })
      .on('reconnect', async () => {
        const result = await handleReconnect(props.currentPlayer.id, supabase)
        if (result.success) {
          reconnectAttempts.value = 0
          gameState.value = result.gameState.state
          players.value = result.players
          if (result.gameState.challenge) {
            currentChallenge.value = result.gameState.challenge
          }
        } else if (reconnectAttempts.value < maxReconnectAttempts) {
          reconnectAttempts.value++
          setTimeout(() => {
            gameChannel.subscribe()
          }, 1000 * reconnectAttempts.value)
        }
      })
      .subscribe()

    // Subscribe to player updates with cache
    const playersChannel = supabase
      .channel('players')
      .on('broadcast', { event: 'player-update' }, ({ payload }) => {
        handlePlayerUpdate(payload)
      })
      .subscribe()

    // Load initial data with cache
    const [initialPlayers, currentGameState] = await Promise.all([
      getCachedPlayers(supabase),
      getCachedGameState(supabase)
    ])

    players.value = initialPlayers || []
    
    if (currentGameState) {
      gameState.value = currentGameState.state
      if (currentGameState.challenge) {
        currentChallenge.value = currentGameState.challenge
      }
      if (currentGameState.time_left) {
        timeLeft.value = currentGameState.time_left
      }
    }

    // Carregar desafios já respondidos do banco de dados
    const { data: playerData } = await supabase
      .from('players')
      .select('answered_challenges')
      .eq('id', props.currentPlayer.id)
      .single()

    if (playerData && playerData.answered_challenges) {
      answeredChallenges.value = new Set(playerData.answered_challenges)
      // Verifica se o desafio atual já foi respondido
      if (currentChallenge.value) {
        hasAnswered.value = answeredChallenges.value.has(currentChallenge.value.encrypted)
      }
    }
  } catch (error) {
    const result = await handleError(error, supabase)
    if (result.success) {
      gameState.value = result.gameState.state
    } else {
      console.error('Failed to initialize game:', result.error)
    }
  }
})

const handleGameStateUpdate = async (payload) => {
  try {
    gameState.value = payload.state
    emit('game-state-change', payload.state)
    
    // Update cache
    await supabase
      .from('game_state')
      .upsert({
        id: 1,
        state: payload.state,
        time_left: payload.time_left || timeLeft.value,
        host_id: currentHostId.value
      })
    
    invalidateCache('game_state')

    // Atualizar host_id se fornecido
    if (payload.host_id) {
      currentHostId.value = payload.host_id
    }

    if (payload.state === 'countdown') {
      countdown.value = payload.countdown
    } else if (payload.state === 'playing') {
      // Busca o desafio atual do banco de dados
      const { data: gameStateData } = await supabase
        .from('game_state')
        .select('challenge, time_left')
        .single()
      
      if (gameStateData) {
        if (gameStateData.challenge) {
          // Só limpa a resposta se for um novo desafio
          if (!currentChallenge.value || currentChallenge.value.encrypted !== gameStateData.challenge.encrypted) {
            currentChallenge.value = gameStateData.challenge
            userAnswer.value = ''
            // Reset hasAnswered for new challenge
            hasAnswered.value = answeredChallenges.value.has(gameStateData.challenge.encrypted)
          }
        }
        if (gameStateData.time_left) {
          timeLeft.value = gameStateData.time_left
        }
      }
      
      if (timerInterval.value) {
        clearInterval(timerInterval.value)
      }

      // Sincroniza o timer com o servidor a cada segundo
      timerInterval.value = setInterval(async () => {
        timeLeft.value--
        
        // Atualiza o tempo no banco de dados
        await supabase
          .from('game_state')
          .update({ time_left: timeLeft.value })
          .eq('id', 1)

        // Broadcast para todos os clientes
        await supabase
          .channel('game-state')
          .send({
            type: 'broadcast',
            event: 'game-state',
            payload: {
              state: 'playing',
              time_left: timeLeft.value
            }
          })

        if (timeLeft.value <= 0) {
          clearInterval(timerInterval.value)
          await startNewRound()
        }
      }, 1000)
    }
  } catch (error) {
    handleError(error, supabase)
  }
}

const handlePlayerUpdate = async (payload) => {
  try {
    if (payload.players) {
      // Se receber a lista completa de jogadores, atualiza diretamente
      players.value = payload.players
    } else {
      // Se receber apenas um jogador, busca a lista atualizada
      const { data: updatedPlayers } = await supabase
        .from('players')
        .select('*')
        .order('score', { ascending: false })
      
      if (updatedPlayers) {
        players.value = updatedPlayers
        invalidateCache('players')
      }
    }
  } catch (error) {
    handleError(error, supabase)
  }
}

const endRound = async () => {
  // Instead of ending the game, start a new round
  await startNewRound()
}

const startNewRound = async () => {
  try {
    // Gera novo desafio automaticamente
    const shift = generateRandomShift()
    const word = await generateRandomWord()
    const challenge = {
      encrypted: encrypt(word, shift),
      shift: shift
    }

    // Atualiza o estado do jogo com o novo desafio
    await supabase
      .from('game_state')
      .update({
        challenge: challenge,
        state: 'countdown',
        time_left: DIFFICULTY_SETTINGS[GAME_SETTINGS.difficulty].timeLimit
      })
      .eq('id', 1)

    // Iniciar contador regressivo de 3 segundos
    countdown.value = 3
    await supabase
      .channel('game-state')
      .send({
        type: 'broadcast',
        event: 'game-state',
        payload: {
          state: 'countdown',
          countdown: countdown.value
        }
      })

    // Atualizar o contador a cada segundo
    const countdownInterval = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(countdownInterval)
        // Iniciar a rodada após o contador chegar a 0
        supabase
          .channel('game-state')
          .send({
            type: 'broadcast',
            event: 'game-state',
            payload: {
              state: 'playing',
              time_left: DIFFICULTY_SETTINGS[GAME_SETTINGS.difficulty].timeLimit
            }
          })
      } else {
        // Atualizar o contador para todos os jogadores
        supabase
          .channel('game-state')
          .send({
            type: 'broadcast',
            event: 'game-state',
            payload: {
              state: 'countdown',
              countdown: countdown.value
            }
          })
      }
    }, 1000)
  } catch (error) {
    console.error('Error starting new round:', error)
    handleError(error, supabase)
  }
}

const submitAnswer = async () => {
  if (hasAnswered.value) return

  const isCorrect = userAnswer.value.toLowerCase() === 
    decrypt(currentChallenge.value.encrypted, currentChallenge.value.shift).toLowerCase()

  hasAnswered.value = true
  answeredChallenges.value.add(currentChallenge.value.encrypted)

  if (isCorrect) {
    // Primeiro busca o score atual do jogador
    const { data: currentPlayerData } = await supabase
      .from('players')
      .select('score')
      .eq('id', props.currentPlayer.id)
      .single()

    if (!currentPlayerData) {
      console.error('Erro ao buscar score atual do jogador')
      return
    }

    const newScore = currentPlayerData.score + 10

    // Atualiza o score no banco de dados usando o score atual
    const { error } = await supabase
      .from('players')
      .update({ 
        score: newScore,
        last_active: new Date().toISOString()
      })
      .eq('id', props.currentPlayer.id)

    if (error) {
      console.error('Erro ao atualizar score:', error)
      return
    }

    // Busca a lista atualizada de jogadores
    const { data: updatedPlayers } = await supabase
      .from('players')
      .select('*')
      .order('score', { ascending: false })

    if (updatedPlayers) {
      players.value = updatedPlayers
    }

    // Depois faz o broadcast para atualizar os outros jogadores
    await supabase
      .channel('players')
      .send({
        type: 'broadcast',
        event: 'player-update',
        payload: {
          players: updatedPlayers
        }
      })
  }
}

const startGame = async () => {
  if (!isHost.value) return

  // Inicia o sistema automático de jogo
  await supabase
    .channel('game-state')
    .send({
      type: 'broadcast',
      event: 'game-state',
      payload: {
        state: 'playing',
        host_id: currentHostId.value
      }
    })

  // Inicia o sistema automático de rodadas
  startAutoGame()
}

const startAutoGame = () => {
  console.log('Auto game system initialized')
}

const endGame = async () => {
  if (!isHost.value) return

  // Para o sistema automático
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }

  // Atualiza o estado do jogo
  await supabase
    .channel('game-state')
    .send({
      type: 'broadcast',
      event: 'game-state',
      payload: {
        state: 'ended',
        host_id: currentHostId.value
      }
    })

  // Reseta o estado do jogo no banco
  await supabase
    .from('game_state')
    .update({
      state: 'ended',
      challenge: null,
      time_left: null
    })
    .eq('id', 1)
}

onUnmounted(() => {
  if (gameInterval.value) {
    clearInterval(gameInterval.value)
  }
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
  supabase.removeAllChannels()
})
</script>

<style scoped>
.highlight-player {
  background-color: rgba(var(--v-theme-primary), 0.1);
}
</style>