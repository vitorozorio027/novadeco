<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="8">
        <v-card class="mb-4">
          <v-card-title class="text-h5">
            Sala de Jogo
            <v-chip
              color="primary"
              class="ml-2"
              v-if="gameState === 'waiting'"
            >
              Aguardando jogadores...
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
              color="warning"
              class="ml-2"
              v-else-if="gameState === 'paused'"
            >
              Jogo Pausado pelo Host
            </v-chip>
          </v-card-title>

          <v-card-text>
            <div v-if="gameState === 'waiting'" class="text-center">
              <div v-if="isHost" class="text-h5 mb-4 text-primary">
                Você é o Host
              </div>
              <div v-else class="text-h5 mb-4 text-secondary">
                Você é um jogador, espere o host iniciar o jogo
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
                color="warning"
                @click="pauseGame"
              >
                Pausar Jogo
              </v-btn>
              <div class="text-h2 mt-4">{{ timeLeft }}s</div>
            </div>

            <div v-else-if="gameState === 'paused'" class="text-center">
              <div class="text-h4 mb-4">
                Palavra Cifrada: {{ currentChallenge.encrypted }}
              </div>
              <div class="text-h6 mb-4">
                Deslocamento: {{ currentChallenge.shift }}
              </div>
              <v-text-field
                v-model="userAnswer"
                label="Sua resposta"
                disabled
              ></v-text-field>
              <v-btn
                v-if="isHost"
                color="primary"
                @click="resumeGame"
                class="mt-2"
              >
                Retomar Jogo
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
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
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { encrypt, decrypt, generateRandomShift, generateRandomWord } from '~/utils/caesarCipher'
const { $supabase } = useNuxtApp()
const props = defineProps({
  currentPlayer: {
    type: Object,
    required: true
  }
})

const gameState = ref('waiting')
const countdown = ref(3)
const timeLeft = ref(30)
const userAnswer = ref('')
const hasAnswered = ref(false)
const players = ref([])
const currentChallenge = ref(null)
const isHost = ref(false)
const gameInterval = ref(null)
const timerInterval = ref(null)

const sortedPlayers = computed(() => {
  return [...players.value].sort((a, b) => b.score - a.score)
})

onMounted(async () => {
  // Subscribe to game state changes
  const gameChannel = $supabase
    .channel('game-state')
    .on('broadcast', { event: 'game-state' }, ({ payload }) => {
      handleGameStateUpdate(payload)
    })
    .subscribe()

  // Subscribe to player updates
  const playersChannel = $supabase
    .channel('players')
    .on('broadcast', { event: 'player-update' }, ({ payload }) => {
      handlePlayerUpdate(payload)
    })
    .subscribe()

  // Load initial players
  const { data: initialPlayers } = await $supabase
    .from('players')
    .select('*')
  players.value = initialPlayers

  // Load current game state
  const { data: currentGameState } = await $supabase
    .from('game_state')
    .select('*')
    .single()

  if (currentGameState) {
    gameState.value = currentGameState.state
    if (currentGameState.challenge) {
      currentChallenge.value = currentGameState.challenge
    }
    if (currentGameState.time_left) {
      timeLeft.value = currentGameState.time_left
    }
  }

  // Set host if no other players or if this player is already host
  if (players.value.length === 1) {
    // If this is the only player, make them host
    const { data } = await $supabase
      .from('players')
      .update({ is_host: true })
      .eq('id', props.currentPlayer.id)
      .select()
      .single()
    
    if (data) {
      isHost.value = true
      props.currentPlayer.is_host = true
    }
  } else {
    // Otherwise, check if this player is already host
    isHost.value = props.currentPlayer.is_host || false
  }
})

const handleGameStateUpdate = async (payload) => {
  gameState.value = payload.state
  
  // Persist game state to database
  await $supabase
    .from('game_state')
    .upsert({
      id: 1, // We'll use a single row for game state
      state: payload.state,
      challenge: payload.challenge || null,
      time_left: timeLeft.value
    })

  if (payload.state === 'countdown') {
    countdown.value = payload.countdown
  } else if (payload.state === 'playing') {
    currentChallenge.value = payload.challenge
    timeLeft.value = 30
    hasAnswered.value = false
    userAnswer.value = ''
    
    // Iniciar o timer de 30 segundos
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
    }
    timerInterval.value = setInterval(() => {
      timeLeft.value--
      // Update time left in database
      $supabase
        .from('game_state')
        .update({ time_left: timeLeft.value })
        .eq('id', 1)
      
      if (timeLeft.value <= 0) {
        clearInterval(timerInterval.value)
        if (isHost.value) {
          startNewRound()
        }
      }
    }, 1000)
  }
}

const handlePlayerUpdate = (payload) => {
  const index = players.value.findIndex(p => p.id === payload.id)
  if (index !== -1) {
    players.value[index] = { ...players.value[index], ...payload }
  } else {
    players.value.push(payload)
  }
}

const startNewRound = async () => {
  const shift = generateRandomShift()
  const word = await generateRandomWord()
  const challenge = {
    encrypted: encrypt(word, shift),
    shift: shift
  }

  // Iniciar contador regressivo de 3 segundos
  countdown.value = 3
  await $supabase
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
      // Iniciar o jogo após o contador chegar a 0
      $supabase
        .channel('game-state')
        .send({
          type: 'broadcast',
          event: 'game-state',
          payload: {
            state: 'playing',
            challenge
          }
        })

      // Iniciar o contador de 30 segundos
      timeLeft.value = 30
      if (timerInterval.value) {
        clearInterval(timerInterval.value)
      }
      timerInterval.value = setInterval(() => {
        timeLeft.value--
        if (timeLeft.value <= 0) {
          clearInterval(timerInterval.value)
          startNewRound()
        }
      }, 1000)
    } else {
      // Atualizar o contador para todos os jogadores
      $supabase
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
}

const submitAnswer = async () => {
  if (hasAnswered.value) return

  const isCorrect = userAnswer.value.toLowerCase() === 
    decrypt(currentChallenge.value.encrypted, currentChallenge.value.shift).toLowerCase()

  hasAnswered.value = true

  await $supabase
    .channel('players')
    .send({
      type: 'broadcast',
      event: 'player-update',
      payload: {
        id: props.currentPlayer.id,
        score: props.currentPlayer.score + (isCorrect ? 10 : 0)
      }
    })
}

const startGame = async () => {
  if (!isHost.value) return

  await startNewRound()
}

const pauseGame = async () => {
  if (!isHost.value) return
  
  clearInterval(timerInterval.value)
  await $supabase
    .channel('game-state')
    .send({
      type: 'broadcast',
      event: 'game-state',
      payload: {
        state: 'paused',
        challenge: currentChallenge.value
      }
    })
}

const resumeGame = async () => {
  if (!isHost.value) return

  await $supabase
    .channel('game-state')
    .send({
      type: 'broadcast',
      event: 'game-state',
      payload: {
        state: 'playing',
        challenge: currentChallenge.value
      }
    })

  // Resume countdown timer
  timerInterval.value = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      clearInterval(timerInterval.value)
      startNewRound()
    }
  }, 1000)
}

onUnmounted(() => {
  if (gameInterval.value) {
    clearInterval(gameInterval.value)
  }
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
  $supabase.removeAllChannels()
})
</script>

<style scoped>
.highlight-player {
  background-color: rgba(var(--v-theme-primary), 0.1);
}
</style>