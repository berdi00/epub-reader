import type JSZip from 'jszip'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Chapter } from './types'

export const useReaderStore = defineStore('reader', () => {
  // Reactive state
  const book = ref<JSZip | null>(null)
  const currentChapterIndex = ref<number>(0)
  const chapters = ref<Chapter[]>([])
  const currentContent = ref<string>('')
  const bookTitle = ref<string>('No book loaded')
  const opfDirectory = ref<string>('')
  const imageCache = ref<Map<string, string>>(new Map())
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Computed properties
  const totalChapters = computed<number>(() => chapters.value.length)
  const progress = computed<number>(() => {
    return totalChapters.value > 0
      ? ((currentChapterIndex.value + 1) / totalChapters.value) * 100
      : 0
  })

  // Progress tracking state
  const currentChapterProgress = ref<number>(0)
  const totalBookProgress = ref<number>(0)
  const currentCharacterOffset = ref<number>(0)
  const scrollCleanup = ref<(() => void) | null>(null)

  // Book data
  const bookData = ref<any>(null)
  const readingProgress = ref<any>(null)

  return { progress, currentContent, bookTitle, opfDirectory, imageCache, isLoading, error, chapters, currentChapterIndex, book, totalChapters, currentChapterProgress, totalBookProgress, currentCharacterOffset, scrollCleanup, bookData, readingProgress }
})
