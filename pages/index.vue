<template>
  <v-app>
    <v-main>
      <UserRegistration
        v-if="!currentPlayer"
        @user-registered="handleUserRegistration"
      />
      <div v-else>
        <GameRoom
          :current-player="currentPlayer"
          @game-state-change="handleGameStateChange"
        />
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'
import CaesarWheel from '~/components/CaesarWheel.vue'

const currentPlayer = ref(null)
const gameState = ref('waiting')

onMounted(() => {
  const savedUsername = localStorage.getItem('gameUsername')
  if (savedUsername) {
    loadPlayer(savedUsername)
  }
})

const loadPlayer = async (username) => {
  const { data, error } = await useSupabaseClient()
    .from('players')
    .select('*')
    .eq('username', username)
    .single()

  if (data) {
    currentPlayer.value = data
  } else {
    localStorage.removeItem('gameUsername')
  }
}

const handleUserRegistration = (player) => {
  currentPlayer.value = player
}

const handleGameStateChange = (state) => {
  gameState.value = state
}
</script> 