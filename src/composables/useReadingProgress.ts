import type { ReadingProgress } from '@/features/types'
import { supabase } from '@/supabase'
import { ref } from 'vue'

export function useReadingProgress() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const getReadingProgress = async (userId: string, bookId: string): Promise<ReadingProgress | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .maybeSingle()

      if (fetchError) { throw fetchError }
      return data || null
    } catch (err) {
      console.error('Error fetching reading progress:', err)
      return null
    }
  }

  const saveReadingProgress = async (progress: Omit<ReadingProgress, 'id' | 'last_read_at'>) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: upsertError } = await supabase
        .from('reading_progress')
        .upsert(
          {
            ...progress,
            last_read_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id'
          }
        )
        .select()
        .single()

      if (upsertError) { throw upsertError }
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save progress'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getAllUserProgress = async (userId: string): Promise<ReadingProgress[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('reading_progress')
        .select(`
          *,
          books (
            title,
            author,
            cover_url
          )
        `)
        .eq('user_id', userId)
        .order('last_read_at', { ascending: false })

      if (fetchError) { throw fetchError }
      return data || []
    } catch (err) {
      console.error('Error fetching user progress:', err)
      return []
    }
  }

  return {
    loading,
    error,
    getReadingProgress,
    saveReadingProgress,
    getAllUserProgress
  }
}
