import { supabase } from '@/supabase'
import { computed, ref } from 'vue'

export function useSupabase() {
  const user = ref(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => !!user.value)

  const getCurrentUser = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    user.value = currentUser
    loading.value = false
    return currentUser
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    user.value = null
  }

  // Initialize auth state
  getCurrentUser()

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    user.value = session?.user || null
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
