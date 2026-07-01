import type { SupabaseClient } from '@supabase/supabase-js'
import type { Project } from '@/types'
import type { GenerationJob, GenerationStatus, OpenRouterDesignResponse, LeonardoControlNet } from '@/types/generation'
import type { CameraViewId } from '@/types/camera'
import { buildStructuredPrompt } from './prompt-builder'
import { getOpenRouterProvider, getLeonardoProvider } from './provider-registry'
import { ReferenceImageManager } from './reference-image-manager'
import { buildLeonardoPrompt, buildLeonardoRefinementPrompt, buildLeonardoNegativePrompt, validateLeonardoPrompt } from './leonardo-prompt-builder'

interface OrchestratorResult {
  success: boolean
  job?: GenerationJob
  error?: string
}

async function updateJob(
  supabase: SupabaseClient,
  jobId: string,
  status: GenerationStatus,
  extra?: Record<string, unknown>,
) {
  await supabase
    .from('generation_jobs')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', jobId)
}

async function fetchJob(supabase: SupabaseClient, jobId: string): Promise<GenerationJob | null> {
  const { data } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single()
  return (data as GenerationJob) ?? null
}

export async function runFullPipeline(
  supabase: SupabaseClient,
  jobId: string,
  project: Project,
  userId: string,
  cameraViewId: CameraViewId = 'front',
): Promise<OrchestratorResult> {
  const projectId = project.id

  console.log('[Orchestrator] Pipeline started with cameraViewId:', cameraViewId)

  try {
    // Step 1: Build prompt
    await updateJob(supabase, jobId, 'preparing_prompt', { started_at: new Date().toISOString() })

    const structured = buildStructuredPrompt(project, cameraViewId)

    await updateJob(supabase, jobId, 'ready_for_ai', {
      prompt: structured.fullPrompt,
      ai_provider: 'openrouter',
      metadata: {
        cameraViewId,
        structured_prompt: {
          systemPrompt: structured.systemPrompt,
          userPrompt: structured.userPrompt,
          sections: structured.sections,
        },
        prompt_metadata: structured.metadata,
      },
    })

    // Step 2: Call OpenRouter
    const openRouter = getOpenRouterProvider()
    const configCheck = openRouter.validateConfig()
    if (!configCheck.valid) {
      await updateJob(supabase, jobId, 'failed', { error_message: configCheck.error })
      return { success: false, error: configCheck.error }
    }

    await updateJob(supabase, jobId, 'generating')

    const aiResult = await openRouter.generateDesign({
      systemPrompt: structured.systemPrompt,
      userPrompt: structured.userPrompt,
    })

    if (!aiResult.success || !aiResult.response) {
      const errorMsg = aiResult.error || 'AI generation failed'
      await updateJob(supabase, jobId, 'failed', {
        error_message: errorMsg,
        ai_model: aiResult.model || null,
        ai_response: aiResult.rawResponse || null,
        metadata: {
          structured_prompt: {
            systemPrompt: structured.systemPrompt,
            userPrompt: structured.userPrompt,
            sections: structured.sections,
          },
          prompt_metadata: structured.metadata,
          ai_error: aiResult.error,
          retry_count: aiResult.retryCount ?? 0,
        },
      })
      return { success: false, error: errorMsg }
    }

    const designResponse = aiResult.response as OpenRouterDesignResponse

    // Save OpenRouter response before proceeding to Leonardo
    await supabase
      .from('generation_jobs')
      .update({
        ai_model: aiResult.model || null,
        ai_response: JSON.stringify(designResponse),
        metadata: {
          cameraViewId,
          structured_prompt: {
            systemPrompt: structured.systemPrompt,
            userPrompt: structured.userPrompt,
            sections: structured.sections,
          },
          prompt_metadata: structured.metadata,
          ai_response_structured: designResponse,
          ai_usage: aiResult.usage || {},
          ai_model_used: aiResult.model,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    // Step 3: Prepare reference image
    await updateJob(supabase, jobId, 'preparing_reference')

    const refManager = new ReferenceImageManager(supabase, projectId, userId)
    const primaryRef = await refManager.getPrimary()
    let referenceImageUrl: string | null = null

    if (primaryRef?.init_image_id) {
      referenceImageUrl = null // already uploaded, use init_image_id directly below
    } else if (primaryRef?.image_url) {
      referenceImageUrl = primaryRef.image_url
    } else if (project.reference_images && project.reference_images.length > 0) {
      referenceImageUrl = project.reference_images[0]
    }

    console.log('[Orchestrator] Reference: primaryRef init_image_id:', primaryRef?.init_image_id ?? 'none', 'referenceImageUrl:', referenceImageUrl ?? 'none', 'project.reference_images count:', project.reference_images?.length ?? 0)

    // Step 4: Send to Leonardo
    await updateJob(supabase, jobId, 'sending_to_leonardo')

    const leonardo = getLeonardoProvider()
    const leonardoConfig = leonardo.validateConfig()
    console.log('[Orchestrator] Leonardo config valid:', leonardoConfig.valid, leonardoConfig.error ?? '')
    if (!leonardoConfig.valid) {
      console.log('[Orchestrator] Leonardo not configured, completing with OpenRouter only')
      await supabase
        .from('generation_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      const job = await fetchJob(supabase, jobId)
      return { success: true, job: job ?? undefined }
    }

    // Step 5: Generate images with Leonardo
    await updateJob(supabase, jobId, 'rendering_images')

    const initImageId = primaryRef?.init_image_id ?? null
    const useReference = !!(initImageId || referenceImageUrl)

    const leonardoPrompt = useReference
      ? buildLeonardoRefinementPrompt(designResponse)
      : buildLeonardoPrompt(designResponse)
    const leonardoNegative = buildLeonardoNegativePrompt(designResponse)
    const promptCheck = validateLeonardoPrompt(leonardoPrompt)
    console.log('[Orchestrator] Leonardo mode:', useReference ? 'image-to-image' : 'text-to-image', 'prompt length:', promptCheck.length)

    if (!promptCheck.valid) {
      await updateJob(supabase, jobId, 'failed', {
        error_message: `Leonardo prompt validation failed: ${promptCheck.error}`,
      })
      return { success: false, error: promptCheck.error }
    }

    const PHOENIX_MODEL_ID = 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3'
    const CONTENT_REF_PREPROCESSOR = 364

    let leonardoResult: Awaited<ReturnType<typeof leonardo.generateFromPrompt>>

    if (useReference) {
      let uploadedImageId = initImageId
      if (!uploadedImageId && referenceImageUrl) {
        const { uploadImageToLeonardo } = await import('./image-upload-service')
        uploadedImageId = await uploadImageToLeonardo(referenceImageUrl)
        console.log('[Orchestrator] Uploaded reference to Leonardo, id:', uploadedImageId)
      }

      if (uploadedImageId) {
        const controlnets: LeonardoControlNet[] = [{
          initImageId: uploadedImageId,
          initImageType: 'UPLOADED',
          preprocessorId: CONTENT_REF_PREPROCESSOR,
          strengthType: 'High',
        }]

        console.log('[Orchestrator] Using Phoenix + ControlNet Content Reference, controlnets:', JSON.stringify(controlnets))

        leonardoResult = await leonardo.generateFromPrompt({
          prompt: leonardoPrompt,
          negativePrompt: leonardoNegative,
          width: 1024,
          height: 768,
          numImages: 1,
          guidanceScale: 4,
          highResolution: true,
          controlnets,
          alchemy: true,
          modelOverride: PHOENIX_MODEL_ID,
        })
      } else {
        leonardoResult = await leonardo.generateFromPrompt({
          prompt: leonardoPrompt,
          negativePrompt: leonardoNegative,
          width: 1024,
          height: 768,
          numImages: 1,
          guidanceScale: 7,
          highResolution: true,
        })
      }
    } else {
      leonardoResult = await leonardo.generateFromPrompt({
        prompt: leonardoPrompt,
        negativePrompt: leonardoNegative,
        width: 1024,
        height: 768,
        numImages: 1,
        guidanceScale: 7,
        highResolution: true,
      })
    }

    console.log('[Orchestrator] Leonardo result:', JSON.stringify({ status: leonardoResult.status, imageUrls: leonardoResult.imageUrls, generationId: leonardoResult.generationId }))

    if (leonardoResult.status === 'FAILED') {
      await updateJob(supabase, jobId, 'failed', {
        error_message: `Leonardo image generation failed (ID: ${leonardoResult.generationId})`,
      })
      return { success: false, error: 'Leonardo image generation failed' }
    }

    // Step 6: Save completed result
    const saveResult = await supabase
      .from('generation_jobs')
      .update({
        status: 'completed',
        image_urls: leonardoResult.imageUrls,
        completed_at: new Date().toISOString(),
        metadata: {
          cameraViewId,
          structured_prompt: {
            systemPrompt: structured.systemPrompt,
            userPrompt: structured.userPrompt,
            sections: structured.sections,
          },
          prompt_metadata: structured.metadata,
          ai_response_structured: designResponse,
          ai_usage: aiResult.usage || {},
          ai_model_used: aiResult.model,
          leonardo: {
            generationId: leonardoResult.generationId,
            modelId: leonardoResult.modelId,
            seed: leonardoResult.seed,
            generationTime: leonardoResult.generationTime,
            width: leonardoResult.width,
            height: leonardoResult.height,
            usedReference: useReference,
            initImageId: initImageId ?? leonardoResult.metadata?.initImageId ?? null,
            metadata: leonardoResult.metadata,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    console.log('[Orchestrator] Save result error:', saveResult.error ?? 'none')

    const finalJob = await fetchJob(supabase, jobId)
    console.log('[Orchestrator] Final job image_urls:', finalJob?.image_urls)
    return { success: true, job: finalJob ?? undefined }
  } catch (err) {
    console.error('[Orchestrator] Pipeline error:', err)
    const errorMsg = err instanceof Error ? err.message : 'Pipeline failed unexpectedly'
    await updateJob(supabase, jobId, 'failed', { error_message: errorMsg })
    return { success: false, error: errorMsg }
  }
}
