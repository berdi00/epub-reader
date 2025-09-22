<template>
  <div class="reader-view">
    <!-- Loading State -->
    <div v-if="loading" class="loading-screen">
      <div class="loading-content">
        <div class="loading-spinner"/>
        <p>Loading your book...</p>
        <p class="loading-details">{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-screen">
      <div class="error-content">
        <h2>📚 Failed to Load Book</h2>
        <p>{{ error }}</p>
        <div class="error-actions">
          <button @click="retryLoading" class="retry-btn">Try Again</button>
          <button @click="goBack" class="back-btn">Go Back to Library</button>
        </div>
      </div>
    </div>

    <!-- Reader -->
    <EpubReader
      v-if="chapters.length"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/supabase'
import EpubReader from '@/app/EpubReader.vue'
import { useEpub } from '@/composables/useEPUB'
import { storeToRefs } from 'pinia'
import { useReaderStore } from './store'

const { chapters, bookData, readingProgress } = storeToRefs(useReaderStore())

const { loadEpubFromFile, setReadingPosition } = useEpub()

// Router
const route = useRoute()
const router = useRouter()

// State
const loading = ref(true)
const error = ref<string | null>(null)
const bookLoaded = ref(false)
const loadingMessage = ref('Fetching book details...')
const bookId = ref<string>(route.params.id as string)

const loadBook = async () => {
  try {
    loading.value = true
    error.value = null
    loadingMessage.value = 'Fetching book details...'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Get book details
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId.value)
      .eq('user_id', user.id)
      .single()

    if (bookError || !book) {
      error.value = 'Book not found or you do not have permission to access it.'
      return
    }

    bookData.value = book
    loadingMessage.value = 'Loading reading progress...'

    // Get reading progress
    const { data: progress } = await supabase
      .from('reading_progress')
      .select('*')
      .eq('book_id', bookId.value)
      .eq('user_id', user.id)
      .single()

    readingProgress.value = progress
    loadingMessage.value = 'Downloading book file...'

    // Download book file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('epub-files')
      .download(book.file_path)

    if (downloadError) {
      error.value = 'Failed to download book file. Please try again.'
      return
    }

    loadingMessage.value = 'Loading book content...'

    // Load book in reader

    await loadEpubFromFile(new File([fileData], book.file_name))

    // Restore reading progress if exists
    if (progress && progress.total_book_percentage > 0) {
      loadingMessage.value = 'Restoring your reading position...'
      await new Promise(resolve => setTimeout(resolve, 500)) // Small delay for smooth loading

      await setReadingPosition(
        progress.chapter_index,
        progress.chapter_progress_percentage,
      )
    }

    bookLoaded.value = true
  } catch (err) {
    console.error('Error loading book:', err)
    error.value = 'An unexpected error occurred while loading the book.'
  } finally {
    loading.value = false
  }
}

// const startAutoSave = () => {
//   // Auto-save reading progress every 30 seconds
//   autoSaveInterval = setInterval(() => {
//     saveReadingProgress()
//   }, 20000)
// }

onMounted(() => {
  loadBook()
})

const retryLoading = () => {
  bookLoaded.value = false
  loadBook()
}

const goBack = () => {
  router.push('/')
}

</script>

<style scoped>
.reader-view {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.loading-content {
  text-align: center;
  padding: 2rem;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1.5rem;
}

.loading-details {
  margin-top: 1rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #fef2f2;
  padding: 2rem;
}

.error-content {
  text-align: center;
  max-width: 500px;
}

.error-content h2 {
  color: #dc2626;
  font-size: 1.8rem;
  margin-bottom: 1rem;
}

.error-content p {
  color: #7f1d1d;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.retry-btn, .back-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn {
  background: #3b82f6;
  color: white;
}

.retry-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.back-btn {
  background: #6b7280;
  color: white;
}

.back-btn:hover {
  background: #4b5563;
  transform: translateY(-1px);
}

@media (max-width: 640px) {
  .error-actions {
    flex-direction: column;
  }

  .retry-btn, .back-btn {
    width: 100%;
  }
}
</style>
