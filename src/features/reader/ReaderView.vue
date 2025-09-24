<template>
  <div class="h-screen flex flex-col bg-gray-900 text-white">
    <!-- Header -->
    <header class="bg-gray-800 px-1 md:px-4 py-3 flex items-center justify-between border-b border-gray-700 relative z-50">
      <div class="flex items-center space-x-4">
        <button
          @click="goBack"
          class="p-2 hover:bg-gray-700 rounded-full transition-colors"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div v-if="currentBook">
          <h1 class="font-semibold">{{ currentBook.title }}</h1>
          <p class="text-sm text-gray-400">{{ currentBook.author }}</p>
        </div>
      </div>

      <div class="flex items-center space-x-4">
        <div class="w-full flex items-center gap-2">
          <Button @click="prevPage">
            <ArrowLeft /> <span class="hidden md:inline"> Prev</span>
          </Button>
          <Button @click="nextPage">
            <ArrowRight /> <span class="hidden md:inline"> Next</span>
          </Button>
        </div>
        <!-- Progress -->
        <div v-if="readingProgress" class="text-sm text-gray-400">
          {{ Math.round(readingProgress.progress) }}%
        </div>

        <!-- Settings -->
        <button
          @click="showSettings = !showSettings"
          class="p-2 hover:bg-gray-700 rounded-full transition-colors"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

      </div>
    </header>

    <!-- Settings Panel -->
    <div v-if="showSettings" class="bg-gray-800 px-4 py-3 border-b border-gray-700 relative z-40">
      <div class="flex items-center space-x-6">
        <div class="flex items-center space-x-2">
          <label class="text-sm">Font Size:</label>
          <button @click="decreaseFontSize" class="p-1 hover:bg-gray-700 rounded">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20 12H4"
              />
            </svg>
          </button>
          <span class="text-sm w-8 text-center">{{ fontSize }}</span>
          <button @click="increaseFontSize" class="p-1 hover:bg-gray-700 rounded">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        <div class="flex items-center space-x-2">
          <label class="text-sm">Theme:</label>
          <select
            v-model="theme"
            @change="updateTheme"
            class="bg-gray-700 text-white rounded px-2 py-1 text-sm"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="sepia">Sepia</option>
          </select>
        </div>

        <div class="flex items-center space-x-2">
          <label class="text-sm">Line Height:</label>
          <button @click="decreaseLineHeight" class="p-1 hover:bg-gray-700 rounded">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20 12H4"
              />
            </svg>
          </button>
          <span class="text-sm w-8 text-center">{{ lineHeight }}</span>
          <button @click="increaseLineHeight" class="p-1 hover:bg-gray-700 rounded">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Reader Container -->
    <div class="flex-1 relative overflow-hidden">
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"/>
      </div>

      <!-- Fixed scroll container with proper event binding -->
      <div class="h-full overflow-y-auto overflow-x-hidden">
        <div
          ref="scrollContainer"
          class="scroll-container max-w-2xl mx-auto px-4"
        />
      </div>

    </div>

    <!-- Progress Bar -->
    <div class="bg-gray-800 px-4 py-2 relative z-40">
      <div class="w-full bg-gray-700 rounded-full h-1">
        <div
          class="bg-blue-600 h-1 rounded-full transition-all duration-300"
          :style="{ width: (readingProgress?.progress || 0) + '%' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ePub from 'epubjs'
import { useSupabase } from '@/composables/useSupabase'
import { useBooks } from '@/composables/useBooks'
import { useReadingProgress } from '@/composables/useReadingProgress'
import type { Book, ReadingProgress } from '../types'
import Button from '@/components/ui/button/Button.vue'
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const { user } = useSupabase()
const { getBook } = useBooks()
const { getReadingProgress, saveReadingProgress } = useReadingProgress()

const loading = ref(true)
const showSettings = ref(false)
const currentBook = ref<Book | null>(null)
const readingProgress = ref<ReadingProgress | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)

// EPUB.js instances
const book = ref<any>(null)
const rendition = ref<any>(null)

// Reader settings
const fontSize = ref(16)
const lineHeight = ref(1.6)
const theme = ref('dark')

// Scroll tracking
const saveProgressTimeout = ref<NodeJS.Timeout | null>(null)

const goBack = () => {
  router.push({ name: 'home' })
}

const increaseFontSize = () => {
  if (fontSize.value < 28) {
    fontSize.value += 2
    updateFontSize()
  }
}

const decreaseFontSize = () => {
  if (fontSize.value > 12) {
    fontSize.value -= 2
    updateFontSize()
  }
}

const increaseLineHeight = () => {
  if (lineHeight.value < 2.5) {
    lineHeight.value += 0.1
    updateLineHeight()
  }
}

const decreaseLineHeight = () => {
  if (lineHeight.value > 1.0) {
    lineHeight.value -= 0.1
    updateLineHeight()
  }
}

const updateFontSize = () => {
  if (rendition.value) {
    rendition.value.themes.fontSize(`${fontSize.value}px`)
  }
}

const updateLineHeight = () => {
  if (rendition.value) {
    rendition.value.themes.override('line-height', lineHeight.value.toFixed(1))
  }
}

const nextPage = () => {
  if (rendition.value) {
    rendition.value.next()
  }
}

const prevPage = () => {
  if (rendition.value) {
    rendition.value.prev()
  }
}

const updateTheme = () => {
  if (!rendition.value) { return }

  const themes = {
    dark: {
      body: {
        'background-color': '#1f2937 !important',
        'color': '#f9fafb !important',
        'margin': '0 !important',
        'padding': '20px !important',
        'line-height': `${lineHeight.value} !important`
      },
      p: { 'color': '#f9fafb !important', 'margin-bottom': '1em !important' },
      h1: { 'color': '#f9fafb !important', 'margin': '1.5em 0 0.5em 0 !important' },
      h2: { 'color': '#f9fafb !important', 'margin': '1.3em 0 0.5em 0 !important' },
      h3: { 'color': '#f9fafb !important', 'margin': '1.2em 0 0.5em 0 !important' },
      h4: { 'color': '#f9fafb !important', 'margin': '1.1em 0 0.5em 0 !important' },
      h5: { 'color': '#f9fafb !important', 'margin': '1em 0 0.5em 0 !important' },
      h6: { 'color': '#f9fafb !important', 'margin': '1em 0 0.5em 0 !important' }
    },
    light: {
      body: {
        'background-color': '#ffffff !important',
        'color': '#1f2937 !important',
        'margin': '0 !important',
        'padding': '20px !important',
        'line-height': `${lineHeight.value} !important`
      },
      p: { 'color': '#1f2937 !important', 'margin-bottom': '1em !important' },
      h1: { 'color': '#1f2937 !important', 'margin': '1.5em 0 0.5em 0 !important' },
      h2: { 'color': '#1f2937 !important', 'margin': '1.3em 0 0.5em 0 !important' },
      h3: { 'color': '#1f2937 !important', 'margin': '1.2em 0 0.5em 0 !important' },
      h4: { 'color': '#1f2937 !important', 'margin': '1.1em 0 0.5em 0 !important' },
      h5: { 'color': '#1f2937 !important', 'margin': '1em 0 0.5em 0 !important' },
      h6: { 'color': '#1f2937 !important', 'margin': '1em 0 0.5em 0 !important' }
    },
    sepia: {
      body: {
        'background-color': '#f4f1ea !important',
        'color': '#5c4b37 !important',
        'margin': '0 !important',
        'padding': '20px !important',
        'line-height': `${lineHeight.value} !important`
      },
      p: { 'color': '#5c4b37 !important', 'margin-bottom': '1em !important' },
      h1: { 'color': '#5c4b37 !important', 'margin': '1.5em 0 0.5em 0 !important' },
      h2: { 'color': '#5c4b37 !important', 'margin': '1.3em 0 0.5em 0 !important' },
      h3: { 'color': '#5c4b37 !important', 'margin': '1.2em 0 0.5em 0 !important' },
      h4: { 'color': '#5c4b37 !important', 'margin': '1.1em 0 0.5em 0 !important' },
      h5: { 'color': '#5c4b37 !important', 'margin': '1em 0 0.5em 0 !important' },
      h6: { 'color': '#5c4b37 !important', 'margin': '1em 0 0.5em 0 !important' }
    }
  }

  rendition.value.themes.register('selected', themes[theme.value as keyof typeof themes])
  rendition.value.themes.select('selected')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!scrollContainer.value) { return }

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      prevPage()
      break
    case 'ArrowRight':
      event.preventDefault()
      nextPage()
      break
  }
}

const initializeReader = async () => {
  const bookId = route.params.id as string

  try {
    loading.value = true

    // Fetch book data
    currentBook.value = await getBook(bookId)
    if (!currentBook.value) {
      router.push({ name: 'home' })
      return
    }

    // Fetch reading progress
    if (user.value) {
      readingProgress.value = await getReadingProgress(user.value.id, bookId)
    }

    // Ensure scroll container exists
    await nextTick()
    if (!scrollContainer.value) {
      console.error('Scroll container not found!')
      return
    }

    // Initialize EPUB
    book.value = ePub(currentBook.value.path)
    await book.value.ready

    // Render book in scrolled-doc (full vertical scroll)
    rendition.value = book.value.renderTo(scrollContainer.value, {
      width: '100%',
      height: '100%',
      flow: 'scrolled', // Enable scrolling mode
      spread: 'none'
    })

    // Apply themes, font size, line height
    updateTheme()
    updateFontSize()
    updateLineHeight()

    await rendition.value.display()

    // Restore saved progress if exists
    if (readingProgress.value?.cfi) {
      await rendition.value.display(readingProgress.value.cfi)
    }

    // Add scroll listener after content is rendered
    setTimeout(() => {
      loading.value = false
      console.log('Reader initialized successfully')
    }, 1000)
  } catch (error) {
    console.error('Failed to initialize reader:', error)
    router.push({ name: 'home' })
    loading.value = false
  }
}

onMounted(() => {
  initializeReader()
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(async () => {
  if (rendition.value && user.value && currentBook.value) {
    try {
      const location = rendition.value.currentLocation()
      if (location?.start?.cfi) {
        const cfi = location.start.cfi
        const progress = book.value.locations.percentageFromCfi(cfi) * 100

        await saveReadingProgress({
          user_id: user.value.id,
          book_id: currentBook.value.id,
          cfi,
          progress
        })
      }
    } catch (err) {
      console.error('Failed to save reading progress:', err)
    }
  }
})

onUnmounted(async () => {
  if (saveProgressTimeout.value) {
    clearTimeout(saveProgressTimeout.value)
  }
  document.removeEventListener('keydown', handleKeydown)

  if (rendition.value) {
    rendition.value.destroy()
  }
})
</script>
