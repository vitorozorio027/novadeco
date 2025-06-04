<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6">
        <v-card class="elevation-12">
          <v-card-title class="text-h4 text-center pt-4">
            Jogo de Decodificação Rápida
          </v-card-title>
          <v-card-text>
            <v-form @submit.prevent="registerUser" ref="form">
              <v-text-field
                v-model="username"
                label="Nome de Usuário"
                :rules="[rules.required, rules.unique]"
                :error-messages="errorMessage"
                @input="checkUsername"
              ></v-text-field>
              <v-btn
                type="submit"
                color="primary"
                block
                :loading="loading"
                :disabled="!isValid"
              >
                Entrar no Jogo
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const { $supabase } = useNuxtApp()
const emit = defineEmits(['user-registered'])

const username = ref('')
const loading = ref(false)
const errorMessage = ref('')
const form = ref(null)

const rules = {
  required: v => !!v || 'Nome de usuário é obrigatório',
  unique: v => !errorMessage.value || 'Nome de usuário já está em uso'
}

const isValid = computed(() => {
  return username.value && !errorMessage.value
})

const checkUsername = async () => {
  if (!username.value) return
  
  const { data, error } = await $supabase
    .from('players')
    .select('username')
    .eq('username', username.value)
    .single()

  errorMessage.value = data ? 'Nome de usuário já está em uso' : ''
}

const registerUser = async () => {
  if (!isValid.value) return
  
  loading.value = true
  try {
    console.log('Tentando registrar usuário:', username.value)
    
    // Check if this is the first player
    const { data: existingPlayers } = await $supabase
      .from('players')
      .select('id')
    
    const isFirstPlayer = !existingPlayers || existingPlayers.length === 0
    
    const { data, error } = await $supabase
      .from('players')
      .insert([{ 
        username: username.value,
        is_host: isFirstPlayer
      }])
      .select()
      .single()

    if (error) {
      console.error('Erro do Supabase:', error)
      throw error
    }

    console.log('Usuário registrado com sucesso:', data)
    localStorage.setItem('gameUsername', username.value)
    emit('user-registered', data)
  } catch (error) {
    console.error('Erro detalhado:', error)
    errorMessage.value = 'Erro ao registrar usuário'
  } finally {
    loading.value = false
  }
}
</script> 