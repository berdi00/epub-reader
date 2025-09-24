import type { Book } from '@/features/types'
import { supabase } from '@/supabase'
import { ref } from 'vue'

import { storeToRefs } from 'pinia'
import { useReaderStore } from '@/store'

export const useBooks = () => {
  const { booksList } = storeToRefs(useReaderStore())
  const loading = ref(false)

  const loadBooks = async () => {
    booksList.value = []
    try {
      loading.value = true

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { return }

      // Load books
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })

      if (booksError) { throw booksError }

      booksList.value = booksData || []

      // Load reading progress
      const { error: progressError } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)

      if (progressError) { throw progressError }
    } catch (error) {
      console.error('Error loading books:', error)
    } finally {
      loading.value = false
    }
  }

  const getBook = async (id: string): Promise<Book | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) { throw fetchError }
      return data
    } catch (err) {
      console.error('Error fetching book:', err)
      return null
    }
  }

  return { loadBooks, getBook }
}
