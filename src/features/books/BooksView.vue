<template>
  <div class="books-container">
    <!-- Upload Section -->
    <div class="p-2 bg-white md:p-3 rounded-lg shadow mb-2 md:mb-3">
      <UploadComponent
        :email="session?.user.email || '@'"
        @book-uploaded="handleBookUploaded"
        @upload-error="handleUploadError"
      />
    </div>

    <!-- Books List -->
    <div class="books-list">
      <h2>Your Library ({{ booksList.length }}/3)</h2>

      <div v-if="loading" class="loading">
        Loading your books...
      </div>

      <div v-else class="books-grid">
        <div
          v-for="book in booksList"
          :key="book.id"
          class="book-card"
        >
          <div class="book-info">
            <h3 class="book-title">{{ book.title }}</h3>
            <p class="book-author">by {{ book.author }}</p>
            <div class="w-full h-[200px]">
              <img class="h-full w-full object-top object-cover" :src="book.cover_url" alt="Cover">
            </div>
            <!-- <div class="book-meta">
              <span v-if="book.total_chapters">{{ book.total_chapters }} chapters</span>
              <span class="file-size">{{ formatFileSize(book.file_size) }}</span>
            </div>

            <div v-if="getReadingProgress(book.id)" class="reading-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: getReadingProgress(book.id).total_book_percentage + '%' }"
                />
              </div>
              <span class="progress-text">
                {{ Math.round(getReadingProgress(book.id).total_book_percentage) }}% complete
                <span class="chapter-info">
                  • Chapter {{ getReadingProgress(book.id).chapter_index + 1 }}
                </span>
              </span>
            </div> -->
          </div>

          <div class="flex w-full justify-between">
            <Button
              @click="openBook(book)"
              class="w-full"
            >
              <span>Continue</span>
            </Button>

          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabase'
import UploadComponent from './BooksHeader.vue'
import { useRouter } from 'vue-router'
import type { Session } from '@supabase/supabase-js'
import Button from '@/components/ui/button/Button.vue'
import { useBooks } from '@/composables/useBooks'
import { storeToRefs } from 'pinia'
import { useReaderStore } from '@/store'
import type { Book } from '../types'

const uploadMessage = ref('')
const messageType = ref<'success' | 'error'>('success')

const router = useRouter()
const session = ref<Session>()
const { loadBooks } = useBooks()
const { booksList } = storeToRefs(useReaderStore())

onMounted(() => {
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session as Session
  })
  supabase.auth.onAuthStateChange((_, _session) => {
    session.value = _session as Session
  })
  loadBooks()
})

// const readingProgress = ref<ReadingProgress[]>([])
const loading = ref(false)
const deletingBook = ref<string | null>(null)

const openBook = (book: Book) => {
  // Navigate to the book reader page
  router.push({ path: `/books/${book.id}` })
}

const showMessage = (message: string, type: 'success' | 'error') => {
  uploadMessage.value = message
  messageType.value = type
  setTimeout(() => {
    uploadMessage.value = ''
  }, 5000)
}

const handleBookUploaded = (book: Book) => {
  showMessage(`"File uploaded successfully!`, 'success')
  loadBooks()
}

const handleUploadError = (error: string) => {
  showMessage(error, 'error')
}

// const deleteBook = async (book: Book) => {
//   if (!confirm(`Are you sure you want to delete "${book.title}"?`)) { return }

//   try {
//     deletingBook.value = book.id

//     // Delete from storage
//     const { error: storageError } = await supabase.storage
//       .from('epub-files')
//       .remove([book.file_path])

//     if (storageError) { console.warn('Storage deletion error:', storageError) }

//     // Delete reading progress
//     await supabase
//       .from('reading_progress')
//       .delete()
//       .eq('book_id', book.id)

//     // Delete book record
//     const { error: dbError } = await supabase
//       .from('books')
//       .delete()
//       .eq('id', book.id)

//     if (dbError) { throw dbError }

//     await loadBooks()
//   } catch (error) {
//     console.error('Error deleting book:', error)
//   } finally {
//     deletingBook.value = null
//   }
// }

// const getReadingProgress = (bookId: string): ReadingProgress | undefined => {
//   return readingProgress.value.find(p => p.book_id === bookId)
// }

// const formatFileSize = (bytes: number): string => {
//   if (bytes === 0) { return '0 Bytes' }
//   const k = 1024
//   const sizes = ['Bytes', 'KB', 'MB', 'GB']
//   const i = Math.floor(Math.log(bytes) / Math.log(k))
//   return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
// }

</script>

<style scoped>
.books-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-weight: 500;
}

.message.success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.message.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.books-list h2 {
  color: #1e293b;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #64748b;
}

.empty-state .hint {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #94a3b8;
}

.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.book-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  border: 1px solid #e2e8f0;
}

.book-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.book-info {
  margin-bottom: 1rem;
}

.book-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.book-author {
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.book-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 1rem;
}

.reading-progress {
  margin-top: 1rem;
}

.progress-bar {
  background: #e2e8f0;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
}

.book-actions {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.action-btn.primary {
  background: #3b82f6;
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  background: #2563eb;
}

.action-btn.danger {
  background: #ef4444;
  color: white;
}

.action-btn.danger:hover:not(:disabled) {
  background: #dc2626;
}

.reader-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reader-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
}

.close-reader {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  z-index: 1001;
  transition: all 0.2s;
}

.close-reader:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

.chapter-info {
  font-size: 0.75rem;
  color: #94a3b8;
}

@media (max-width: 768px) {
  .books-container {
    padding: 1rem;
  }

  .books-grid {
    grid-template-columns: 1fr;
  }
}
</style>
