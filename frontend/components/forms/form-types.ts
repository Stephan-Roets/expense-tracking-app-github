import type { EntryImage } from '@/lib/types/database'

export type ExpenseFormMode = 'create' | 'edit' | 'view'

export interface ReceiptSupportProps {
  mode: ExpenseFormMode
  existingImages?: EntryImage[]
  entryId?: string
  onImageUpload?: (file: File, description?: string) => Promise<void>
  onImageDelete?: (imageId: string) => Promise<void>
  onImageReupload?: (imageId: string, file: File) => Promise<void>
  onImageLock?: (imageId: string, reason?: string) => Promise<void>
}

export const existingReceiptCount = (images?: EntryImage[]) => images?.length ?? 0
