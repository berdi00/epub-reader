<template>
  <div class="flex justify-between items-center">
    <p class="text-primary">{{ email }}</p>
    <Button
      class="bg-primary text-white"
      variant="outline"
      @click="triggerFileUpload"
      :disabled="isUploading"
    >
      <Plus v-if="!isUploading" class="w-4 h-4" />
      <div v-else class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
    </Button>
    <input
      ref="fileInput"
      type="file"
      @change="handleFileUpload"
      accept=".epub"
      id="epub-file"
      class="hidden"
    >
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/components/ui/button/Button.vue'
import { Plus } from 'lucide-vue-next'
import { supabase } from '@/supabase' // Adjust path to your supabase client
import ePub from 'epubjs'

defineProps<{
  email: string
}>()

const emit = defineEmits<{
  bookUploaded: [book: any]
  uploadError: [error: string]
}>()

const fileInput = ref<HTMLInputElement>()
const isUploading = ref(false)

const triggerFileUpload = (): void => {
  fileInput.value?.click()
}

// const extractBookMetadata = async (file: File) => {
//   try {
//     // Use the composable to extract proper metadata
//     const metadata = await loadEpubFromFile(file)

//     // Reset the reader state since we only want metadata
//     resetReader()

//     return {
//       title: metadata.title,
//       author: metadata.author || 'Unknown',
//       fileName: file.name,
//       fileSize: file.size,
//       totalChapters: metadata.totalChapters,
//       language: metadata.language,
//       publisher: metadata.publisher,
//       description: metadata.description
//     }
//   } catch (error) {
//     console.warn('Failed to extract metadata, using fallback:', error)
//     // Fallback to basic info if parsing fails
//     const fileName = file.name.replace('.epub', '')
//     return {
//       title: fileName,
//       author: 'Unknown',
//       fileName: file.name,
//       fileSize: file.size,
//       totalChapters: null,
//       language: null,
//       publisher: null,
//       description: null
//     }
//   }
// }

const handleFileUpload = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) { return }

  // Validate file type
  if (!file.name.toLowerCase().endsWith('.epub')) {
    emit('uploadError', 'Please select a valid EPUB file')
    return
  }

  // Validate file size (e.g., max 50MB)
  const maxSizeInBytes = 50 * 1024 * 1024
  if (file.size > maxSizeInBytes) {
    emit('uploadError', 'File size must be less than 50MB')
    return
  }

  try {
    isUploading.value = true

    // Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      emit('uploadError', 'You must be logged in to upload files')
      return
    }

    // Check if user already has 3 books
    const { data: existingBooks, error: countError } = await supabase
      .from('books')
      .select('id')
      .eq('user_id', user.id)

    if (countError) {
      emit('uploadError', 'Failed to check existing books')
      return
    }

    if (existingBooks && existingBooks.length >= 3) {
      emit('uploadError', 'Maximum 3 books allowed. Please delete a book first.')
      return
    }

    // Create unique file path
    const fileExt = 'epub'
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('epub-files') // Make sure this bucket exists in your Supabase Storage
      .upload(fileName, file)

    if (uploadError) {
      emit('uploadError', `Upload failed: ${uploadError.message}`)
      return
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('epub-files')
      .getPublicUrl(fileName)

    const book = ePub(publicUrl)
    await book.ready

    // Get the cover URL (string)
    const coverUrl = await book.coverUrl()
    if (!coverUrl) {
      emit('uploadError', 'No cover found in this book')
      return
    }

    // Fetch the image as Blob
    const response = await fetch(coverUrl)
    const coverBlob = await response.blob()

    // Convert to File (optional, but Supabase accepts File)
    const coverFile = new File([coverBlob], `${book.path || 'book'}-cover.jpg`, {
      type: coverBlob.type || 'image/jpeg',
    })

    // Upload cover to Supabase Storage
    const { data: coverData, error: uploadCoverError } = await supabase.storage
      .from('book_covers') // Make sure this bucket exists in your Supabase Storage
      .upload(`covers/${coverFile.name}`, coverFile, {
        upsert: true, // overwrite if exists
        contentType: coverFile.type,
      })

    if (uploadCoverError) {
      emit('uploadError', `Upload failed: ${uploadCoverError.message}`)
      return
    }

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('book_covers')
      .getPublicUrl(`covers/${coverFile.name}`)

    const coverPublicUrl = publicUrlData.publicUrl
    console.log('Cover public URL:', coverPublicUrl)

    const metadata = await book.loaded.metadata

    // Insert book record into database
    const { data: bookData, error: dbError } = await supabase
      .from('books')
      .insert({
        user_id: user.id,
        path: publicUrl,
        title: metadata.title,
        author: metadata.creator,
        cover_url: coverPublicUrl
      })
      .select()
      .single()

    if (dbError) {
      // If database insertion fails, clean up the uploaded file
      await supabase.storage.from('epub-files').remove([fileName])
      emit('uploadError', `Database error: ${dbError.message}`)
      return
    }

    // Clear the input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
    emit('bookUploaded', bookData)
  } catch (error) {
    console.error('Upload error:', error)
    emit('uploadError', 'An unexpected error occurred during upload')
  } finally {
    isUploading.value = false
  }
}
</script>
