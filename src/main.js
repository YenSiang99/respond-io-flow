import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      networkMode: 'always',
      staleTime: Infinity,
      gcTime: 60 * 60 * 1000,
    },
  },
})

const app = createApp(App)

app.use(createPinia())
app.use(VueQueryPlugin, { queryClient })
app.use(router)

app.mount('#app')
