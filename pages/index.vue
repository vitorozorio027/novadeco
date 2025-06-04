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
const currentPlayer = ref(null)

onMounted(() => {
  const savedUsername = localStorage.getItem('gameUsername')
  if (savedUsername) {
    loadPlayer(savedUsername)
  }
})

const loadPlayer = async (username) => {
  const { $supabase } = useNuxtApp()
  const { data, error } = await $supabase
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