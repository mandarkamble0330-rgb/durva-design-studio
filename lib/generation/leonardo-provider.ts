import type {
  AIProvider,
  AIProviderRequest,
  AIProviderResponse,
  PromptContext,
  LeonardoGenerationRequest,
  LeonardoGenerationResult,
  LeonardoBoothView,
} from '@/types/generation'

const LEONARDO_API_BASE = 'https://cloud.leonardo.ai/api/rest/v1'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 300_000
const REQUEST_TIMEOUT_MS = 30_000

interface LeonardoConfig {
  apiKey: string
  modelId: string
}

export class LeonardoConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LeonardoConfigError'
  }
}

function getConfig(): LeonardoConfig {
  const apiKey = process.env.LEONARDO_API_KEY
  const modelId = process.env.LEONARDO_MODEL_ID

  if (!apiKey) {
    throw new LeonardoConfigError('LEONARDO_API_KEY is not set. Add it to your .env.local file.')
  }

  if (!modelId) {
    throw new LeonardoConfigError('LEONARDO_MODEL_ID is not set. Add it to your .env.local file.')
  }

  return { apiKey, modelId }
}

interface LeonardoApiError {
  type: string
  message: string
  retryable: boolean
}

function classifyError(status: number, body: string): LeonardoApiError {
  if (status === 401 || status === 403) {
    return { type: 'auth', message: 'Invalid or expired Leonardo API key. Check your LEONARDO_API_KEY.', retryable: false }
  }
  if (status === 429) {
    return { type: 'rate_limit', message: 'Leonardo rate limit exceeded. Please wait before retrying.', retryable: true }
  }
  if (status === 408 || status === 504) {
    return { type: 'timeout', message: 'Leonardo request timed out.', retryable: true }
  }
  if (status === 502 || status === 503) {
    return { type: 'unavailable', message: 'Leonardo AI is temporarily unavailable.', retryable: true }
  }
  if (status >= 500) {
    return { type: 'server', message: `Leonardo server error (${status}): ${body.slice(0, 200)}`, retryable: true }
  }
  if (status === 400) {
    return { type: 'bad_request', message: `Leonardo rejected the request: ${body.slice(0, 200)}`, retryable: false }
  }
  return { type: 'unknown', message: `Leonardo error (${status}): ${body.slice(0, 200)}`, retryable: false }
}

async function leonardoFetch(
  config: LeonardoConfig,
  endpoint: string,
  options: { method?: string; body?: unknown } = {},
): Promise<unknown> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      const res = await fetch(`${LEONARDO_API_BASE}${endpoint}`, {
        method: options.method ?? 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const body = await res.text()
        const classified = classifyError(res.status, body)
        if (!classified.retryable || attempt === MAX_RETRIES) {
          throw new Error(classified.message)
        }
        lastError = new Error(classified.message)
        continue
      }

      return await res.json()
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = new Error(`Leonardo request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`)
        if (attempt === MAX_RETRIES) throw lastError
        continue
      }

      if (err instanceof TypeError && err.message.includes('fetch')) {
        lastError = new Error('Network error: unable to reach Leonardo AI. Check your internet connection.')
        if (attempt === MAX_RETRIES) throw lastError
        continue
      }

      throw err
    }
  }

  throw lastError || new Error('Leonardo request failed after all retries')
}

function buildGenerationBody(
  config: LeonardoConfig,
  request: LeonardoGenerationRequest,
): Record<string, unknown> {
  const isPhoenix = !!request.modelOverride

  if (isPhoenix) {
    const body: Record<string, unknown> = {
      modelId: request.modelOverride,
      prompt: request.prompt,
      width: request.width ?? 1024,
      height: request.height ?? 768,
      num_images: request.numImages ?? 1,
      contrast: 3.5,
      alchemy: request.alchemy ?? true,
    }

    if (request.ultra !== undefined) {
      body.ultra = request.ultra
    }

    if (request.seed !== undefined) {
      body.seed = request.seed
    }

    if (request.controlnets && request.controlnets.length > 0) {
      body.controlnets = request.controlnets
    }

    return body
  }

  const body: Record<string, unknown> = {
    modelId: config.modelId,
    prompt: request.prompt,
    width: request.width ?? 1024,
    height: request.height ?? 768,
    num_images: request.numImages ?? 1,
    guidance_scale: request.guidanceScale ?? 7,
    promptMagic: request.promptEnhance ?? false,
    highResolution: request.highResolution ?? false,
  }

  if (request.negativePrompt) {
    body.negative_prompt = request.negativePrompt
  }

  if (request.seed !== undefined) {
    body.seed = request.seed
  }

  if (request.presetStyle) {
    body.presetStyle = request.presetStyle
  }

  if (request.scheduler) {
    body.scheduler = request.scheduler
  }

  if (request.initImageId && !request.controlnets) {
    body.init_image_id = request.initImageId
    body.init_strength = request.initStrength ?? 0.4
  }

  return body
}

interface LeonardoGenerationResponse {
  sdGenerationJob?: {
    generationId?: string
  }
}

interface LeonardoGenerationStatusResponse {
  generations_by_pk?: {
    id: string
    status: string
    generated_images?: Array<{
      id: string
      url: string
    }>
    modelId: string
    prompt: string
    negativePrompt: string | null
    imageWidth: number
    imageHeight: number
    inferenceSteps: number | null
    seed: number
    guidanceScale: number | null
    presetStyle: string | null
    scheduler: string | null
    createdAt: string
    generationTime?: number
  }
}

async function createGeneration(
  config: LeonardoConfig,
  request: LeonardoGenerationRequest,
): Promise<string> {
  const body = buildGenerationBody(config, request)

  console.log('[Leonardo] Generation request:', JSON.stringify(body))

  const response = await leonardoFetch(config, '/generations', {
    method: 'POST',
    body,
  }) as LeonardoGenerationResponse

  const generationId = response.sdGenerationJob?.generationId

  if (!generationId) {
    throw new Error('Leonardo did not return a generation ID')
  }

  return generationId
}

async function pollGeneration(
  config: LeonardoConfig,
  generationId: string,
): Promise<LeonardoGenerationStatusResponse['generations_by_pk']> {
  const startTime = Date.now()

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    const response = await leonardoFetch(
      config,
      `/generations/${generationId}`,
    ) as LeonardoGenerationStatusResponse

    const generation = response.generations_by_pk

    if (!generation) {
      throw new Error(`Leonardo generation ${generationId} not found`)
    }

    if (generation.status === 'COMPLETE') {
      return generation
    }

    if (generation.status === 'FAILED') {
      throw new Error(`Leonardo generation failed (ID: ${generationId})`)
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error(`Leonardo generation timed out after ${POLL_TIMEOUT_MS / 1000}s (ID: ${generationId})`)
}

function parseGenerationResult(
  generation: NonNullable<LeonardoGenerationStatusResponse['generations_by_pk']>,
  request: LeonardoGenerationRequest,
): LeonardoGenerationResult {
  return {
    generationId: generation.id,
    imageUrls: (generation.generated_images ?? []).map(img => img.url),
    width: generation.imageWidth,
    height: generation.imageHeight,
    seed: generation.seed,
    modelId: generation.modelId,
    generationTime: generation.generationTime ?? 0,
    status: generation.status as LeonardoGenerationResult['status'],
    metadata: {
      prompt: generation.prompt,
      negativePrompt: generation.negativePrompt ?? '',
      guidanceScale: generation.guidanceScale ?? 7,
      presetStyle: generation.presetStyle ?? null,
      scheduler: generation.scheduler ?? null,
      numImages: (generation.generated_images ?? []).length,
      boothView: request.boothView ?? null,
      initImageId: request.initImageId ?? null,
      initStrength: request.initStrength ?? null,
    },
  }
}

async function uploadInitImage(
  config: LeonardoConfig,
  imageUrl: string,
): Promise<string> {
  const initResponse = await leonardoFetch(config, '/init-image', {
    method: 'POST',
    body: { extension: 'jpg' },
  }) as { uploadInitImage?: { id: string; url: string; fields: string } }

  const uploadData = initResponse.uploadInitImage
  if (!uploadData) {
    throw new Error('Leonardo did not return upload data for init image')
  }

  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch reference image from ${imageUrl}`)
  }
  const imageBlob = await imageResponse.blob()

  const fields = JSON.parse(uploadData.fields) as Record<string, string>
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value)
  }
  formData.append('file', imageBlob)

  const uploadRes = await fetch(uploadData.url, {
    method: 'POST',
    body: formData,
  })

  if (!uploadRes.ok) {
    throw new Error('Failed to upload init image to Leonardo')
  }

  return uploadData.id
}

export class LeonardoProvider implements AIProvider {
  name = 'leonardo'

  async generatePrompt(projectData: PromptContext): Promise<string> {
    void projectData
    return 'Use buildStructuredPrompt() for prompt generation. Leonardo receives rendering_prompt and negative_prompt from the OpenRouter design response.'
  }

  async generateImage(request: AIProviderRequest): Promise<AIProviderResponse> {
    try {
      const config = getConfig()
      const result = await this.generateFromPrompt({
        prompt: request.prompt,
      })

      return {
        success: true,
        imageUrls: result.imageUrls,
        rawResponse: JSON.stringify(result),
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Leonardo generation failed',
      }
    }
  }

  validateConfig(): { valid: boolean; error?: string } {
    try {
      getConfig()
      return { valid: true }
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'Unknown configuration error' }
    }
  }

  async generateFromPrompt(
    request: LeonardoGenerationRequest,
  ): Promise<LeonardoGenerationResult> {
    const config = getConfig()
    const generationId = await createGeneration(config, request)
    const generation = await pollGeneration(config, generationId)
    return parseGenerationResult(generation!, request)
  }

  async generateFromReference(
    referenceImageUrl: string,
    request: Omit<LeonardoGenerationRequest, 'initImageId'>,
  ): Promise<LeonardoGenerationResult> {
    const config = getConfig()
    const initImageId = await uploadInitImage(config, referenceImageUrl)
    return this.generateFromPrompt({
      ...request,
      initImageId,
      initStrength: request.initStrength ?? 0.4,
    })
  }

  async generateBoothView(
    view: LeonardoBoothView,
    renderingPrompt: string,
    negativePrompt: string,
    options?: Partial<LeonardoGenerationRequest>,
  ): Promise<LeonardoGenerationResult> {
    const viewPromptSuffix: Record<LeonardoBoothView, string> = {
      perspective: 'three-quarter perspective view, slightly elevated camera angle',
      front: 'front elevation view, straight-on camera, centered',
      left: 'left side view, 90-degree angle from the left',
      right: 'right side view, 90-degree angle from the right',
      rear: 'rear view, showing the back of the booth structure',
    }

    const prompt = `${renderingPrompt}. Camera: ${viewPromptSuffix[view]}.`

    return this.generateFromPrompt({
      prompt,
      negativePrompt,
      boothView: view,
      width: options?.width ?? 1024,
      height: options?.height ?? 768,
      guidanceScale: options?.guidanceScale ?? 7,
      numImages: options?.numImages ?? 1,
      seed: options?.seed,
      presetStyle: options?.presetStyle,
      scheduler: options?.scheduler,
      highResolution: options?.highResolution ?? true,
      promptEnhance: options?.promptEnhance,
      initImageId: options?.initImageId,
      initStrength: options?.initStrength,
    })
  }
}
