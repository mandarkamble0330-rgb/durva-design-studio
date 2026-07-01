import type { AIProvider, AIProviderRequest, AIProviderResponse, PromptContext } from '@/types/generation'
import { OpenRouterProvider } from './openrouter-provider'
import { LeonardoProvider } from './leonardo-provider'

const providers = new Map<string, AIProvider>()

export function registerProvider(provider: AIProvider) {
  providers.set(provider.name, provider)
}

export function getProvider(name: string): AIProvider | undefined {
  return providers.get(name)
}

export function getOpenRouterProvider(): OpenRouterProvider {
  const provider = providers.get('openrouter')
  if (!provider) {
    throw new Error('OpenRouter provider not registered')
  }
  return provider as OpenRouterProvider
}

export function getLeonardoProvider(): LeonardoProvider {
  const provider = providers.get('leonardo')
  if (!provider) {
    throw new Error('Leonardo provider not registered')
  }
  return provider as LeonardoProvider
}

export function listProviders(): string[] {
  return Array.from(providers.keys())
}

export class PlaceholderProvider implements AIProvider {
  name = 'placeholder'

  async generatePrompt(projectData: PromptContext): Promise<string> {
    void projectData
    return 'AI provider not configured. Connect OpenRouter or Leonardo AI to generate booth designs.'
  }

  async generateImage(request: AIProviderRequest): Promise<AIProviderResponse> {
    void request
    return {
      success: false,
      error: 'No AI provider configured. This is a placeholder that will be replaced with OpenRouter and Leonardo AI integration.',
    }
  }
}

registerProvider(new PlaceholderProvider())
registerProvider(new OpenRouterProvider())
registerProvider(new LeonardoProvider())
