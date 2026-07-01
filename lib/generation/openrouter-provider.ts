import type {
  AIProvider,
  AIProviderRequest,
  AIProviderResponse,
  PromptContext,
  OpenRouterDesignResponse,
} from '@/types/generation'
import { OPENROUTER_RESPONSE_KEYS as RESPONSE_KEYS } from '@/types/generation'

interface OpenRouterConfig {
  apiKey: string
  model: string
}

interface OpenRouterError {
  type: string
  message: string
  retryable: boolean
}

function getConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL

  if (!apiKey) {
    throw new OpenRouterConfigError('OPENROUTER_API_KEY is not set. Add it to your .env.local file.')
  }

  if (!model) {
    throw new OpenRouterConfigError('OPENROUTER_MODEL is not set. Add it to your .env.local file (e.g. google/gemini-2.0-flash-001).')
  }

  return { apiKey, model }
}

export class OpenRouterConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OpenRouterConfigError'
  }
}

function classifyError(status: number, body: string): OpenRouterError {
  if (status === 401 || status === 403) {
    return { type: 'auth', message: 'Invalid or expired OpenRouter API key. Check your OPENROUTER_API_KEY.', retryable: false }
  }
  if (status === 429) {
    return { type: 'rate_limit', message: 'OpenRouter rate limit exceeded. Please wait before retrying.', retryable: true }
  }
  if (status === 408 || status === 504) {
    return { type: 'timeout', message: 'OpenRouter request timed out.', retryable: true }
  }
  if (status === 502 || status === 503) {
    return { type: 'unavailable', message: 'OpenRouter is temporarily unavailable.', retryable: true }
  }
  if (status >= 500) {
    return { type: 'server', message: `OpenRouter server error (${status}): ${body.slice(0, 200)}`, retryable: true }
  }
  return { type: 'unknown', message: `OpenRouter error (${status}): ${body.slice(0, 200)}`, retryable: false }
}

function validateDesignResponse(data: unknown): OpenRouterDesignResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('AI response is not a valid JSON object')
  }

  const obj = data as Record<string, unknown>
  const result: Record<string, string> = {}

  for (const key of RESPONSE_KEYS) {
    const value = obj[key]
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`AI response missing or empty field: "${key}"`)
    }
    result[key] = value.trim()
  }

  return result as unknown as OpenRouterDesignResponse
}

function extractJsonFromResponse(text: string): unknown {
  const cleaned = text.trim()

  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim())
  }

  const braceStart = cleaned.indexOf('{')
  const braceEnd = cleaned.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    return JSON.parse(cleaned.slice(braceStart, braceEnd + 1))
  }

  return JSON.parse(cleaned)
}

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

async function callOpenRouter(
  config: OpenRouterConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ content: string; model: string; usage: Record<string, unknown> }> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120_000)

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Durva Design Studio',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
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

      const json = await res.json()
      const choice = json.choices?.[0]

      if (!choice?.message?.content) {
        throw new Error('OpenRouter returned an empty response')
      }

      return {
        content: choice.message.content,
        model: json.model || config.model,
        usage: json.usage || {},
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        lastError = new Error('OpenRouter request timed out after 120 seconds')
        if (attempt === MAX_RETRIES) throw lastError
        continue
      }

      if (err instanceof TypeError && err.message.includes('fetch')) {
        lastError = new Error('Network error: unable to reach OpenRouter. Check your internet connection.')
        if (attempt === MAX_RETRIES) throw lastError
        continue
      }

      throw err
    }
  }

  throw lastError || new Error('OpenRouter request failed after all retries')
}

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter'

  async generatePrompt(projectData: PromptContext): Promise<string> {
    void projectData
    return 'Use buildStructuredPrompt() instead — the OpenRouter provider receives pre-built prompts via generateDesign().'
  }

  async generateImage(request: AIProviderRequest): Promise<AIProviderResponse> {
    void request
    return {
      success: false,
      error: 'OpenRouter is a text AI provider. Image generation will be handled by Leonardo AI.',
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

  async generateDesign(
    structured: { systemPrompt: string; userPrompt: string },
  ): Promise<{
    success: boolean
    response?: OpenRouterDesignResponse
    rawResponse?: string
    model?: string
    usage?: Record<string, unknown>
    error?: string
    retryCount?: number
  }> {
    const config = getConfig()

    const jsonInstruction = [
      structured.userPrompt,
      '',
      '---',
      '',
      'IMPORTANT: Respond with ONLY a valid JSON object containing these exact keys:',
      '- design_summary: A concise overview of the booth design concept (2-3 sentences)',
      '- design_concept: Detailed description of the overall design vision and aesthetic approach',
      '- layout_description: Detailed spatial layout describing placement of zones, walkways, and focal points',
      '- color_strategy: How brand colors are applied across surfaces, signage, lighting, and materials',
      '- materials: Specific materials for walls, counters, floors, displays with finish descriptions',
      '- lighting_plan: Complete lighting design including fixture types, placement, and mood',
      '- visitor_flow: How visitors move through the booth from entry to exit',
      '- rendering_prompt: A detailed image generation prompt for creating a photorealistic 3D render of this booth design. Include camera angle, lighting, materials, people, and atmosphere.',
      '- negative_prompt: Elements to exclude from the rendering (low quality, artifacts, unrealistic elements)',
      '',
      'Each field must be a non-empty string. Do not include any text outside the JSON object.',
    ].join('\n')

    const result = await callOpenRouter(config, structured.systemPrompt, jsonInstruction)

    let parsed: unknown
    try {
      parsed = extractJsonFromResponse(result.content)
    } catch {
      return {
        success: false,
        rawResponse: result.content,
        model: result.model,
        error: 'Failed to parse AI response as JSON. The model returned invalid JSON.',
      }
    }

    try {
      const validated = validateDesignResponse(parsed)
      return {
        success: true,
        response: validated,
        rawResponse: result.content,
        model: result.model,
        usage: result.usage,
      }
    } catch (err) {
      return {
        success: false,
        rawResponse: result.content,
        model: result.model,
        error: err instanceof Error ? err.message : 'Response validation failed',
      }
    }
  }
}
