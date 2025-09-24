// composables/useEpub.ts
import { ref, nextTick, watch } from 'vue'
import JSZip from 'jszip'
import { storeToRefs } from 'pinia'
import { useReaderStore } from '@/store'
import type { BookMetadata, Chapter, ManifestMap } from '@/features/reader/types'

export const useEpub = () => {
  const { currentContent, bookTitle, opfDirectory, imageCache, isLoading, error, chapters, currentChapterIndex, book, currentChapterProgress, totalBookProgress, currentCharacterOffset, scrollCleanup  } = storeToRefs(useReaderStore())
  watch(chapters, newChapters => console.log(newChapters, 'chapters'), { deep: true })

  // Extract chapter title from HTML content
  const extractChapterTitle = (htmlContent: string): string => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')
    const h1 = doc.querySelector('h1')
    const h2 = doc.querySelector('h2')
    const title = doc.querySelector('title')

    return (h1?.textContent || h2?.textContent || title?.textContent || '').trim()
  }

  // Parse EPUB structure and extract metadata
  const parseEpub = async (zip: JSZip): Promise<BookMetadata> => {
    try {
      isLoading.value = true
      error.value = null

      // Clear previous data
      imageCache.value.clear()

      // Find META-INF/container.xml
      const containerFile = zip.file('META-INF/container.xml')
      if (!containerFile) {
        throw new Error('Invalid EPUB: No container.xml')
      }

      const containerXml = await containerFile.async('text')
      const parser = new DOMParser()
      const containerDoc = parser.parseFromString(containerXml, 'text/xml')

      // Get the path to the OPF file
      const rootfileElement = containerDoc.querySelector('rootfile')
      if (!rootfileElement) {
        throw new Error('Invalid EPUB: No rootfile element')
      }

      const opfPath = rootfileElement.getAttribute('full-path')
      if (!opfPath) {
        throw new Error('Invalid EPUB: No OPF path found')
      }

      // Store OPF directory for image resolution
      opfDirectory.value = opfPath.substring(0, opfPath.lastIndexOf('/') + 1)

      // Read the OPF file
      const opfFile = zip.file(opfPath)
      if (!opfFile) {
        throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`)
      }

      const opfXml = await opfFile.async('text')
      const opfDoc = parser.parseFromString(opfXml, 'text/xml')

      // Extract metadata
      const metadata = extractMetadata(opfDoc)
      bookTitle.value = metadata.title

      // Parse spine to get reading order
      const spineItems = opfDoc.querySelectorAll('spine itemref')
      const manifest = opfDoc.querySelectorAll('manifest item')

      // Create manifest map
      const manifestMap: ManifestMap = {}
      manifest.forEach(item => {
        const id = item.getAttribute('id')
        const href = item.getAttribute('href')
        const mediaType = item.getAttribute('media-type')

        if (id && href && mediaType) {
          manifestMap[id] = { href, mediaType }
        }
      })

      // Build chapters array
      const chapterList: Chapter[] = []
      for (const spineItem of Array.from(spineItems)) {
        const idref = spineItem.getAttribute('idref')
        if (!idref) { continue }

        const manifestItem = manifestMap[idref]

        if (manifestItem && manifestItem.mediaType === 'application/xhtml+xml') {
          const chapterPath = opfDirectory.value + manifestItem.href
          const chapterFile = zip.file(chapterPath)

          if (chapterFile) {
            const chapterContent = await chapterFile.async('text')
            chapterList.push({
              id: idref,
              href: manifestItem.href,
              content: chapterContent,
              title: extractChapterTitle(chapterContent) || `Chapter ${chapterList.length + 1}`
            })
          }
        }
      }

      chapters.value = chapterList
      book.value = zip

      // Update metadata with actual chapter count
      metadata.totalChapters = chapterList.length

      return metadata
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      error.value = errorMessage
      console.error('Error parsing EPUB:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Extract metadata from OPF document
  const extractMetadata = (opfDoc: Document): BookMetadata => {
    const getMetadataValue = (selector: string): string => {
      const element = opfDoc.querySelector(selector)
      return element?.textContent?.trim() || ''
    }

    return {
      title: getMetadataValue('title') || 'Unknown Title',
      author: getMetadataValue('creator') || getMetadataValue('[property="dcterms:creator"]') || undefined,
      language: getMetadataValue('language') || undefined,
      publisher: getMetadataValue('publisher') || undefined,
      description: getMetadataValue('description') || undefined,
      totalChapters: 0 // Will be updated after parsing chapters
    }
  }

  // Load EPUB from file
  const loadEpubFromFile = async (file: File): Promise<BookMetadata> => {
    try {
      const zip = await JSZip.loadAsync(file)
      const metadata = await parseEpub(zip)
      if (chapters.value.length > 0) {
        await loadAllChapters()
      }
      return metadata
    } catch (err) {
      console.error('Error loading EPUB from file:', err)
      throw err
    }
  }

  // Load EPUB from blob (for uploaded files)
  const loadEpubFromBlob = async (blob: Blob): Promise<BookMetadata> => {
    try {
      const zip = await JSZip.loadAsync(blob)
      const metadata = await parseEpub(zip)

      if (chapters.value.length > 0) {
        await loadAllChapters()
      }

      return metadata
    } catch (err) {
      console.error('Error loading EPUB from blob:', err)
      throw err
    }
  }

  // Process images in DOM
  const processImagesInDOM = async (): Promise<void> => {
    if (!book.value) { return }

    const contentWrapper = document.querySelector('.content-wrapper')
    if (!contentWrapper) { return }

    const imgs = [
      ...contentWrapper.querySelectorAll('img'),
      ...contentWrapper.querySelectorAll('image')
    ] as HTMLImageElement[]

    for (const img of imgs) {
      const src = img.getAttribute('src') || img.getAttribute('xlink:href')

      if (src && !src.startsWith('data:') && !src.startsWith('http')) {
        try {
          const possiblePaths = [
            src,
            opfDirectory.value + src,
            src.replace(/^\.\.\//, ''),
            `images/${src}`,
            opfDirectory.value + src.replace(/^\.\.\//, ''),
          ]

          let imageUrl: string | null = null

          for (const path of possiblePaths) {
            const imageFile = book.value.file(path)
            if (imageFile) {
              try {
                const imageBlob = await imageFile.async('blob')
                imageUrl = URL.createObjectURL(imageBlob)
                imageCache.value.set(src, imageUrl)
                break
              } catch {
                console.warn(`Failed to load image from path: ${path}`)
              }
            }
          }

          if (imageUrl) {
            img.src = imageUrl
            img.style.cursor = 'pointer'
            img.addEventListener('click', () => {
              window.open(imageUrl, '_blank')
            })
          } else {
            console.warn(`Image not found: ${src}`)
            img.style.display = 'none'
          }
        } catch (error) {
          console.error('Error processing image:', src, error)
          img.style.display = 'none'
        }
      }
    }
  }

  // Load all chapters as continuous content
  const loadAllChapters = async (): Promise<void> => {
    if (chapters.value.length === 0) { return }

    let combinedContent = ''
    let totalCharacterCount = 0
    const chapterCharacterCounts: number[] = []

    for (let i = 0; i < chapters.value.length; i++) {
      const chapter = chapters.value[i]

      // Parse and clean HTML content
      const parser = new DOMParser()
      const doc = parser.parseFromString(chapter.content, 'text/html')
      const body = doc.querySelector('body')

      let chapterContent = ''
      if (body) {
        // Remove script tags and other potentially problematic elements
        const scripts = body.querySelectorAll('script')
        scripts.forEach(script => script.remove())
        chapterContent = body.innerHTML
      } else {
        chapterContent = chapter.content
      }

      // Count characters in this chapter (text content only for accurate counting)
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = chapterContent
      const chapterTextContent = tempDiv.textContent || tempDiv.innerText || ''
      const chapterCharCount = chapterTextContent.length

      chapterCharacterCounts.push(chapterCharCount)
      totalCharacterCount += chapterCharCount

      // Wrap each chapter with a container for navigation
      combinedContent += `
        <div class="chapter-container" id="chapter-${i}" data-chapter-index="${i}" data-char-count="${chapterCharCount}">
          <div class="chapter-content">
            ${chapterContent}
          </div>
        </div>
      `
    }

    // Store character counts for progress calculation
    bookStats.value = {
      totalCharacters: totalCharacterCount,
      chapterCharacterCounts,
      averageWordsPerPage: 250 // Standard estimation
    }

    currentContent.value = combinedContent
    currentChapterIndex.value = 0

    // Process images after content is loaded
    await nextTick()
    await processImagesInDOM()
    await setupScrollListener()
  }

  // Book statistics for progress calculation
  const bookStats = ref<{
    totalCharacters: number
    chapterCharacterCounts: number[]
    averageWordsPerPage: number
  }>({
    totalCharacters: 0,
    chapterCharacterCounts: [],
    averageWordsPerPage: 250
  })

  // Set up scroll listener to track current chapter and detailed progress
  const setupScrollListener = async (): Promise<void> => {
    const contentElement = document.querySelector('.reader-content')
    if (!contentElement) { return }

    const handleScroll = () => {
      const chapterElements = contentElement.querySelectorAll('.chapter-container')
      const scrollTop = contentElement.scrollTop
      const viewportHeight = contentElement.clientHeight
      const scrollCenter = scrollTop + viewportHeight / 2

      // Find which chapter is currently in view
      for (let i = 0; i < chapterElements.length; i++) {
        const element = chapterElements[i] as HTMLElement
        const elementTop = element.offsetTop
        const elementBottom = elementTop + element.offsetHeight

        if (scrollCenter >= elementTop && scrollCenter <= elementBottom) {
          currentChapterIndex.value = i

          // Calculate chapter progress percentage
          const chapterProgress = Math.max(0, Math.min(100,
            ((scrollCenter - elementTop) / element.offsetHeight) * 100
          ))

          currentChapterProgress.value = chapterProgress
          break
        }
      }

      // Calculate total book progress
      const scrollHeight = contentElement.scrollHeight
      const clientHeight = contentElement.clientHeight
      const maxScroll = scrollHeight - clientHeight

      if (maxScroll > 0) {
        totalBookProgress.value = Math.max(0, Math.min(100, (scrollTop / maxScroll) * 100))
      }

      // Calculate character offset approximation
      const totalScrollableHeight = scrollHeight - clientHeight
      if (totalScrollableHeight > 0 && bookStats.value.totalCharacters > 0) {
        const scrollRatio = scrollTop / totalScrollableHeight
        currentCharacterOffset.value = Math.round(bookStats.value.totalCharacters * scrollRatio)
      }
    }

    // Debounce scroll events
    let scrollTimeout: NodeJS.Timeout
    const debouncedScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(handleScroll, 100)
    }

    contentElement.addEventListener('scroll', debouncedScroll)

    // Store cleanup function
    scrollCleanup.value = () => {
      contentElement.removeEventListener('scroll', debouncedScroll)
      clearTimeout(scrollTimeout)
    }

    // Initial calculation
    handleScroll()
  }

  // Navigation functions - now scroll-based
  const goToChapter = (index: number): void => {
    if (index < 0 || index >= chapters.value.length) { return }

    const chapterElement = document.querySelector(`#chapter-${index}`)
    if (chapterElement) {
      chapterElement.scrollIntoView({ behavior: 'instant', block: 'start' })
      currentChapterIndex.value = index
    }
  }

  const nextChapter = (): void => {
    if (currentChapterIndex.value < chapters.value.length - 1) {
      goToChapter(currentChapterIndex.value + 1)
    }
  }

  const prevChapter = (): void => {
    if (currentChapterIndex.value > 0) {
      goToChapter(currentChapterIndex.value - 1)
    }
  }

  // Reset state
  const resetReader = (): void => {
    // Cleanup scroll listener
    if (scrollCleanup.value) {
      scrollCleanup.value()
      scrollCleanup.value = null
    }

    book.value = null
    currentChapterIndex.value = 0
    chapters.value = []
    currentContent.value = ''
    bookTitle.value = 'No book loaded'
    opfDirectory.value = ''
    error.value = null

    // Reset progress tracking
    currentChapterProgress.value = 0
    totalBookProgress.value = 0
    currentCharacterOffset.value = 0
    bookStats.value = {
      totalCharacters: 0,
      chapterCharacterCounts: [],
      averageWordsPerPage: 250
    }

    // Clean up blob URLs
    imageCache.value.forEach(url => URL.revokeObjectURL(url))
    imageCache.value.clear()
  }

  // Get current reading position for saving progress (hybrid approach)
  const getCurrentReadingPosition = () => {
    const contentElement = document.querySelector('.reader-content')
    const scrollTop = contentElement?.scrollTop || 0
    const calcValues = {
      chapterIndex: currentChapterIndex.value,
      chapterProgressPercentage: currentChapterProgress.value,
      totalBookPercentage: totalBookProgress.value,
      characterOffset: currentCharacterOffset.value,
      scrollPosition: scrollTop // Keep for backward compatibility
    }
    return calcValues
  }

  // Set reading position (for restoring saved progress)
  const setReadingPosition = async (
    chapterIndex: number,
    chapterProgressPercentage?: number,
  ) => {
    await nextTick()

    // Method 1: Try to use chapter + chapter progress
    if (chapterProgressPercentage !== undefined && chapterProgressPercentage > 0) {
      const chapterElement = document.querySelector(`#chapter-${chapterIndex}`) as HTMLElement
      if (chapterElement) {
        const chapterHeight = chapterElement.offsetHeight
        const targetScrollWithinChapter = (chapterProgressPercentage / 100) * chapterHeight
        // const extraDesktop = 400
        // const extraMobile = 250
        const targetScrollPosition = chapterElement.offsetTop + targetScrollWithinChapter
        const contentElement = document.querySelector('.reader-content')
        if (contentElement) {
          contentElement.scrollTop = targetScrollPosition
          return
        }
      }
    }
  }

  return {
    // Methods
    parseEpub,
    loadEpubFromFile,
    loadEpubFromBlob,
    extractMetadata,
    loadAllChapters,
    nextChapter,
    prevChapter,
    goToChapter,
    resetReader,
    getCurrentReadingPosition,
    setReadingPosition,
    processImagesInDOM
  }
}
