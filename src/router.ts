import { createRouter, createWebHistory } from 'vue-router'

import BooksView from '@/features/books/BooksView.vue'
import LoginView from '@/features/login/LoginView.vue'
import ReaderView from './features/reader/ReaderView.vue'

const routes = [
  { path: '/', name: 'home', component: BooksView },
  { path: '/login', name: 'login', component: LoginView },
  { path: '/books/:id', name: 'book', component: ReaderView },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// router.beforeEach(async (to, from, next) => {
//   const { supabase } = await import('@/composables/useSupabase')
//   const { data: { user } } = await supabase.auth.getUser()

//   if (!user && to.name !== 'login') {
//     next({ name: 'login' })
//   } else if (user && to.name === 'login') {
//     next({ name: 'home' })
//   } else {
//     next()
//   }
// })
