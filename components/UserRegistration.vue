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
import { useSupabaseClient } from '#imports'

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
  
  const { data, error } = await useSupabaseClient()
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
    
    const supabase = useSupabaseClient()
    
    // Check if this is the first player
    const { data: existingPlayers, error: checkError } = await supabase
      .from('players')
      .select('id')
      .throwOnError()
    
    if (checkError) {
      console.error('Erro ao verificar jogadores existentes:', checkError)
      throw new Error('Erro ao verificar jogadores existentes')
    }
    
    console.log('Jogadores existentes:', existingPlayers)
    const isFirstPlayer = !existingPlayers || existingPlayers.length === 0
    console.log('É o primeiro jogador?', isFirstPlayer)
    
    // Primeiro, insere o jogador
    const { data: playerData, error: insertError } = await supabase
      .from('players')
      .insert([{ 
        username: username.value
      }])
      .select()
      .single()
      .throwOnError()

    if (insertError) {
      console.error('Erro detalhado do Supabase:', insertError)
      console.error('Código do erro:', insertError.code)
      console.error('Mensagem do erro:', insertError.message)
      console.error('Detalhes do erro:', insertError.details)
      
      if (insertError.code === '23505') { // Código de erro para violação de unicidade
        errorMessage.value = 'Este nome de usuário já está em uso'
      } else {
        errorMessage.value = 'Erro ao registrar usuário. Por favor, tente novamente.'
      }
      throw insertError
    }

    // Se for o primeiro jogador, atualiza o host_id no game_state
    if (isFirstPlayer) {
      const { error: updateError } = await supabase
        .from('game_state')
        .update({ 
          host_id: playerData.id,
          state: 'waiting'
        })
        .eq('id', 1)
        .throwOnError()

      if (updateError) {
        console.error('Erro ao atualizar host:', updateError)
        // Se falhar ao atualizar o host, remove o jogador criado
        await supabase
          .from('players')
          .delete()
          .eq('id', playerData.id)
        throw new Error('Erro ao atualizar host')
      }
    }

    console.log('Usuário registrado com sucesso:', playerData)
    localStorage.setItem('gameUsername', username.value)
    
    // Emite um broadcast para atualizar a lista de jogadores
    await supabase
      .channel('players')
      .send({
        type: 'broadcast',
        event: 'player-update',
        payload: {
          id: playerData.id,
          score: 0,
          action: 'join'
        }
      })
    
    emit('user-registered', playerData)
  } catch (error) {
    console.error('Erro detalhado:', error)
    if (!errorMessage.value) {
      errorMessage.value = 'Erro ao registrar usuário. Por favor, tente novamente.'
    }
  } finally {
    loading.value = false
  }
}
</script> 