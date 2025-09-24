export interface Book {
  id: string
  path: string
  uploaded_at: string
  title: string,
  author: string,
  cover_url: string
}
export interface ReadingProgress {
  book_id: string
  user_id: string;
  cfi: string
  progress: number
  href: string,
  last_read_at: string
}
