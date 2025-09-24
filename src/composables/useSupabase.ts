import { supabase } from '@/supabase'
import type { User } from '@supabase/supabase-js'
import { computed, ref } from 'vue'

export function useSupabase() {
  const user = ref<User>()
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)

  const getCurrentUser = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (user.value) {
      user.value = currentUser as User
    }
    loading.value = false
    return currentUser
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    user.value = undefined
  }

  getCurrentUser()

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user as User || null
    loading.value = false
  })

  return {
    user,
    loading,
    isAuthenticated,
    getCurrentUser,
    signOut,
    supabase
  }
}
