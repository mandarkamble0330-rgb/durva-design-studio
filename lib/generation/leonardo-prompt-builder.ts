import type { OpenRouterDesignResponse } from '@/types/generation'

const LEONARDO_PROMPT_LIMIT = 1500
const NEGATIVE_PROMPT_LIMIT = 500

function compress(text: string): string {
  return text
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[*_#`>]/g, '')
    .replace(/\b(the|this|that|these|those|which|would|should|could|very|really|quite|rather|also|additionally|furthermore|moreover|however|therefore|consequently)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function truncateToLimit(text: string, limit: number): string {
  if (text.length <= limit) return text
  const truncated = text.slice(0, limit - 3)
  const lastPeriod = truncated.lastIndexOf('.')
  const lastComma = truncated.lastIndexOf(',')
  const breakAt = Math.max(lastPeriod, lastComma)
  if (breakAt > limit * 0.7) return truncated.slice(0, breakAt + 1).trim()
  return truncated.trim() + '...'
}

export function buildLeonardoPrompt(design: OpenRouterDesignResponse): string {
  const sections: string[] = []

  sections.push('Photorealistic 3D render of an exhibition booth.')

  const summary = compress(design.design_summary)
  if (summary) sections.push(summary)

  const layout = compress(design.layout_description)
  if (layout) sections.push(`Layout: ${layout}`)

  const materials = compress(design.materials)
  if (materials) sections.push(`Materials: ${materials}`)

  const colors = compress(design.color_strategy)
  if (colors) sections.push(`Colors: ${colors}`)

  const lighting = compress(design.lighting_plan)
  if (lighting) sections.push(`Lighting: ${lighting}`)

  const renderHints = compress(design.rendering_prompt)
  if (renderHints) sections.push(renderHints)

  let prompt = sections.join(' ')

  if (prompt.length > LEONARDO_PROMPT_LIMIT) {
    const core = [sections[0]]
    let budget = LEONARDO_PROMPT_LIMIT - sections[0].length - 1

    for (let i = 1; i < sections.length; i++) {
      const section = sections[i]
      const available = Math.floor(budget / (sections.length - core.length))
      const shortened = truncateToLimit(section, Math.min(section.length, available))
      if (shortened.length + 1 <= budget) {
        core.push(shortened)
        budget -= shortened.length + 1
      }
    }

    prompt = core.join(' ')
  }

  return truncateToLimit(prompt, LEONARDO_PROMPT_LIMIT)
}

export function buildLeonardoRefinementPrompt(design: OpenRouterDesignResponse): string {
  const parts: string[] = []

  parts.push('Enhance this exhibition booth render to photorealistic quality. Preserve the exact booth structure, layout, and geometry from the reference image.')

  const colors = compress(design.color_strategy)
  if (colors) parts.push(`Brand colors: ${truncateToLimit(colors, 200)}`)

  const materials = compress(design.materials)
  if (materials) parts.push(`Materials: ${truncateToLimit(materials, 200)}`)

  const lighting = compress(design.lighting_plan)
  if (lighting) parts.push(`Lighting: ${truncateToLimit(lighting, 150)}`)

  parts.push('Professional exhibition hall environment, studio lighting, high detail textures, architectural visualization quality.')

  return truncateToLimit(parts.join(' '), LEONARDO_PROMPT_LIMIT)
}

export function buildLeonardoNegativePrompt(design: OpenRouterDesignResponse): string {
  const base = compress(design.negative_prompt)
  const defaults = 'low quality, blurry, distorted, watermark, text overlay, unrealistic proportions'
  const combined = base ? `${base}, ${defaults}` : defaults
  return truncateToLimit(combined, NEGATIVE_PROMPT_LIMIT)
}

export function validateLeonardoPrompt(prompt: string): { valid: boolean; length: number; error?: string } {
  if (!prompt || !prompt.trim()) {
    return { valid: false, length: 0, error: 'Prompt is empty' }
  }
  if (prompt.length > LEONARDO_PROMPT_LIMIT) {
    return { valid: false, length: prompt.length, error: `Prompt exceeds ${LEONARDO_PROMPT_LIMIT} characters (${prompt.length})` }
  }
  return { valid: true, length: prompt.length }
}
