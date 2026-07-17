import type { Scene } from '@/types/scene-graph'
import type { OrchestratorOptions, OrchestratorResult, OrchestratorJob, RenderProgress } from './orchestrator-types'
import { runRenderEngine } from '@/lib/render/render-engine'
import { generateRenderScript } from '@/lib/render/render-script'
import { runBlenderProcess } from '@/lib/blender-runtime/process-runner'
import { buildOutputStructure, ensureOutputDirs, buildOutputPath, buildThumbnailPath, getFileSizeBytes, generateThumbnailScript } from './output-manager'
import { createManifestEntry, createManifest, writeManifest } from './render-manifest'

function generateSingleJobScript(
  job: OrchestratorJob,
  blendFilePath: string,
  config: import('@/lib/render/render-types').RenderConfiguration
): string {
  const pyStr = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  const pyBool = (b: boolean) => b ? 'True' : 'False'

  const r = config.resolution
  const s = config.samples
  const d = config.denoising
  const cm = config.colorManagement
  const f = config.film
  const cam = job.camera

  const lines: string[] = [
    'import bpy',
    'import sys',
    'import os',
    '',
    `bpy.ops.wm.open_mainfile(filepath=${pyStr(blendFilePath)})`,
    '',
    `bpy.context.scene.render.engine = ${pyStr(config.engine)}`,
    `bpy.context.scene.render.resolution_x = ${r.width}`,
    `bpy.context.scene.render.resolution_y = ${r.height}`,
    `bpy.context.scene.render.resolution_percentage = ${r.scale}`,
    '',
  ]

  if (config.engine === 'CYCLES') {
    lines.push(
      `bpy.context.scene.cycles.samples = ${s.render}`,
      `bpy.context.scene.cycles.preview_samples = ${s.viewport}`,
      `bpy.context.scene.cycles.max_bounces = ${config.maxBounces}`,
      `bpy.context.scene.cycles.use_denoising = ${pyBool(d.enabled)}`,
    )
    if (d.enabled) {
      lines.push(
        `bpy.context.scene.cycles.denoiser = ${pyStr(d.algorithm)}`,
        `bpy.context.scene.cycles.denoising_prefilter = ${pyStr(d.prefilter)}`,
      )
    }
  } else {
    lines.push(
      `bpy.context.scene.eevee.taa_render_samples = ${s.render}`,
      `bpy.context.scene.eevee.taa_samples = ${s.viewport}`,
    )
  }

  lines.push(
    '',
    `bpy.context.scene.render.image_settings.file_format = ${pyStr(config.fileFormat)}`,
  )
  if (config.fileFormat === 'PNG') {
    lines.push(
      `bpy.context.scene.render.image_settings.color_mode = ${pyStr(f.transparentBackground ? 'RGBA' : 'RGB')}`,
      `bpy.context.scene.render.image_settings.compression = ${Math.round((100 - config.fileQuality) * 0.15)}`,
    )
  } else if (config.fileFormat === 'JPEG') {
    lines.push(`bpy.context.scene.render.image_settings.quality = ${config.fileQuality}`)
  }

  lines.push(
    '',
    `bpy.context.scene.render.film_transparent = ${pyBool(f.transparentBackground)}`,
    `bpy.context.scene.render.filter_size = ${f.filterSize}`,
    '',
    `bpy.context.scene.display_settings.display_device = ${pyStr(cm.displayDevice)}`,
    `bpy.context.scene.view_settings.view_transform = ${pyStr(cm.viewTransform)}`,
    `bpy.context.scene.view_settings.look = ${pyStr(cm.look)}`,
    `bpy.context.scene.view_settings.exposure = ${cm.exposure}`,
    `bpy.context.scene.view_settings.gamma = ${cm.gamma}`,
    '',
    `bpy.context.scene.render.use_motion_blur = ${pyBool(config.useMotionBlur)}`,
    '',
    `cam_obj = None`,
    `for obj in bpy.data.objects:`,
    `    if obj.type == 'CAMERA' and obj.name == ${pyStr(cam.cameraName)}:`,
    `        cam_obj = obj`,
    `        break`,
    `if cam_obj:`,
    `    bpy.context.scene.camera = cam_obj`,
    `else:`,
    `    print("WARN: Camera not found, using active camera")`,
    '',
    `os.makedirs(os.path.dirname(${pyStr(job.outputPath)}), exist_ok=True)`,
    `bpy.context.scene.render.filepath = ${pyStr(job.outputPath)}`,
    `bpy.ops.render.render(write_still=True)`,
    `print(f"RENDER_COMPLETE:${cam.viewId}:${pyStr(job.outputPath).slice(1, -1)}")`,
    `sys.exit(0)`,
  )

  return lines.join('\n')
}

export async function runRenderOrchestrator(
  scene: Scene,
  options: OrchestratorOptions
): Promise<OrchestratorResult> {
  const fs = require('fs')
  const path = require('path')
  const errors: string[] = []
  const warnings: string[] = []
  const startTime = Date.now()

  const outputStructure = buildOutputStructure(options.outputDir)
  ensureOutputDirs(outputStructure)

  const preset = options.preset ?? 'standard'
  const maxRetries = options.maxRetries ?? 1
  const thumbnailScale = options.thumbnailScale ?? 0.25
  const timeoutMs = options.timeoutMs ?? 300_000

  const renderResult = runRenderEngine(scene, {
    preset,
    outputDir: outputStructure.rendersDir,
    blendFilePath: options.blendFilePath,
    cameraFilter: options.cameraFilter,
  })

  errors.push(...renderResult.errors)
  warnings.push(...renderResult.warnings)

  const jobs: OrchestratorJob[] = renderResult.batch.jobs.map(rj => {
    const outputPath = buildOutputPath(
      outputStructure, rj.camera.viewId, preset, renderResult.config.fileFormat
    )
    const thumbnailPath = buildThumbnailPath(outputStructure, rj.camera.viewId, preset)

    return {
      jobId: rj.jobId,
      camera: rj.camera,
      config: rj.config,
      outputPath,
      thumbnailPath,
      status: 'queued' as const,
      attempt: 0,
      maxAttempts: maxRetries + 1,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      error: null,
    }
  })

  for (const job of jobs) {
    let success = false

    while (job.attempt < job.maxAttempts && !success) {
      job.attempt++
      job.status = job.attempt > 1 ? 'retrying' : 'running'
      job.startedAt = new Date().toISOString()
      job.error = null

      const scriptContent = generateSingleJobScript(job, options.blendFilePath, renderResult.config)
      const scriptPath = path.join(
        outputStructure.root,
        `render_${job.camera.viewId}_attempt${job.attempt}.py`
      )
      fs.writeFileSync(scriptPath, scriptContent, 'utf-8')

      const result = await runBlenderProcess(options.blenderPath, {
        scriptPath,
        timeoutMs,
      })

      const jobDuration = Date.now() - new Date(job.startedAt).getTime()
      job.durationMs = jobDuration

      if (result.timedOut) {
        job.error = `Render timed out after ${timeoutMs}ms`
        job.status = 'failed'
      } else if (result.exitCode !== 0 || result.stderr?.includes('Traceback')) {
        job.error = result.stderr?.slice(0, 500) ?? `Exit code: ${result.exitCode}`
        job.status = 'failed'
      } else if (!fs.existsSync(job.outputPath)) {
        job.error = `Output file not found: ${job.outputPath}`
        job.status = 'failed'
      } else {
        job.status = 'completed'
        job.completedAt = new Date().toISOString()
        success = true
      }

      try { fs.unlinkSync(scriptPath) } catch {}

      if (!success && job.attempt < job.maxAttempts) {
        warnings.push(`Job ${job.jobId} (${job.camera.viewId}) failed attempt ${job.attempt}, retrying...`)
      }
    }

    if (!success) {
      errors.push(`Job ${job.jobId} (${job.camera.viewId}) failed after ${job.attempt} attempts: ${job.error}`)
    }

    if (job.status === 'completed' && thumbnailScale > 0) {
      const thumbScript = generateThumbnailScript(job.outputPath, job.thumbnailPath!, thumbnailScale)
      const thumbScriptPath = path.join(outputStructure.root, `thumb_${job.camera.viewId}.py`)
      fs.writeFileSync(thumbScriptPath, thumbScript, 'utf-8')

      const thumbResult = await runBlenderProcess(options.blenderPath, {
        scriptPath: thumbScriptPath,
        timeoutMs: 60_000,
      })

      if (thumbResult.exitCode !== 0 || !fs.existsSync(job.thumbnailPath!)) {
        warnings.push(`Thumbnail generation failed for ${job.camera.viewId}`)
        job.thumbnailPath = null
      }

      try { fs.unlinkSync(thumbScriptPath) } catch {}
    }
  }

  const manifestEntries = jobs.map(j =>
    createManifestEntry(
      j,
      options.projectId,
      options.sceneId,
      preset,
      renderResult.config.fileFormat,
      { width: renderResult.config.resolution.width, height: renderResult.config.resolution.height }
    )
  )

  const manifest = createManifest(
    renderResult.batch.batchId,
    options.projectId,
    preset,
    outputStructure,
    manifestEntries,
    startTime
  )

  writeManifest(manifest, outputStructure.manifestPath)

  const progress = buildProgress(jobs, startTime)

  return {
    manifest,
    outputStructure,
    progress,
    jobs,
    errors,
    warnings,
  }
}

function buildProgress(jobs: OrchestratorJob[], startTime: number): RenderProgress {
  const completed = jobs.filter(j => j.status === 'completed').length
  const failed = jobs.filter(j => j.status === 'failed').length
  const running = jobs.filter(j => j.status === 'running' || j.status === 'retrying').length
  const queued = jobs.filter(j => j.status === 'queued').length
  const total = jobs.length
  const elapsedMs = Date.now() - startTime

  const avgTime = completed > 0
    ? jobs.filter(j => j.status === 'completed').reduce((s, j) => s + (j.durationMs ?? 0), 0) / completed
    : null

  const remaining = queued + running
  const estimatedRemainingMs = avgTime !== null && remaining > 0
    ? Math.round(avgTime * remaining)
    : null

  return {
    totalJobs: total,
    completed,
    failed,
    running,
    queued,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    elapsedMs,
    estimatedRemainingMs,
  }
}
