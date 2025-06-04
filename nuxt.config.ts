// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/supabase',
    'vuetify-nuxt-module'
  ],
  
  // Configurações do Supabase
  supabase: {
    redirect: false,
    redirectOptions: {
      login: '/auth/login',
      callback: '/confirm',
      exclude: ['/*'],
    }
  },
  
  // Configurações de performance
  nitro: {
    compressPublicAssets: true,
    minify: true,
    routeRules: {
      '/**': { cors: true }
    }
  },
  
  // Configurações de build
  build: {
    transpile: ['vuetify']
  },
  
  // Configurações de runtime
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY
    }
  },
  
  // Configurações de desenvolvimento
  devtools: { enabled: false },
  
  // Configurações de CSS
  css: [
    'vuetify/styles',
    '@mdi/font/css/materialdesignicons.css'
  ],
  
  // Configurações de Vuetify
  vuetify: {
    vuetifyOptions: {
      defaults: {
        VBtn: {
          variant: 'flat'
        }
      }
    }
  }
})