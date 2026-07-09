'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createProject, updateProject, uploadProjectFile } from '@/app/(dashboard)/projects/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  INDUSTRY_TYPES,
  BOOTH_SIZES,
  DESIGN_THEMES,
  ZONES_LIST,
  FLOORING_TYPES,
  LIGHTING_OPTIONS,
  type Project,
} from '@/types'
import {
  Loader2,
  Check,
  Building2,
  Ruler,
  Palette,
  LayoutGrid,
  Lamp,
  Upload,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'project-basics', label: 'Project Basics', icon: Building2 },
  { id: 'booth-dimensions', label: 'Booth Dimensions', icon: Ruler },
  { id: 'design-language', label: 'Design Language', icon: Palette },
  { id: 'zones-elements', label: 'Zones & Elements', icon: LayoutGrid },
  { id: 'materials-lighting', label: 'Materials & Lighting', icon: Lamp },
  { id: 'references', label: 'References', icon: Upload },
  { id: 'generate', label: 'Generate', icon: Sparkles },
] as const

interface ProjectFormProps {
  project?: Project
  mode?: 'create' | 'edit'
}

export function ProjectForm({ project, mode = 'create' }: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id)
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set())
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Form state
  const [selectedZones, setSelectedZones] = useState<string[]>(project?.zones ?? [])
  const [selectedLighting, setSelectedLighting] = useState<string[]>(project?.lighting_preferences ?? [])
  const [logoUrl, setLogoUrl] = useState(project?.logo_url ?? '')
  const [referenceImages, setReferenceImages] = useState<string[]>(project?.reference_images ?? [])
  const [referencePdfs, setReferencePdfs] = useState<string[]>(project?.reference_pdfs ?? [])
  const [uploadingField, setUploadingField] = useState<string | null>(null)

  // Booth size state
  const isExistingCustom = project?.booth_size?.startsWith('Custom:') ?? false
  const [boothSizeSelection, setBoothSizeSelection] = useState<string>(
    isExistingCustom ? 'Custom' : (project?.booth_size ?? '')
  )
  const [customWidth, setCustomWidth] = useState(() => {
    if (!isExistingCustom) return ''
    const match = project!.booth_size.match(/Custom:\s*([\d.]+)\s*x\s*([\d.]+)/)
    return match?.[1] ?? ''
  })
  const [customDepth, setCustomDepth] = useState(() => {
    if (!isExistingCustom) return ''
    const match = project!.booth_size.match(/Custom:\s*([\d.]+)\s*x\s*([\d.]+)/)
    return match?.[2] ?? ''
  })
  const [customHeight, setCustomHeight] = useState(() => {
    if (!isExistingCustom) return ''
    const match = project!.booth_size.match(/x\s*[\d.]+\s*x\s*([\d.]+)m/)
    return match?.[1] ?? ''
  })

  const isCustomSize = boothSizeSelection === 'Custom'

  const computedBoothSize = (() => {
    if (!isCustomSize) return boothSizeSelection
    const w = parseFloat(customWidth)
    const d = parseFloat(customDepth)
    if (!w || !d || w <= 0 || d <= 0) return ''
    const h = parseFloat(customHeight)
    const area = w * d
    const dims = h > 0 ? `${w}x${d}x${h}m` : `${w}x${d}m`
    return `Custom: ${dims} (${area} sqm)`
  })()

  const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el
  }, [])

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    )

    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id]
      if (el) observerRef.current!.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [])

  function scrollToSection(id: string) {
    const el = sectionRefs.current[id]
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 100
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  function validateSections(form: HTMLFormElement) {
    const data = new FormData(form)
    const completed = new Set<string>()

    if (data.get('project_name')) completed.add('project-basics')
    if (data.get('booth_size')) completed.add('booth-dimensions')
    if (data.get('design_theme')) completed.add('design-language')
    if (selectedZones.length > 0) completed.add('zones-elements')
    if (data.get('flooring_type') || selectedLighting.length > 0) completed.add('materials-lighting')
    completed.add('references')
    completed.add('generate')

    setCompletedSections(completed)
    return completed
  }

  async function handleFileUpload(
    file: File,
    field: 'logo' | 'reference_image' | 'reference_pdf'
  ) {
    const MAX_FILE_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Maximum file size is 20 MB.')
      return
    }
    if (field === 'reference_pdf' && file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed.')
      return
    }

    setUploadingField(field)
    const fd = new FormData()
    fd.set('file', file)
    const result = await uploadProjectFile(fd)

    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      if (field === 'logo') {
        setLogoUrl(result.url)
      } else if (field === 'reference_image') {
        setReferenceImages((prev) => [...prev, result.url!])
      } else {
        setReferencePdfs((prev) => [...prev, result.url!])
      }
      toast.success('File uploaded')
    }
    setUploadingField(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const completed = validateSections(form)

    if (!completed.has('project-basics')) {
      toast.error('Please fill in the Project Name')
      scrollToSection('project-basics')
      return
    }

    setLoading(true)
    const formData = new FormData(form)

    selectedZones.forEach((z) => formData.append('zones', z))
    selectedLighting.forEach((l) => formData.append('lighting_preferences', l))
    if (logoUrl) formData.set('logo_url', logoUrl)
    referenceImages.forEach((url) => formData.append('reference_images', url))
    referencePdfs.forEach((url) => formData.append('reference_pdfs', url))

    let result
    if (mode === 'edit' && project) {
      result = await updateProject(project.id, formData)
    } else {
      result = await createProject(formData)
    }

    if ('error' in result && result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success(mode === 'edit' ? 'Project updated' : 'Project created')
    router.push('/projects')
    router.refresh()
  }

  return (
    <div className="relative">
      {/* Sticky Progress Indicator */}
      <div className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-5xl">
          <nav className="flex gap-0 overflow-x-auto px-2 py-2 scrollbar-thin md:px-4">
            {SECTIONS.map((section, idx) => {
              const isActive = activeSection === section.id
              const isCompleted = completedSections.has(section.id)
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    'group relative flex flex-shrink-0 flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors md:flex-row md:gap-2 md:px-4 md:text-sm',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs transition-all md:h-8 md:w-8',
                      isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </span>
                  <span className="hidden whitespace-nowrap lg:inline">
                    {section.label}
                  </span>
                  <Icon className="h-4 w-4 lg:hidden" />
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        onChange={(e) => validateSections(e.currentTarget)}
        className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6"
      >
        {/* Section 1: Project Basics */}
        <Card id="project-basics" ref={setSectionRef('project-basics')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Project Basics
            </CardTitle>
            <CardDescription>Core information about your exhibition project</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project_name">
                Project / Brand Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="project_name"
                name="project_name"
                required
                defaultValue={project?.project_name ?? ''}
                placeholder="e.g. TechCorp Expo 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                name="client_name"
                defaultValue={project?.client_name ?? ''}
                placeholder="e.g. John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                name="company_name"
                defaultValue={project?.company_name ?? ''}
                placeholder="e.g. TechCorp Inc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exhibition_name">Exhibition Name</Label>
              <Input
                id="exhibition_name"
                name="exhibition_name"
                defaultValue={project?.exhibition_name ?? ''}
                placeholder="e.g. CES 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry_type">Industry Type</Label>
              <Select name="industry_type" defaultValue={project?.industry_type ?? ''}>
                <SelectTrigger id="industry_type">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date">Event Date</Label>
              <Input
                id="event_date"
                name="event_date"
                type="date"
                defaultValue={project?.event_date ?? ''}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Booth Dimensions */}
        <Card id="booth-dimensions" ref={setSectionRef('booth-dimensions')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Booth Dimensions
            </CardTitle>
            <CardDescription>Physical specifications of the exhibition booth</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booth_size_select">Booth Size</Label>
              <input type="hidden" name="booth_size" value={computedBoothSize} />
              <Select
                value={boothSizeSelection}
                onValueChange={(v) => setBoothSizeSelection(v ?? '')}
              >
                <SelectTrigger id="booth_size_select">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {BOOTH_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isCustomSize && (
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-3 rounded-lg border p-4 bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="custom_width">
                    Width (meters) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="custom_width"
                    type="number"
                    min={0.1}
                    step="any"
                    required
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    placeholder="e.g. 6"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom_depth">
                    Depth (meters) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="custom_depth"
                    type="number"
                    min={0.1}
                    step="any"
                    required
                    value={customDepth}
                    onChange={(e) => setCustomDepth(e.target.value)}
                    placeholder="e.g. 9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom_height">Height (meters)</Label>
                  <Input
                    id="custom_height"
                    type="number"
                    min={0.1}
                    step="any"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                {computedBoothSize && (
                  <p className="sm:col-span-3 text-xs text-muted-foreground">
                    Computed size: <span className="font-medium text-foreground">{computedBoothSize.replace('Custom: ', '')}</span>
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="ceiling_height">Ceiling / Fascia Height</Label>
              <Input
                id="ceiling_height"
                name="ceiling_height"
                defaultValue={project?.ceiling_height ?? ''}
                placeholder="e.g. 4 meters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting_rooms">Number of Meeting Rooms</Label>
              <Input
                id="meeting_rooms"
                name="meeting_rooms"
                type="number"
                min={0}
                max={20}
                defaultValue={project?.meeting_rooms ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry_exit_points">Number of Entry / Exit Points</Label>
              <Input
                id="entry_exit_points"
                name="entry_exit_points"
                type="number"
                min={1}
                max={10}
                defaultValue={project?.entry_exit_points ?? 1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Design Language */}
        <Card id="design-language" ref={setSectionRef('design-language')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Design Language
            </CardTitle>
            <CardDescription>Visual style and branding colors</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="design_theme">Design Theme</Label>
              <Select name="design_theme" defaultValue={project?.design_theme ?? ''}>
                <SelectTrigger id="design_theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {DESIGN_THEMES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  name="primary_color"
                  type="color"
                  defaultValue={project?.primary_color ?? '#000000'}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  defaultValue={project?.primary_color ?? '#000000'}
                  placeholder="#000000"
                  className="flex-1"
                  onChange={(e) => {
                    const colorInput = document.getElementById('primary_color') as HTMLInputElement
                    if (colorInput) colorInput.value = e.target.value
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Brand Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  name="secondary_color"
                  type="color"
                  defaultValue={project?.secondary_color ?? '#ffffff'}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  defaultValue={project?.secondary_color ?? '#ffffff'}
                  placeholder="#ffffff"
                  className="flex-1"
                  onChange={(e) => {
                    const colorInput = document.getElementById('secondary_color') as HTMLInputElement
                    if (colorInput) colorInput.value = e.target.value
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Zones & Elements */}
        <Card id="zones-elements" ref={setSectionRef('zones-elements')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Zones & Elements
            </CardTitle>
            <CardDescription>Select the areas you want in your booth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ZONES_LIST.map((zone) => (
                <label
                  key={zone}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent',
                    selectedZones.includes(zone) && 'border-primary bg-primary/5'
                  )}
                >
                  <Checkbox
                    checked={selectedZones.includes(zone)}
                    onCheckedChange={(checked) => {
                      setSelectedZones((prev) =>
                        checked
                          ? [...prev, zone]
                          : prev.filter((z) => z !== zone)
                      )
                    }}
                  />
                  <span className="text-sm font-medium">{zone}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Materials & Lighting */}
        <Card id="materials-lighting" ref={setSectionRef('materials-lighting')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lamp className="h-5 w-5" />
              Materials & Lighting
            </CardTitle>
            <CardDescription>Floor and lighting specifications</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="flooring_type">Flooring Type</Label>
              <Select name="flooring_type" defaultValue={project?.flooring_type ?? ''}>
                <SelectTrigger id="flooring_type">
                  <SelectValue placeholder="Select flooring" />
                </SelectTrigger>
                <SelectContent>
                  {FLOORING_TYPES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Lighting Preferences</Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {LIGHTING_OPTIONS.map((option) => (
                  <label
                    key={option}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent',
                      selectedLighting.includes(option) && 'border-primary bg-primary/5'
                    )}
                  >
                    <Checkbox
                      checked={selectedLighting.includes(option)}
                      onCheckedChange={(checked) => {
                        setSelectedLighting((prev) =>
                          checked
                            ? [...prev, option]
                            : prev.filter((l) => l !== option)
                        )
                      }}
                    />
                    <span className="text-sm font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: References */}
        <Card id="references" ref={setSectionRef('references')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              References
            </CardTitle>
            <CardDescription>Upload logos, images and reference documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-16 w-16 rounded-lg border object-contain p-1"
                  />
                )}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  {uploadingField === 'logo' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {logoUrl ? 'Replace logo' : 'Upload logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'logo')
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Reference Images */}
            <div className="space-y-2">
              <Label>Reference Images</Label>
              <div className="flex flex-wrap items-center gap-3">
                {referenceImages.map((url, i) => (
                  <div key={i} className="group relative">
                    <img
                      src={url}
                      alt={`Ref ${i + 1}`}
                      className="h-20 w-20 rounded-lg border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setReferenceImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white group-hover:flex"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  {uploadingField === 'reference_image' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span className="text-[10px] mt-1">Add image</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'reference_image')
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Reference PDFs */}
            <div className="space-y-2">
              <Label>Reference PDFs</Label>
              <div className="space-y-2">
                {referencePdfs.map((url, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border px-4 py-2 text-sm"
                  >
                    <span className="truncate">PDF {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => setReferencePdfs((prev) => prev.filter((_, j) => j !== i))}
                      className="text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  {uploadingField === 'reference_pdf' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload PDF
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, 'reference_pdf')
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Reference PDF Pages */}
            <div className="space-y-2">
              <Label htmlFor="reference_pdf_pages">Reference PDF Pages</Label>
              <Input
                id="reference_pdf_pages"
                name="reference_pdf_pages"
                defaultValue={project?.reference_pdf_pages ?? ''}
                placeholder="e.g. 1-5, 8, 12-15"
              />
            </div>

            {/* Additional Requirements */}
            <div className="space-y-2">
              <Label htmlFor="additional_requirements">Additional Requirements</Label>
              <Textarea
                id="additional_requirements"
                name="additional_requirements"
                defaultValue={project?.additional_requirements ?? ''}
                placeholder="Any other details or special requirements"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 7: Generate */}
        <Card id="generate" ref={setSectionRef('generate')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate
            </CardTitle>
            <CardDescription>
              Save your project and prepare for AI booth design generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-semibold">Ready to create?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Save your project first. AI booth design generation will be available in the next module.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/projects')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'edit' ? 'Update Project' : 'Create Project'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
