<template>
  <v-app>
    <v-main>
      <UserRegistration
        v-if="!currentPlayer"
        @user-registered="handleUserRegistration"
      />
      <GameRoom
        v-else
        :current-player="currentPlayer"
      />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'

const currentPlayer = ref(null)

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
</script> 