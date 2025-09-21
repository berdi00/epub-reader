export interface Chapter {
  id: string
  href: string
  content: string
  title: string
}

export interface ManifestItem {
  href: string
  mediaType: string
}

export interface ManifestMap {
  [id: string]: ManifestItem
}

export interface BookMetadata {
  title: string
  author?: string
  language?: string
  publisher?: string
  description?: string
  totalChapters: number
}
