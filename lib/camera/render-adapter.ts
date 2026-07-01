import type {
  CameraViewId,
  CameraView,
  CameraViewRequest,
  CameraViewResult,
} from '@/types/camera'

export interface RenderAdapter {
  readonly name: string
  supportsView(viewId: CameraViewId): boolean
  render(view: CameraView, request: CameraViewRequest): Promise<CameraViewResult>
  validateConfig(): { valid: boolean; error?: string }
}

const adapters = new Map<string, RenderAdapter>()

export function registerRenderAdapter(adapter: RenderAdapter): void {
  adapters.set(adapter.name, adapter)
}

export function getRenderAdapter(name: string): RenderAdapter {
  const adapter = adapters.get(name)
  if (!adapter) {
    throw new Error(`Render adapter "${name}" is not registered`)
  }
  return adapter
}

export function listRenderAdapters(): string[] {
  return Array.from(adapters.keys())
}

export function getDefaultRenderAdapter(): RenderAdapter | null {
  const first = adapters.values().next()
  return first.done ? null : first.value
}
