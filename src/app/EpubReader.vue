<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEpub } from '@/composables/useEPUB'
import { storeToRefs } from 'pinia'
import { useReaderStore } from '@/features/reader/store'

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
  getEstimatedPageInfo,
} = useEpub()

// Local state
const sidebarOpen = ref<boolean>(false)

// Real-time progress tracking - now using the composable's values
const pageInfo = computed(() => getEstimatedPageInfo())

const updateScrollProgress = () => {
  // The composable handles this automatically via scroll listeners
  // This function is kept for compatibility but is no longer needed
}

// Props for loading specific books (removed since handled by parent)
// const props = defineProps<{
//   bookFile?: File
//   bookBlob?: Blob
// }>()

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

// Load book from props if provided - removed since handled by parent
onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)

  // Set up scroll progress tracking
  const contentElement = document.querySelector('.reader-content')
  if (contentElement) {
    contentElement.addEventListener('scroll', updateScrollProgress)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  resetReader()
})

</script>

<template>
  <div class="epub-reader">
    <!-- Header -->
    <header class="header">
      <button @click="toggleSidebar" type="button" class="menu-btn">
        ☰ Menu
      </button>
      <h1 class="book-title">{{ bookTitle }}</h1>
      <button @click="goBack" class="back-btn">
        ← Library
      </button>
    </header>

    <div class="main-content">
      <!-- Sidebar -->
      <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
        <div class="sidebar-header">
          <h2>Table of Contents</h2>
          <button @click="toggleSidebar" class="close-btn">✕</button>
        </div>

        <div class="sidebar-content">
          <ul v-if="chapters.length > 0" class="chapter-list">
            <li
              v-for="(chapter, index) in chapters"
              :key="chapter.id"
              @click="goToChapterAndCloseSidebar(index)"
              class="chapter-item"
              :class="{ 'active': currentChapterIndex === index }"
            >
              <span class="chapter-title">{{ chapter.title }}</span>
            </li>
          </ul>
          <div v-else class="no-chapters">
            <p>No chapters loaded</p>
            <p class="hint">Upload an EPUB file to get started</p>
          </div>
        </div>
      </aside>

      <!-- Overlay for mobile -->
      <div
        v-if="sidebarOpen"
        class="sidebar-overlay"
        @click="toggleSidebar"
      />

      <!-- Main Content -->
      <main class="reader-main">
        <!-- Loading State -->
        <div v-if="isLoading" class="loading-screen">
          <div class="loading-content">
            <div class="loading-spinner"/>
            <p>Loading EPUB...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-screen">
          <div class="error-content">
            <h2>📚 Error Loading Book</h2>
            <p>{{ error }}</p>
            <label for="epub-file" class="upload-btn">
              Try Another File
            </label>
          </div>
        </div>

        <!-- Reader Content -->
        <template v-else>
          <!-- Content Area -->
          <div class="reader-content">
            <div
              v-if="currentContent"
              class="content-wrapper"
              v-html="currentContent"
            />
          </div>
        </template>
      </main>
    </div>

    <!-- Progress Bar -->
    <footer class="footer" v-if="totalChapters > 0">
      <div class="progress-container">
        <div class="progress-info">
          <span class="desktop-progress">
            Reading Progress: {{ Math.round(totalBookProgress) }}% • Page ~{{ pageInfo.currentPage }} of {{ pageInfo.totalPages }}
          </span>
          <span class="mobile-progress">
            Ch. {{ currentChapterIndex + 1 }}/{{ totalChapters }} • {{ Math.round(totalBookProgress) }}%
          </span>
          <span class="chapter-indicator">{{ chapters[currentChapterIndex]?.title }}</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: totalBookProgress + '%' }"
          />
        </div>
        <div class="detailed-progress">
          <span class="chapter-progress">{{ Math.round(currentChapterProgress) }}% through current chapter</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.epub-reader {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  color: #334155;
}

/* Header */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.menu-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.menu-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.book-title {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-input {
  display: none;
}

.file-label {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.file-label:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

/* Main Content */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Sidebar */
.sidebar {
  width: 320px;
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  position: absolute;
  height: 100%;
  z-index: 50;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

.sidebar-open {
  transform: translateX(0);
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.sidebar-header h2 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #64748b;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.chapter-list {
  list-style: none;
}

.chapter-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.chapter-item:hover {
  background: #f1f5f9;
  border-left-color: #e2e8f0;
}

.chapter-item.active {
  background: #eff6ff;
  border-left-color: #3b82f6;
  color: #1d4ed8;
}

.chapter-number {
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 2rem;
  color: #64748b;
}

.chapter-title {
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.4;
}

.chapter-item.active .chapter-number,
.chapter-item.active .chapter-title {
  color: #1d4ed8;
}

.no-chapters {
  padding: 2rem 1.5rem;
  text-align: center;
  color: #64748b;
}

.no-chapters .hint {
  font-size: 0.85rem;
  margin-top: 0.5rem;
  color: #94a3b8;
}

.sidebar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;
}

/* Reader Main */
.reader-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Loading State */
.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: white;
}

.loading-content {
  text-align: center;
  color: #64748b;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error State */
.error-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #fef2f2;
}

.error-content {
  text-align: center;
  padding: 2rem;
}

.error-content h2 {
  color: #dc2626;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.error-content p {
  color: #7f1d1d;
  margin-bottom: 2rem;
}

.nav-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  gap: 1rem;
}

.nav-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.nav-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.nav-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  transform: none;
}

.chapter-info {
  font-weight: 500;
  color: #475569;
  font-size: 0.9rem;
}

.reader-content {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.content-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  line-height: 1.7;
  font-size: 1.1rem;
}

/* Chapter containers in continuous view */
.content-wrapper :deep(.chapter-container) {
  margin-bottom: 3rem;
  scroll-margin-top: 2rem; /* For smooth navigation */
}

.content-wrapper :deep(.chapter-header) {
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}

.content-wrapper :deep(.chapter-title-header) {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.content-wrapper :deep(.chapter-content) {
  /* Chapter content styles */
}

.content-wrapper :deep(h1),
.content-wrapper :deep(h2),
.content-wrapper :deep(h3) {
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #1e293b;
}

.content-wrapper :deep(p) {
  margin-bottom: 1rem;
  text-align: justify;
}

.content-wrapper :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.5rem auto;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.welcome-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.welcome-content {
  text-align: center;
  padding: 2rem;
}

.welcome-content h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #1e293b;
}

.welcome-content p {
  color: #64748b;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.upload-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-block;
  font-weight: 600;
  text-decoration: none;
}

.upload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Footer */
.footer {
  background: white;
  border-top: 1px solid #e2e8f0;
  padding: 1rem 1.5rem;
}

.progress-container {
  max-width: 800px;
  margin: 0 auto;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
}

.desktop-progress {
  display: block;
}

.mobile-progress {
  display: none;
  font-weight: 600;
}

.chapter-indicator {
  font-size: 0.8rem;
  color: #94a3b8;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detailed-progress {
  text-align: center;
  margin-top: 0.25rem;
}

.chapter-progress {
  font-size: 0.75rem;
  color: #94a3b8;
}

.progress-bar {
  background: #e2e8f0;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Responsive */
@media (min-width: 768px) {
  .sidebar {
    position: static;
    transform: translateX(0);
    z-index: auto;
  }

  .sidebar-overlay {
    display: none;
  }

  .close-btn {
    display: none;
  }
}

@media (max-width: 640px) {
  .header {
    padding: 0.75rem 1rem;
  }

  .nav-controls {
    padding: 0.75rem 1rem;
  }

  .content-wrapper {
    padding: 1rem;
    font-size: 1rem;
  }

  .content-wrapper :deep(.chapter-header) {
    margin-bottom: 1.5rem;
  }

  .content-wrapper :deep(.chapter-title-header) {
    font-size: 1.3rem;
  }

  .welcome-content h2 {
    font-size: 1.5rem;
  }

  /* Mobile progress indicator */
  .desktop-progress {
    display: none;
  }

  .mobile-progress {
    display: block;
  }

  .chapter-indicator {
    max-width: 120px;
    font-size: 0.75rem;
  }

  .progress-info {
    flex-direction: column;
    gap: 0.25rem;
    align-items: center;
  }
}
</style>
