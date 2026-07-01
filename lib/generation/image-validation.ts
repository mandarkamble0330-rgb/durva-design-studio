import type { ImageValidationResult } from '@/types/generation'

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']
const MAX_FILE_SIZE = 20 * 1024 * 1024
const MIN_DIMENSION = 64
const MAX_DIMENSION = 4096

export function validateImageFile(file: File): ImageValidationResult {
  const errors: string[] = []

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    errors.push(`Unsupported file type "${ext || file.type}". Allowed: PNG, JPG, JPEG, WEBP.`)
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size ${(file.size / (1024 * 1024)).toFixed(1)} MB exceeds the 20 MB limit.`)
  }

  if (file.size === 0) {
    errors.push('File is empty or corrupted.')
  }

  const fileType = ALLOWED_IMAGE_TYPES.includes(file.type)
    ? file.type
    : `image/${ext}`

  return {
    valid: errors.length === 0,
    errors,
    fileSize: file.size,
    fileType,
  }
}

export function validateImageDimensions(
  width: number,
  height: number,
): ImageValidationResult {
  const errors: string[] = []

  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    errors.push(`Image too small (${width}x${height}). Minimum dimension is ${MIN_DIMENSION}px.`)
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    errors.push(`Image too large (${width}x${height}). Maximum dimension is ${MAX_DIMENSION}px.`)
  }

  return { valid: errors.length === 0, errors, width, height }
}

export function validateImageUrl(url: string): ImageValidationResult {
  const errors: string[] = []

  if (!url || typeof url !== 'string') {
    errors.push('Image URL is required.')
    return { valid: false, errors }
  }

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      errors.push('Image URL must use HTTP or HTTPS.')
    }
  } catch {
    errors.push('Invalid image URL format.')
  }

  return { valid: errors.length === 0, errors }
}

export async function generateFingerprint(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function generateFingerprintFromUrl(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image for fingerprinting: ${url}`)
  }
  const buffer = await response.arrayBuffer()
  return generateFingerprint(buffer)
}
