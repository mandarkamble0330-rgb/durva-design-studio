import type { RenderConfiguration, RenderJob, RenderBatch } from './render-types'

function pyStr(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function pyBool(b: boolean): string {
  return b ? 'True' : 'False'
}

function generateRenderSettings(config: RenderConfiguration): string {
  const lines: string[] = []
  const r = config.resolution
  const s = config.samples
  const d = config.denoising
  const cm = config.colorManagement
  const f = config.film

  lines.push('# Render engine')
  lines.push(`bpy.context.scene.render.engine = ${pyStr(config.engine)}`)

  lines.push('')
  lines.push('# Resolution')
  lines.push(`bpy.context.scene.render.resolution_x = ${r.width}`)
  lines.push(`bpy.context.scene.render.resolution_y = ${r.height}`)
  lines.push(`bpy.context.scene.render.resolution_percentage = ${r.scale}`)

  lines.push('')
  lines.push('# Samples')
  if (config.engine === 'CYCLES') {
    lines.push(`bpy.context.scene.cycles.samples = ${s.render}`)
    lines.push(`bpy.context.scene.cycles.preview_samples = ${s.viewport}`)
    lines.push(`bpy.context.scene.cycles.max_bounces = ${config.maxBounces}`)
    lines.push(`bpy.context.scene.cycles.use_denoising = ${pyBool(d.enabled)}`)
    if (d.enabled) {
      lines.push(`bpy.context.scene.cycles.denoiser = ${pyStr(d.algorithm)}`)
      lines.push(`bpy.context.scene.cycles.denoising_prefilter = ${pyStr(d.prefilter)}`)
    }
  } else {
    lines.push(`bpy.context.scene.eevee.taa_render_samples = ${s.render}`)
    lines.push(`bpy.context.scene.eevee.taa_samples = ${s.viewport}`)
  }

  lines.push('')
  lines.push('# Output format')
  lines.push(`bpy.context.scene.render.image_settings.file_format = ${pyStr(config.fileFormat)}`)
  if (config.fileFormat === 'PNG') {
    lines.push(`bpy.context.scene.render.image_settings.color_mode = ${pyStr(f.transparentBackground ? 'RGBA' : 'RGB')}`)
    lines.push(`bpy.context.scene.render.image_settings.compression = ${Math.round((100 - config.fileQuality) * 0.15)}`)
  } else if (config.fileFormat === 'JPEG') {
    lines.push(`bpy.context.scene.render.image_settings.quality = ${config.fileQuality}`)
  }

  lines.push('')
  lines.push('# Film')
  lines.push(`bpy.context.scene.render.film_transparent = ${pyBool(f.transparentBackground)}`)
  lines.push(`bpy.context.scene.render.filter_size = ${f.filterSize}`)

  lines.push('')
  lines.push('# Color management')
  lines.push(`bpy.context.scene.display_settings.display_device = ${pyStr(cm.displayDevice)}`)
  lines.push(`bpy.context.scene.view_settings.view_transform = ${pyStr(cm.viewTransform)}`)
  lines.push(`bpy.context.scene.view_settings.look = ${pyStr(cm.look)}`)
  lines.push(`bpy.context.scene.view_settings.exposure = ${cm.exposure}`)
  lines.push(`bpy.context.scene.view_settings.gamma = ${cm.gamma}`)

  lines.push('')
  lines.push(`bpy.context.scene.render.use_motion_blur = ${pyBool(config.useMotionBlur)}`)

  return lines.join('\n')
}

function generateCameraSwitch(job: RenderJob): string {
  const cam = job.camera
  const lines: string[] = []

  lines.push(`# Set active camera: ${cam.viewId}`)
  lines.push(`cam_obj = None`)
  lines.push(`for obj in bpy.data.objects:`)
  lines.push(`    if obj.type == 'CAMERA' and obj.name == ${pyStr(cam.cameraName)}:`)
  lines.push(`        cam_obj = obj`)
  lines.push(`        break`)
  lines.push(`if cam_obj:`)
  lines.push(`    bpy.context.scene.camera = cam_obj`)
  lines.push(`else:`)
  lines.push(`    print(f"WARN: Camera ${pyStr(cam.cameraName)} not found, using active camera")`)

  return lines.join('\n')
}

function generateSingleRender(job: RenderJob): string {
  const lines: string[] = []

  lines.push(generateCameraSwitch(job))
  lines.push(`bpy.context.scene.render.filepath = ${pyStr(job.outputPath)}`)
  lines.push(`bpy.ops.render.render(write_still=True)`)
  lines.push(`print(f"RENDER_COMPLETE:${job.camera.viewId}:${pyStr(job.outputPath).slice(1, -1)}")`)

  return lines.join('\n')
}

export function generateRenderScript(batch: RenderBatch): string {
  const sections: string[] = []

  sections.push('import bpy')
  sections.push('import sys')
  sections.push('import os')
  sections.push('')

  sections.push(`# Load blend file`)
  sections.push(`blend_path = ${pyStr(batch.blendFilePath)}`)
  sections.push(`bpy.ops.wm.open_mainfile(filepath=blend_path)`)
  sections.push('')

  if (batch.jobs.length > 0) {
    sections.push(generateRenderSettings(batch.jobs[0].config))
    sections.push('')
  }

  sections.push(`# Render all views`)
  sections.push(`os.makedirs(os.path.dirname(${pyStr(batch.jobs[0]?.outputPath ?? '')}), exist_ok=True)`)
  sections.push('')

  for (const job of batch.jobs) {
    sections.push(generateSingleRender(job))
    sections.push('')
  }

  sections.push(`print("BATCH_COMPLETE:${batch.jobs.length} renders")`)
  sections.push(`sys.exit(0)`)

  return sections.join('\n')
}
