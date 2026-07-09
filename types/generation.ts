export type GenerationStatus =
  | 'draft'
  | 'queued'
  | 'preparing_prompt'
  | 'ready_for_ai'
  | 'generating'
  | 'preparing_reference'
  | 'sending_to_leonardo'
  | 'rendering_images'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface GenerationJob {
  id: string
  project_id: string
  user_id: string
  status: GenerationStatus
  prompt: string | null
  ai_provider: string | null
  ai_model: string | null
  ai_response: string | null
  image_urls: string[]
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
}

export type GenerationJobInsert = Pick<GenerationJob, 'project_id' | 'user_id'>

export interface GenerationHistoryEntry {
  id: string
  job: GenerationJob
  timestamp: string
}

export interface AIProviderRequest {
  prompt: string
  projectId: string
  jobId: string
  metadata: Record<string, unknown>
}

export interface AIProviderResponse {
  success: boolean
  imageUrls?: string[]
  rawResponse?: string
  error?: string
}

export interface AIProvider {
  name: string
  generatePrompt(projectData: PromptContext): Promise<string>
  generateImage(request: AIProviderRequest): Promise<AIProviderResponse>
}

export interface PromptContext {
  projectName: string
  clientName: string
  companyName: string
  exhibitionName: string
  industryType: string
  eventDate: string | null
  boothSize: string
  ceilingHeight: string
  meetingRooms: number
  entryExitPoints: number
  designTheme: string
  primaryColor: string
  secondaryColor: string
  zones: string[]
  flooringType: string
  lightingPreferences: string[]
  logoUrl: string | null
  referenceImages: string[]
  referencePdfs: string[]
  referencePdfPages: string
  additionalRequirements: string
}

export interface StructuredPrompt {
  systemPrompt: string
  userPrompt: string
  fullPrompt: string
  sections: PromptSections
  metadata: PromptMetadata
}

export interface PromptSections {
  system: string
  design: string
  technicalConstraints: string
  styleInstructions: string
  referenceInstructions: string
  outputInstructions: string
}

export interface PromptMetadata {
  projectId: string
  projectName: string
  generatedAt: string
  sectionCount: number
  totalCharacters: number
  hasLogo: boolean
  hasReferenceImages: boolean
  hasReferencePdfs: boolean
  zoneCount: number
  lightingCount: number
  cameraViewId?: import('@/types/camera').CameraViewId
}

export interface OpenRouterDesignResponse {
  design_summary: string
  design_concept: string
  layout_description: string
  color_strategy: string
  materials: string
  lighting_plan: string
  visitor_flow: string
  rendering_prompt: string
  negative_prompt: string
}

export const OPENROUTER_RESPONSE_KEYS: (keyof OpenRouterDesignResponse)[] = [
  'design_summary',
  'design_concept',
  'layout_description',
  'color_strategy',
  'materials',
  'lighting_plan',
  'visitor_flow',
  'rendering_prompt',
  'negative_prompt',
]

export interface ReferenceImage {
  id: string
  project_id: string
  user_id: string
  image_url: string
  init_image_id: string | null
  fingerprint: string
  width: number
  height: number
  file_size: number
  file_type: string
  is_primary: boolean
  booth_view: LeonardoBoothView | null
  uploaded_at: string
  created_at: string
}

export type ReferenceImageInsert = Omit<ReferenceImage, 'id' | 'created_at'>

export interface ImageValidationResult {
  valid: boolean
  errors: string[]
  width?: number
  height?: number
  fileSize?: number
  fileType?: string
}

export type LeonardoBoothView =
  | 'perspective'
  | 'front'
  | 'left'
  | 'right'
  | 'rear'

export interface LeonardoControlNet {
  initImageId: string
  initImageType: 'UPLOADED' | 'GENERATED'
  preprocessorId: number
  strengthType: 'Low' | 'Mid' | 'High'
}

export interface LeonardoGenerationRequest {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  guidanceScale?: number
  seed?: number
  numImages?: number
  promptEnhance?: boolean
  presetStyle?: string
  scheduler?: string
  highResolution?: boolean
  initImageId?: string
  initStrength?: number
  boothView?: LeonardoBoothView
  controlnets?: LeonardoControlNet[]
  alchemy?: boolean
  ultra?: boolean
  modelOverride?: string
}

export interface LeonardoGenerationResult {
  generationId: string
  imageUrls: string[]
  width: number
  height: number
  seed: number
  modelId: string
  generationTime: number
  status: 'COMPLETE' | 'FAILED' | 'PENDING'
  metadata: {
    prompt: string
    negativePrompt: string
    guidanceScale: number
    presetStyle: string | null
    scheduler: string | null
    numImages: number
    boothView: LeonardoBoothView | null
    initImageId: string | null
    initStrength: number | null
  }
}

export const GENERATION_STATUS_CONFIG: Record<
  GenerationStatus,
  { label: string; color: string; description: string }
> = {
  draft: {
    label: 'Draft',
    color: 'bg-muted text-muted-foreground',
    description: 'Job created, waiting to start',
  },
  queued: {
    label: 'Queued',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    description: 'In queue, waiting for processing',
  },
  preparing_prompt: {
    label: 'Preparing Prompt',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    description: 'Building AI prompt from project data',
  },
  ready_for_ai: {
    label: 'Sending to OpenRouter',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    description: 'Sending prompt to OpenRouter AI',
  },
  generating: {
    label: 'Waiting for AI Response',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    description: 'Waiting for AI response from OpenRouter',
  },
  preparing_reference: {
    label: 'Preparing Reference',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    description: 'Preparing reference image for Leonardo',
  },
  sending_to_leonardo: {
    label: 'Sending to Leonardo',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    description: 'Sending generation request to Leonardo AI',
  },
  rendering_images: {
    label: 'Rendering Images',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    description: 'Leonardo is rendering booth images',
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    description: 'Design generated successfully',
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    description: 'Generation failed',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    description: 'Generation was cancelled',
  },
}

export const GENERATION_STATUS_ORDER: GenerationStatus[] = [
  'draft',
  'queued',
  'preparing_prompt',
  'ready_for_ai',
  'generating',
  'preparing_reference',
  'sending_to_leonardo',
  'rendering_images',
  'completed',
]
