<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="8">
        <v-card class="mb-4">
  <v-card-title class="d-flex justify-space-between align-center">
    <!-- bloco da esquerda: título + chips -->
    <div class="d-flex align-center text-h5">
      <v-icon class="mr-2">mdi-gamepad-variant</v-icon>
      Sala de Jogo

      <v-chip
        color="primary"
        class="ml-2"
        v-if="gameState === 'waiting'"
      >
        <v-icon start>mdi-clock-outline</v-icon>
        Aguardando início...
      </v-chip>
      <v-chip
        color="warning"
        class="ml-2"
        v-if="gameState === 'countdown'"
      >
        <v-icon start>mdi-timer-outline</v-icon>
        Preparando...
      </v-chip>
      <v-chip
        color="success"
        class="ml-2"
        v-else-if="gameState === 'playing'"
      >
        <v-icon start>mdi-play-circle-outline</v-icon>
        Jogando!
      </v-chip>
      <v-chip
        color="error"
        class="ml-2"
        v-else-if="gameState === 'ended'"
      >
        <v-icon start>mdi-flag-checkered</v-icon>
        Jogo Finalizado
      </v-chip>
    </div>

    <!-- bloco da direita: ícone de ranking e modo automático -->
    <div class="d-flex align-center">
      <v-chip
        v-if="isAutoGameEnabled"
        color="info"
        class="mr-2"
      >
        <v-icon start>mdi-robot</v-icon>
        Modo Automático
      </v-chip>
      <v-btn
        v-if="gameState !== 'waiting'"
        icon
        color="primary"
        @click="showRanking = true"
        class="ranking-btn"
      >
        <v-icon>mdi-trophy</v-icon>
        <v-tooltip activator="parent" location="left">
          Ver Ranking
        </v-tooltip>
      </v-btn>
    </div>
  </v-card-title>

          <v-card-text>
            <div v-if="gameState === 'waiting'" class="text-center">
              <div v-if="isHost" class="text-h5 mb-4 text-primary d-flex align-center justify-center">
                <v-icon class="mr-2">mdi-crown</v-icon>
                Você é o Host
              </div>
              <div v-else class="text-h5 mb-4 text-secondary d-flex align-center justify-center">
                <v-icon class="mr-2">mdi-account-group</v-icon>
                Aguarde o host iniciar o jogo
              </div>
              <v-btn
                color="primary"
                @click="startGame"
                :disabled="!isHost"
                class="start-btn"
              >
                <v-icon start>mdi-play</v-icon>
                Iniciar Jogo
              </v-btn>
            </div>

            <div v-else-if="gameState === 'countdown'" class="text-center">
              <div class="countdown-container">
                <div class="text-h2 countdown-animation">{{ countdown }}</div>
                <div class="text-subtitle-1 mt-2">Prepare-se!</div>
              </div>
            </div>

            <div v-else-if="gameState === 'playing'" class="text-center">
              <div class="text-h4 mb-4 d-flex align-center justify-center">
                <v-icon class="mr-2">mdi-key-variant</v-icon>
                Palavra Cifrada: {{ currentChallenge.encrypted }}
              </div>
              <div class="text-h6 mb-4 d-flex align-center justify-center">
                <v-icon class="mr-2">mdi-numeric</v-icon>
                Deslocamento: {{ currentChallenge.shift }}
              </div>
              <v-text-field
                v-model="userAnswer"
                label="Sua resposta"
                @keyup.enter="submitAnswer"
                :disabled="hasAnswered"
                class="answer-input"
                :class="{ 'correct-answer': hasAnswered && isCorrect, 'wrong-answer': hasAnswered && !isCorrect }"
              ></v-text-field>
              <div class="d-flex justify-center">
                <v-btn
                  color="primary"
                  @click="submitAnswer"
                  :disabled="hasAnswered"
                  class="mr-2 submit-btn"
                >
                  <v-icon start>mdi-send</v-icon>
                  Enviar Resposta
                </v-btn>
                <v-btn
                  v-if="isHost"
                  color="error"
                  @click="endGame"
                  class="ml-2"
                >
                  <v-icon start>mdi-stop-circle</v-icon>
                  Terminar Jogo
                </v-btn>
              </div>
              <div class="timer-container mt-4">
                <v-icon 
                  :class="{ 'timer-warning': timeLeft <= 10 }"
                  class="mr-2"
                >
                  {{ timeLeft <= 10 ? 'mdi-timer-alert' : 'mdi-timer' }}
                </v-icon>
                <span 
                  class="text-h2 timer-animation"
                  :class="{ 'timer-warning': timeLeft <= 10 }"
                >
                  {{ timeLeft }}s
                </span>
                <v-tooltip
                  v-if="timeLeft <= 10"
                  location="top"
                  activator="parent"
                >
                  Tempo acabando!
                </v-tooltip>
              </div>
            </div>

            <div v-else-if="gameState === 'ended'" class="text-center">
              <div class="text-h4 mb-4 d-flex align-center justify-center">
                <v-icon class="mr-2">mdi-flag-checkered</v-icon>
                Jogo Finalizado
              </div>
              <v-btn
                v-if="isHost"
                color="primary"
                @click="startGame"
                class="restart-btn"
              >
                <v-icon start>mdi-refresh</v-icon>
                Iniciar Novo Jogo
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card v-if="gameState === 'waiting'">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-trophy</v-icon>
            Ranking
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item
                v-for="(player, index) in sortedPlayers"
                :key="player.id"
                :class="{ 
                  'highlight-player': player.id === currentPlayer.id,
                  'ranking-item': true,
                  'top-three': index < 3,
                  'inactive-player': isPlayerInactive(player),
                  'first-place': index === 0
                }"
              >
                <template v-slot:prepend>
                  <div class="rank-icon">
                    <v-icon v-if="index === 0" color="amber" class="crown-icon">mdi-crown</v-icon>
                    <v-icon v-else-if="index === 1" color="grey">mdi-medal</v-icon>
                    <v-icon v-else-if="index === 2" color="brown">mdi-medal</v-icon>
                    <span v-else class="rank-number">{{ index + 1 }}</span>
                  </div>
                </template>
                <v-list-item-title class="d-flex align-center">
                  {{ player.username }}
                  <v-chip
                    v-if="player.id === currentPlayer.id"
                    color="primary"
                    size="small"
                    class="ml-2"
                  >
                    Você
                  </v-chip>
                  <v-chip
                    v-if="isPlayerInactive(player)"
                    color="grey"
                    size="small"
                    class="ml-2"
                  >
                    <v-icon start size="small">mdi-clock-outline</v-icon>
                    Inativo
                  </v-chip>
                  <v-chip
                    v-if="index === 0"
                    color="amber"
                    size="small"
                    class="ml-2 first-place-chip"
                  >
                    <v-icon start size="small">mdi-trophy</v-icon>
                    Líder
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle class="d-flex align-center">
                  <v-icon size="small" class="mr-1">mdi-star</v-icon>
                  <span class="score-value" :class="{ 'score-updated': player.score > player.previousScore }">
                    {{ player.score }} pontos
                  </span>
                  <v-chip
                    v-if="player.current_streak > 2"
                    color="success"
                    size="small"
                    class="ml-2 streak-chip"
                  >
                    <v-icon start size="small">mdi-fire</v-icon>
                    {{ player.current_streak }}x
                  </v-chip>
                  <v-chip
                    v-if="player.losing_streak > 2"
                    color="error"
                    size="small"
                    class="ml-2 losing-streak-chip"
                  >
                    <v-icon start size="small">mdi-emoticon-sad</v-icon>
                    {{ player.losing_streak }}x
                  </v-chip>
                  <v-chip
                    v-if="player.quick_streak > 2"
                    color="info"
                    size="small"
                    class="ml-2 quick-streak-chip"
                  >
                    <v-icon start size="small">mdi-lightning-bolt</v-icon>
                    {{ player.quick_streak }}x
                  </v-chip>
                  <v-chip
                    v-if="player.perfect_streak > 2"
                    color="purple"
                    size="small"
                    class="ml-2 perfect-streak-chip"
                  >
                    <v-icon start size="small">mdi-star-shooting</v-icon>
                    {{ player.perfect_streak }}x
                  </v-chip>
                  <v-chip
                    v-if="player.combo_streak > 2"
                    color="deep-purple"
                    size="small"
                    class="ml-2 combo-streak-chip"
                  >
                    <v-icon start size="small">mdi-rocket-launch</v-icon>
                    {{ player.combo_streak }}x
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <CaesarWheel v-if="gameState === 'playing' || gameState === 'countdown'" class="mt-4" />
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

    <!-- Adiciona o componente de feedback -->
    <v-snackbar
      v-model="feedbackMessage.show"
      :color="feedbackMessage.type"
      :timeout="3000"
      location="top"
      class="feedback-snackbar"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">
          {{ feedbackMessage.type === 'success' ? 'mdi-check-circle' : feedbackMessage.type === 'error' ? 'mdi-close-circle' : 'mdi-info-circle' }}
        </v-icon>
        {{ feedbackMessage.message }}
      </div>
    </v-snackbar>

    <!-- Adiciona o componente de status de conexão -->
    <v-snackbar
      v-model="connectionStatus.show"
      :color="connectionStatus.type"
      :timeout="connectionStatus.timeout"
      location="bottom"
      class="connection-snackbar"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">
          {{ connectionStatus.icon }}
        </v-icon>
        {{ connectionStatus.message }}
      </div>
      <template v-slot:actions>
        <v-btn
          v-if="connectionStatus.type === 'error'"
          color="white"
          variant="text"
          @click="attemptReconnect"
        >
          Reconectar
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Adiciona aviso de fim de jogo -->
    <v-dialog
      v-model="showGameEndWarning"
      max-width="400"
      persistent
    >
      <v-card>
        <v-card-title class="text-h5 d-flex align-center">
          <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
          Jogo Finalizando
        </v-card-title>
        <v-card-text>
          <div class="text-center">
            <div class="text-h6 mb-4">O jogo está prestes a terminar!</div>
            <div class="text-body-1">
              Última chance de marcar pontos!
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            @click="showGameEndWarning = false"
          >
            Entendi
          </v-btn>
        </v-card-actions>
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

// Adiciona variável para controle do modo automático
const isAutoGameEnabled = ref(false)

// Adiciona variável para controle do aviso de fim de jogo
const showGameEndWarning = ref(false)

// Adiciona variável para controle do tempo de resposta
const answerStartTime = ref(null)

const sortedPlayers = computed(() => {
  return [...players.value].sort((a, b) => b.score - a.score)
})

// Adiciona a variável de status de conexão
const connectionStatus = ref({
  show: false,
  type: '',
  message: '',
  icon: '',
  timeout: 0
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
      
      // Se o jogo já estiver em andamento, carregar o desafio atual
      if (initialGameState.state === 'playing' && initialGameState.challenge) {
        currentChallenge.value = initialGameState.challenge
        timeLeft.value = initialGameState.time_left || DIFFICULTY_SETTINGS[GAME_SETTINGS.difficulty].timeLimit
        
        // Verificar se o jogador já respondeu ao desafio atual
        const { data: playerData } = await supabase
          .from('players')
          .select('answered_challenges')
          .eq('id', props.currentPlayer.id)
          .single()

        if (playerData && playerData.answered_challenges) {
          answeredChallenges.value = new Set(playerData.answered_challenges)
          hasAnswered.value = answeredChallenges.value.has(currentChallenge.value.encrypted)
        }
      }
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
          connectionStatus.value = {
            show: true,
            type: 'success',
            message: 'Reconectado com sucesso!',
            icon: 'mdi-wifi-strength-4',
            timeout: 3000
          }
          reconnectAttempts.value = 0
          gameState.value = result.gameState.state
          players.value = result.players
          if (result.gameState.challenge) {
            currentChallenge.value = result.gameState.challenge
          }
        } else if (reconnectAttempts.value < maxReconnectAttempts) {
          connectionStatus.value = {
            show: true,
            type: 'error',
            message: `Falha na reconexão. Tentativa ${reconnectAttempts.value + 1} de ${maxReconnectAttempts}`,
            icon: 'mdi-wifi-strength-1-alert',
            timeout: 0
          }
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
    // Se o estado mudou, limpa qualquer timer existente
    if (gameState.value !== payload.state) {
      if (timerInterval.value) {
        clearInterval(timerInterval.value)
        timerInterval.value = null
      }
    }

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
      countdown.value = Math.max(0, payload.countdown)
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
            // Inicia o tempo para o novo desafio
            answerStartTime.value = Date.now()
          }
        }
        if (gameStateData.time_left) {
          timeLeft.value = Math.max(0, gameStateData.time_left)
        }
      }
      
      // Limpa qualquer timer existente antes de criar um novo
      if (timerInterval.value) {
        clearInterval(timerInterval.value)
        timerInterval.value = null
      }

      // Sincroniza o timer com o servidor a cada segundo
      timerInterval.value = setInterval(async () => {
        if (timeLeft.value <= 0) {
          clearInterval(timerInterval.value)
          timerInterval.value = null
          await startNewRound()
          return
        }

        timeLeft.value = Math.max(0, timeLeft.value - 1)
      
        
        // Atualiza o tempo no banco de dados
        await supabase
          .from('game_state')
          .update({ time_left: timeLeft.value })
          .eq('id', 1)

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
    // Limpa qualquer timer existente
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
      timerInterval.value = null
    }

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
    
    // Atualiza o estado inicial do countdown
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

    // Função para atualizar o countdown
    const updateCountdown = async () => {
      if (countdown.value <= 0) {
        clearInterval(countdownInterval)
        return
      }

      countdown.value = Math.max(0, countdown.value - 1)
      
      // Atualiza o estado do jogo no banco
      await supabase
        .from('game_state')
        .update({
          state: 'countdown',
          time_left: countdown.value
        })
        .eq('id', 1)

      // Broadcast para todos os clientes
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

      if (countdown.value === 0) {
        // Limpa o intervalo
        clearInterval(countdownInterval)
        
        // Atualiza o estado para playing
        await supabase
          .from('game_state')
          .update({
            state: 'playing',
            time_left: DIFFICULTY_SETTINGS[GAME_SETTINGS.difficulty].timeLimit
          })
          .eq('id', 1)

        // Notifica todos os clientes
        await supabase
          .channel('game-state')
          .send({
            type: 'broadcast',
            event: 'game-state',
            payload: {
              state: 'playing',
              time_left: DIFFICULTY_SETTINGS[GAME_SETTINGS.difficulty].timeLimit
            }
          })
      }
    }

    // Inicia o intervalo de countdown
    const countdownInterval = setInterval(updateCountdown, 1000)
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

  // Calcula o tempo de resposta
  const answerTime = Date.now() - answerStartTime.value
  const isQuickAnswer = answerTime < 5000 // 5 segundos

  // Adiciona feedback visual
  const feedback = {
    show: true,
    type: isCorrect ? 'success' : 'error',
    message: isCorrect ? 'Resposta correta! +10 pontos' : 'Resposta incorreta!'
  }
  feedbackMessage.value = feedback

  // Esconde o feedback após 3 segundos
  setTimeout(() => {
    feedbackMessage.value.show = false
  }, 3000)

  if (isCorrect) {
    // Primeiro busca o score atual do jogador
    const { data: currentPlayerData } = await supabase
      .from('players')
      .select('score, current_streak, highest_score, losing_streak, quick_streak, perfect_streak, combo_streak')
      .eq('id', props.currentPlayer.id)
      .single()

    if (!currentPlayerData) {
      console.error('Erro ao buscar score atual do jogador')
      return
    }

    const newScore = currentPlayerData.score + 10
    const newStreak = currentPlayerData.current_streak + 1
    const isNewHighScore = newScore > (currentPlayerData.highest_score || 0)
    const newQuickStreak = isQuickAnswer ? (currentPlayerData.quick_streak || 0) + 1 : 0
    const newPerfectStreak = (currentPlayerData.perfect_streak || 0) + 1
    const newComboStreak = (isQuickAnswer && newPerfectStreak > 2) ? (currentPlayerData.combo_streak || 0) + 1 : 0

    // Atualiza o score no banco de dados usando o score atual
    const { error } = await supabase
      .from('players')
      .update({ 
        score: newScore,
        current_streak: newStreak,
        best_streak: Math.max(currentPlayerData.best_streak || 0, newStreak),
        highest_score: Math.max(currentPlayerData.highest_score || 0, newScore),
        losing_streak: 0,
        quick_streak: newQuickStreak,
        perfect_streak: newPerfectStreak,
        combo_streak: newComboStreak,
        last_active: new Date().toISOString()
      })
      .eq('id', props.currentPlayer.id)

    if (error) {
      console.error('Erro ao atualizar score:', error)
      return
    }

    // Se atingiu uma nova sequência de vitórias, mostra feedback
    if (newStreak > 2) {
      feedbackMessage.value = {
        show: true,
        type: 'success',
        message: `Sequência de ${newStreak} vitórias! 🔥`
      }
    }

    // Se atingiu uma nova pontuação máxima, mostra feedback
    if (isNewHighScore) {
      setTimeout(() => {
        feedbackMessage.value = {
          show: true,
          type: 'success',
          message: `Nova pontuação máxima: ${newScore} pontos! 🏆`
        }
      }, 1000)
    }

    // Se atingiu uma sequência de respostas rápidas, mostra feedback
    if (newQuickStreak > 2) {
      setTimeout(() => {
        feedbackMessage.value = {
          show: true,
          type: 'info',
          message: `Sequência de ${newQuickStreak} respostas rápidas! ⚡`
        }
      }, 2000)
    }

    // Se atingiu uma sequência de respostas perfeitas, mostra feedback
    if (newPerfectStreak > 2) {
      setTimeout(() => {
        feedbackMessage.value = {
          show: true,
          type: 'purple',
          message: `Sequência de ${newPerfectStreak} respostas perfeitas! ✨`
        }
      }, 3000)
    }

    // Se atingiu uma sequência de combos, mostra feedback
    if (newComboStreak > 2) {
      setTimeout(() => {
        feedbackMessage.value = {
          show: true,
          type: 'deep-purple',
          message: `COMBO! ${newComboStreak}x respostas perfeitas e rápidas! 🚀`
        }
      }, 4000)
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
  } else {
    // Incrementa a sequência de derrotas
    const { data: currentPlayerData } = await supabase
      .from('players')
      .select('losing_streak')
      .eq('id', props.currentPlayer.id)
      .single()

    if (currentPlayerData) {
      const newLosingStreak = (currentPlayerData.losing_streak || 0) + 1

      // Atualiza a sequência de derrotas
      await supabase
        .from('players')
        .update({ 
          current_streak: 0,
          losing_streak: newLosingStreak,
          quick_streak: 0,
          perfect_streak: 0,
          combo_streak: 0,
          last_active: new Date().toISOString()
        })
        .eq('id', props.currentPlayer.id)

      // Se atingiu uma sequência de derrotas, mostra feedback
      if (newLosingStreak > 2) {
        feedbackMessage.value = {
          show: true,
          type: 'error',
          message: `Sequência de ${newLosingStreak} derrotas... Não desista! 💪`
        }
      }
    }
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
  isAutoGameEnabled.value = true
  
  // Mostra feedback do modo automático
  feedbackMessage.value = {
    show: true,
    type: 'info',
    message: 'Modo automático ativado - O jogo continuará automaticamente'
  }
}

const endGame = async () => {
  if (!isHost.value) return

  // Para o sistema automático
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }

  isAutoGameEnabled.value = false

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

// Adiciona função de reconexão manual
const attemptReconnect = async () => {
  if (reconnectAttempts.value < maxReconnectAttempts) {
    await handleReconnect(props.currentPlayer.id, supabase)
  }
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

// Adiciona a variável de feedback
const feedbackMessage = ref({
  show: false,
  type: '',
  message: ''
})

// Adiciona função para verificar se um jogador está inativo
const isPlayerInactive = (player) => {
  if (!player.last_active) return true
  
  const lastActive = new Date(player.last_active)
  const now = new Date()
  const inactiveTime = now - lastActive
  
  return inactiveTime > GAME_SETTINGS.maxInactiveTime
}

// Adiciona watch para detectar quando o jogador atinge o primeiro lugar
watch(() => sortedPlayers.value, (newPlayers) => {
  if (newPlayers.length > 0 && newPlayers[0].id === props.currentPlayer.id) {
    feedbackMessage.value = {
      show: true,
      type: 'success',
      message: 'Você está em primeiro lugar! 👑'
    }
  }
}, { deep: true })
</script>

<style scoped>
.highlight-player {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.countdown-animation {
  animation: pulse 1s infinite;
}

.timer-animation {
  animation: fade 1s infinite;
}

.correct-answer {
  border-color: var(--v-theme-success) !important;
}

.wrong-answer {
  border-color: var(--v-theme-error) !important;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

@keyframes fade {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.ranking-btn {
  transition: transform 0.2s;
}

.ranking-btn:hover {
  transform: scale(1.1);
}

.start-btn, .restart-btn {
  transition: all 0.3s;
}

.start-btn:hover, .restart-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.submit-btn {
  transition: all 0.2s;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.answer-input {
  transition: all 0.3s;
}

.answer-input:focus-within {
  transform: scale(1.02);
}

.ranking-item {
  transition: all 0.3s ease;
  border-radius: 8px;
  margin: 4px 0;
}

.ranking-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
  transform: translateX(4px);
}

.top-three {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.rank-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
}

.rank-number {
  font-weight: bold;
  color: var(--v-theme-primary);
}

.score-value {
  transition: all 0.3s ease;
}

.score-updated {
  animation: scoreUpdate 1s ease;
  color: var(--v-theme-success);
  font-weight: bold;
}

@keyframes scoreUpdate {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.feedback-snackbar {
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

.countdown-container {
  animation: fadeIn 0.5s ease;
}

.timer-container {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.5s ease;
}

.timer-warning {
  color: var(--v-theme-error);
  animation: pulse 1s infinite;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.connection-snackbar {
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.v-chip {
  transition: all 0.3s ease;
}

.v-chip:hover {
  transform: scale(1.05);
}

.inactive-player {
  opacity: 0.6;
  filter: grayscale(0.5);
}

.inactive-player:hover {
  opacity: 0.8;
}

.streak-chip {
  animation: flame 1s infinite;
}

@keyframes flame {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.first-place {
  background-color: rgba(255, 215, 0, 0.1);
}

.crown-icon {
  animation: crownGlow 2s infinite;
}

.first-place-chip {
  animation: trophyShine 2s infinite;
}

@keyframes crownGlow {
  0% { filter: drop-shadow(0 0 2px gold); }
  50% { filter: drop-shadow(0 0 8px gold); }
  100% { filter: drop-shadow(0 0 2px gold); }
}

@keyframes trophyShine {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.losing-streak-chip {
  animation: shake 0.5s infinite;
}

@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
  100% { transform: translateX(0); }
}

.quick-streak-chip {
  animation: lightning 0.5s infinite;
}

@keyframes lightning {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.perfect-streak-chip {
  animation: sparkle 1s infinite;
}

@keyframes sparkle {
  0% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.1) rotate(5deg); }
  75% { transform: scale(1.1) rotate(-5deg); }
  100% { transform: scale(1) rotate(0deg); }
}

.combo-streak-chip {
  animation: rocket 1s infinite;
}

@keyframes rocket {
  0% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-2px) rotate(5deg); }
  75% { transform: translateY(2px) rotate(-5deg); }
  100% { transform: translateY(0) rotate(0deg); }
}
</style>
