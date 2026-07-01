const LEONARDO_API_BASE = 'https://cloud.leonardo.ai/api/rest/v1'
const REQUEST_TIMEOUT_MS = 30_000
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

interface LeonardoUploadInitResponse {
  uploadInitImage?: {
    id: string
    url: string
    fields: string
  }
}

function getLeonardoApiKey(): string {
  const key = process.env.LEONARDO_API_KEY
  if (!key) {
    throw new Error('LEONARDO_API_KEY is not set. Add it to your .env.local file.')
  }
  return key
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt - 1)))
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Leonardo API error (${res.status})`)
        if (attempt === retries) throw lastError
        continue
      }

      return res
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = new Error('Leonardo upload request timed out')
        if (attempt === retries) throw lastError
        continue
      }
      throw err
    }
  }

  throw lastError || new Error('Upload failed after retries')
}

export async function requestLeonardoUploadSlot(
  extension: string,
): Promise<{ id: string; presignedUrl: string; fields: Record<string, string> }> {
  const apiKey = getLeonardoApiKey()

  const res = await fetchWithRetry(`${LEONARDO_API_BASE}/init-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ extension }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Leonardo init-image request failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const json = await res.json() as LeonardoUploadInitResponse
  const data = json.uploadInitImage

  if (!data?.id || !data?.url || !data?.fields) {
    throw new Error('Leonardo did not return valid upload slot data')
  }

  return {
    id: data.id,
    presignedUrl: data.url,
    fields: JSON.parse(data.fields) as Record<string, string>,
  }
}

export async function uploadToPresignedUrl(
  presignedUrl: string,
  fields: Record<string, string>,
  imageData: Blob,
): Promise<void> {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value)
  }
  formData.append('file', imageData)

  const res = await fetchWithRetry(presignedUrl, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to upload image to Leonardo presigned URL (${res.status})`)
  }
}

export async function uploadImageToLeonardo(
  imageUrl: string,
): Promise<string> {
  const imageRes = await fetch(imageUrl)
  if (!imageRes.ok) {
    throw new Error(`Failed to fetch reference image from ${imageUrl}`)
  }

  const contentType = imageRes.headers.get('content-type') ?? 'image/png'
  const extMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
  }
  const extension = extMap[contentType] ?? 'png'

  const blob = await imageRes.blob()
  const slot = await requestLeonardoUploadSlot(extension)
  await uploadToPresignedUrl(slot.presignedUrl, slot.fields, blob)

  return slot.id
}

export async function uploadBlobToLeonardo(
  blob: Blob,
  extension: string,
): Promise<string> {
  const slot = await requestLeonardoUploadSlot(extension)
  await uploadToPresignedUrl(slot.presignedUrl, slot.fields, blob)
  return slot.id
}
