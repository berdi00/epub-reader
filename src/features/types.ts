export interface Book {
  id: string
  title: string
  author: string
  file_name: string
  file_path: string
  file_size: number
  total_chapters?: number
  language?: string
  publisher?: string
  description?: string
  uploaded_at: string
}

export interface ReadingProgress {
  book_id: string
  chapter_index: number
  chapter_progress_percentage: number
  total_book_percentage: number
  character_offset: number
  last_read_at: string
}
