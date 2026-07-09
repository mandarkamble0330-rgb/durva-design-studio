import type { Project } from '@/types'
import type { PromptContext, StructuredPrompt, PromptSections, PromptMetadata } from '@/types/generation'
import type { CameraViewId } from '@/types/camera'

export function extractPromptContext(project: Project): PromptContext {
  return {
    projectName: project.project_name,
    clientName: project.client_name,
    companyName: project.company_name,
    exhibitionName: project.exhibition_name,
    industryType: project.industry_type,
    eventDate: project.event_date,
    boothSize: project.booth_size,
    ceilingHeight: project.ceiling_height,
    meetingRooms: project.meeting_rooms,
    entryExitPoints: project.entry_exit_points,
    designTheme: project.design_theme,
    primaryColor: project.primary_color,
    secondaryColor: project.secondary_color,
    zones: project.zones,
    flooringType: project.flooring_type,
    lightingPreferences: project.lighting_preferences,
    logoUrl: project.logo_url,
    referenceImages: project.reference_images,
    referencePdfs: project.reference_pdfs,
    referencePdfPages: project.reference_pdf_pages,
    additionalRequirements: project.additional_requirements,
  }
}

function buildSystemPrompt(ctx: PromptContext): string {
  const lines: string[] = [
    'You are a world-class 3D exhibition booth designer and architectural visualization specialist.',
    'You create photorealistic renders of exhibition booths based on detailed client briefs.',
    '',
    'Your designs must:',
    '- Be structurally feasible and follow real-world exhibition construction standards',
    '- Use accurate proportions and human-scale references',
    '- Include realistic materials, textures, and lighting',
    '- Follow the client\'s brand guidelines precisely',
    '- Incorporate all specified zones and functional areas',
    '- Present a professional, exhibition-ready design',
  ]

  if (ctx.industryType) {
    lines.push('', `This booth is for the ${ctx.industryType} industry. Apply industry-appropriate design conventions and visual language.`)
  }

  return lines.join('\n')
}

function buildDesignPrompt(ctx: PromptContext): string {
  const lines: string[] = [
    `## Exhibition Booth Design Brief`,
    '',
    `**Project:** ${ctx.projectName}`,
  ]

  if (ctx.clientName) lines.push(`**Client:** ${ctx.clientName}`)
  if (ctx.companyName) lines.push(`**Company:** ${ctx.companyName}`)
  if (ctx.exhibitionName) lines.push(`**Exhibition:** ${ctx.exhibitionName}`)
  if (ctx.eventDate) lines.push(`**Event Date:** ${ctx.eventDate}`)

  lines.push('', '### Booth Specifications')
  if (ctx.boothSize) lines.push(`- **Size:** ${ctx.boothSize}`)
  if (ctx.ceilingHeight) lines.push(`- **Ceiling Height:** ${ctx.ceilingHeight}`)
  if (ctx.meetingRooms > 0) lines.push(`- **Meeting Rooms:** ${ctx.meetingRooms}`)
  if (ctx.entryExitPoints > 0) lines.push(`- **Entry/Exit Points:** ${ctx.entryExitPoints}`)

  lines.push('', '### Design Language')
  if (ctx.designTheme) lines.push(`- **Theme:** ${ctx.designTheme}`)
  if (ctx.primaryColor) lines.push(`- **Primary Brand Color:** ${ctx.primaryColor}`)
  if (ctx.secondaryColor) lines.push(`- **Secondary Brand Color:** ${ctx.secondaryColor}`)

  if (ctx.zones.length > 0) {
    lines.push('', '### Zones & Functional Areas')
    lines.push(`Include the following zones in the booth layout:`)
    ctx.zones.forEach(zone => lines.push(`- ${zone}`))
  }

  return lines.join('\n')
}

function buildTechnicalConstraints(ctx: PromptContext): string {
  const lines: string[] = [
    '## Technical Constraints',
    '',
    'The booth design must adhere to the following technical specifications:',
    '',
  ]

  if (ctx.boothSize) {
    lines.push(`- Booth footprint: ${ctx.boothSize} — do not exceed this area`)
  }
  if (ctx.ceilingHeight) {
    lines.push(`- Maximum structure height: ${ctx.ceilingHeight}`)
  }

  lines.push(
    '- All structures must be modular and transportable',
    '- Electrical and AV infrastructure must be concealed within structures',
    '- Emergency exits and fire safety clearances must be maintained',
    '- Load-bearing surfaces must support display equipment safely',
  )

  if (ctx.meetingRooms > 0) {
    lines.push(`- Allocate enclosed or semi-enclosed space for ${ctx.meetingRooms} meeting room(s)`)
  }
  if (ctx.entryExitPoints > 0) {
    lines.push(`- Design ${ctx.entryExitPoints} distinct entry/exit point(s) for visitor flow`)
  }

  if (ctx.flooringType) {
    lines.push(`- Flooring material: ${ctx.flooringType}`)
  }

  return lines.join('\n')
}

function buildStyleInstructions(ctx: PromptContext): string {
  const lines: string[] = [
    '## Style & Material Instructions',
    '',
  ]

  if (ctx.designTheme) {
    lines.push(`Apply a **${ctx.designTheme}** design aesthetic throughout the booth.`)
    lines.push('')
  }

  if (ctx.primaryColor || ctx.secondaryColor) {
    lines.push('### Color Palette')
    if (ctx.primaryColor) lines.push(`- Primary: ${ctx.primaryColor} — use for dominant surfaces, headers, and key branding elements`)
    if (ctx.secondaryColor) lines.push(`- Secondary: ${ctx.secondaryColor} — use for accents, highlights, and supporting elements`)
    lines.push('')
  }

  if (ctx.flooringType) {
    lines.push(`### Flooring`)
    lines.push(`Use ${ctx.flooringType} flooring throughout the booth area.`)
    lines.push('')
  }

  if (ctx.lightingPreferences.length > 0) {
    lines.push('### Lighting Design')
    lines.push('Incorporate the following lighting types:')
    ctx.lightingPreferences.forEach(light => lines.push(`- ${light}`))
    lines.push('')
  }

  lines.push(
    '### Material Quality',
    'All materials should appear premium and exhibition-grade:',
    '- Clean edges and precise joins',
    '- High-quality finishes appropriate to the design theme',
    '- Professional-grade graphics and signage',
  )

  return lines.join('\n')
}

function buildReferenceInstructions(ctx: PromptContext): string {
  const lines: string[] = [
    '## Reference & Brand Assets',
    '',
  ]

  let hasContent = false

  if (ctx.logoUrl) {
    lines.push(`**Logo:** A brand logo has been provided and must be prominently displayed on the booth fascia, reception area, and key branding surfaces.`)
    lines.push('')
    hasContent = true
  }

  if (ctx.referenceImages.length > 0) {
    lines.push(`**Reference Images:** ${ctx.referenceImages.length} reference image(s) have been provided. Use these as visual inspiration for the overall design direction, material choices, and spatial layout.`)
    lines.push('')
    hasContent = true
  }

  if (ctx.referencePdfs.length > 0) {
    lines.push(`**Reference Documents:** ${ctx.referencePdfs.length} reference PDF(s) have been provided.`)
    if (ctx.referencePdfPages) {
      lines.push(`Focus on pages: ${ctx.referencePdfPages}`)
    }
    lines.push('')
    hasContent = true
  }

  if (ctx.additionalRequirements) {
    lines.push(`**Additional Requirements:** ${ctx.additionalRequirements}`)
    hasContent = true
  }

  if (!hasContent) {
    lines.push('No reference assets have been provided. Design based on the brief specifications above.')
  }

  return lines.join('\n')
}

function buildOutputInstructions(): string {
  return [
    '## Output Instructions',
    '',
    'Generate a **photorealistic 3D visualization** of the exhibition booth with the following characteristics:',
    '',
    '- **Camera angle:** Three-quarter isometric view showing the full booth from a slightly elevated perspective',
    '- **Lighting:** Professional exhibition hall lighting with the specified lighting design elements',
    '- **People:** Include 3-5 visitors and 1-2 booth staff for scale and context',
    '- **Signage:** All branded signage and graphics should be clearly visible and legible',
    '- **Environment:** Clean exhibition hall floor surrounding the booth, with subtle ambient environment',
    '- **Resolution:** High-resolution render suitable for client presentation',
    '- **Realism:** Photorealistic quality with accurate material reflections, shadows, and depth of field',
    '',
    'The final image should look like a professional architectural visualization that could be presented directly to a client for booth approval.',
  ].join('\n')
}

export function buildStructuredPrompt(project: Project, cameraViewId: CameraViewId = 'front'): StructuredPrompt {
  console.log('[PromptBuilder] Building prompt with cameraViewId:', cameraViewId)
  const ctx = extractPromptContext(project)

  const sections: PromptSections = {
    system: buildSystemPrompt(ctx),
    design: buildDesignPrompt(ctx),
    technicalConstraints: buildTechnicalConstraints(ctx),
    styleInstructions: buildStyleInstructions(ctx),
    referenceInstructions: buildReferenceInstructions(ctx),
    outputInstructions: buildOutputInstructions(),
  }

  const systemPrompt = sections.system
  const userPrompt = [
    sections.design,
    sections.technicalConstraints,
    sections.styleInstructions,
    sections.referenceInstructions,
    sections.outputInstructions,
  ].join('\n\n---\n\n')

  const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`

  const metadata: PromptMetadata = {
    projectId: project.id,
    projectName: project.project_name,
    generatedAt: new Date().toISOString(),
    sectionCount: Object.keys(sections).length,
    totalCharacters: fullPrompt.length,
    hasLogo: !!ctx.logoUrl,
    hasReferenceImages: ctx.referenceImages.length > 0,
    hasReferencePdfs: ctx.referencePdfs.length > 0,
    zoneCount: ctx.zones.length,
    lightingCount: ctx.lightingPreferences.length,
    cameraViewId,
  }

  return { systemPrompt, userPrompt, fullPrompt, sections, metadata }
}

export function validateProjectForGeneration(project: Project): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!project.project_name?.trim()) {
    errors.push('Project name is required')
  }

  if (!project.booth_size) {
    errors.push('Booth size is required')
  }

  if (!project.design_theme) {
    errors.push('Design theme is required')
  }

  if (project.zones.length === 0) {
    errors.push('At least one zone must be selected')
  }

  return { valid: errors.length === 0, errors }
}
