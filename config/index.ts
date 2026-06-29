export const APP_CONFIG = {
  name: 'Durva Design Studio',
  description: 'AI-powered Exhibition Booth Design Platform',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const

export const AI_CONFIG = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
  },
  leonardo: {
    baseUrl: 'https://cloud.leonardo.ai/api/rest/v1',
  },
} as const
