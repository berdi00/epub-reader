<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEpub } from '@/composables/useEPUB'
import { storeToRefs } from 'pinia'
import { useReaderStore } from '@/store'
import Button from '@/components/ui/button/Button.vue'
import { ArrowLeft, MenuIcon } from 'lucide-vue-next'
import { supabase } from '@/supabase'

// Router
const router = useRouter()

const {
  currentChapterIndex,
  chapters,
  currentContent,
  bookTitle,
  isLoading,
  error,
  currentChapterProgress,
  totalBookProgress,
  bookData,
  // Computed
  totalChapters,
} = storeToRefs(useReaderStore())

// Use the epub composable
const {
  // State
  nextChapter,
  prevChapter,
  goToChapter,
  resetReader,
  getCurrentReadingPosition
} = useEpub()

// Local state
const sidebarOpen = ref<boolean>(true)

// File handling - removed since handled by parent component
const goBack = () => {
  router.push('/')
}

// Navigation functions
const toggleSidebar = (): void => {
  sidebarOpen.value = !sidebarOpen.value
}

const goToChapterAndCloseSidebar = (index: number): void => {
  goToChapter(index)
  sidebarOpen.value = false
}

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent): void => {
  switch (event.key) {
    case 'ArrowLeft':
      prevChapter()
      break
    case 'ArrowRight':
      nextChapter()
      break
    case 'Escape':
      sidebarOpen.value = false
      break
  }
}

const saveReadingProgress = async () => {
  if (!bookData.value) { return }
  const position = getCurrentReadingPosition()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { return }

    await supabase
      .from('reading_progress')
      .upsert({
        user_id: user.id,
        book_id: bookData.value.id,
        chapter_index: position.chapterIndex,
        chapter_progress_percentage: position.chapterProgressPercentage,
        total_book_percentage: position.totalBookPercentage,
        character_offset: position.characterOffset,
        last_read_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
  } catch (error) {
    console.error('Error saving reading progress:', error)
  }
}

// Handle page unload
const handleBeforeUnload = () => {
  saveReadingProgress()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  saveReadingProgress()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  resetReader()
})

</script>

<template>
  <div class="flex flex-col h-screen font-sans bg-slate-50 text-slate-700">
    <!-- Header -->
    <header class="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-6 py-4 flex items-center gap-4 shadow-lg z-50">
      <Button @click="toggleSidebar" type="button" class="w-10 h-10 p-0">
        <MenuIcon class="w-4 h-4" />
      </Button>
      <h1 class="flex-1 text-lg font-semibold truncate">{{ bookTitle }}</h1>
      <Button @click="goBack" class="w-10 h-10 p-0">
        <ArrowLeft class="w-4 h-4" />
      </Button>
    </header>

    <div class="flex flex-1 overflow-hidden relative">
      <!-- Sidebar -->
      <aside
        class="w-80 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 absolute h-full z-40 shadow-xl"
        :class="{ 'translate-x-0': sidebarOpen, '-translate-x-full': !sidebarOpen }"
      >
        <div class="px-6 py-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 class="text-lg font-semibold text-slate-800">Table of Contents</h2>
          <button @click="toggleSidebar" class="text-slate-500 hover:bg-slate-200 hover:text-slate-800 p-1 rounded transition-all">
            ✕
          </button>
        </div>

        <div class="flex-1 overflow-y-auto py-2">
          <ul v-if="chapters.length > 0" class="space-y-0">
            <li
              v-for="(chapter, index) in chapters"
              :key="chapter.id"
              @click="goToChapterAndCloseSidebar(index)"
              class="px-6 py-3 cursor-pointer transition-all border-l-3 border-transparent hover:bg-slate-100 hover:border-slate-300"
              :class="{
                'bg-blue-50 border-blue-500 text-blue-800': currentChapterIndex === index
              }"
            >
              <span class="text-sm leading-relaxed">{{ chapter.title }}</span>
            </li>
          </ul>
          <div v-else class="px-6 py-8 text-center text-slate-500">
            <p>No chapters loaded</p>
            <p class="text-xs mt-2 text-slate-400">Upload an EPUB file to get started</p>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex-1 flex items-center justify-center bg-white">
          <div class="text-center text-slate-500">
            <div class="w-10 h-10 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"/>
            <p>Loading EPUB...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex-1 flex items-center justify-center bg-red-50">
          <p class="text-red-600">{{ error }}</p>
        </div>

        <!-- Reader Content -->
        <template v-else>
          <!-- Content Area -->
          <div class="flex-1 overflow-y-auto bg-white reader-content">
            <div
              v-if="currentContent"
              class="max-w-4xl mx-auto px-8 py-8 leading-relaxed text-lg content-wrapper"
              v-html="currentContent"
            />
          </div>
        </template>
      </main>
    </div>

    <!-- Progress Bar -->
    <footer v-if="totalChapters > 0" class="bg-white border-t border-slate-200 px-6 py-4">
      <div class="max-w-4xl mx-auto">
        <div class="flex justify-between items-center mb-2 text-sm text-slate-600 font-medium">
          <span class="hidden sm:block">
            Reading Progress: {{ Math.round(totalBookProgress) }}%
          </span>
          <span class="block sm:hidden font-semibold">
            Ch. {{ currentChapterIndex + 1 }}/{{ totalChapters }} • {{ Math.round(totalBookProgress) }}%
          </span>
          <span class="text-xs text-slate-400 max-w-48 truncate">{{ chapters[currentChapterIndex]?.title }}</span>
        </div>
        <div class="bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            class="bg-gradient-to-r from-blue-500 to-purple-600 h-full rounded-full transition-all duration-300"
            :style="{ width: totalBookProgress + '%' }"
          />
        </div>
        <div class="text-center mt-1">
          <span class="text-xs text-slate-400">{{ Math.round(currentChapterProgress) }}% through current chapter</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@import "tailwindcss";
/* Chapter containers in continuous view */
.content-wrapper :deep(.chapter-container) {
  @apply mb-12 scroll-mt-8;
}

.content-wrapper :deep(.chapter-header) {
  @apply border-b-2 border-slate-200 pb-4 mb-8;
}

.content-wrapper :deep(.chapter-title-header) {
  @apply text-2xl font-bold text-slate-800 m-0;
}

.content-wrapper :deep(h1),
.content-wrapper :deep(h2),
.content-wrapper :deep(h3) {
  @apply mt-8 mb-4 text-slate-800;
}

.content-wrapper :deep(p) {
  @apply mb-4 text-justify;
}

.content-wrapper :deep(img) {
  @apply max-w-full h-auto block mx-auto my-6 rounded-lg shadow-md;
}

/* Responsive sidebar */
@media (min-width: 768px) {
  .sidebar {
    @apply static transform-none z-auto;
  }

  .sidebar-overlay {
    @apply hidden;
  }

  .close-btn {
    @apply hidden;
  }
}

/* Mobile adjustments */
@media (max-width: 640px) {
  .content-wrapper {
    @apply px-4 text-base;
  }

  .content-wrapper :deep(.chapter-header) {
    @apply mb-6;
  }

  .content-wrapper :deep(.chapter-title-header) {
    @apply text-xl;
  }
}
</style>
