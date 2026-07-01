import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { getProject } from '../actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Building2,
  Ruler,
  Palette,
  LayoutGrid,
  Lamp,
  FileText,
  Upload,
  Pencil,
  ArrowLeft,
} from 'lucide-react'

export default async function ProjectViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let project
  try {
    project = await getProject(id)
  } catch {
    notFound()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {project.project_name}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Created {format(new Date(project.created_at), 'MMM d, yyyy')}</span>
              <Badge variant="secondary">{project.status.replace('_', ' ')}</Badge>
            </div>
          </div>
        </div>
        <Link href={`/projects/${id}/edit`}>
          <Button className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit Project
          </Button>
        </Link>
      </div>

      {/* Project Basics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Project Basics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Client Name" value={project.client_name} />
            <Field label="Company" value={project.company_name} />
            <Field label="Exhibition" value={project.exhibition_name} />
            <Field label="Industry" value={project.industry_type} />
            <Field label="Event Date" value={project.event_date ? format(new Date(project.event_date), 'MMM d, yyyy') : ''} />
          </dl>
        </CardContent>
      </Card>

      {/* Booth Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="h-4 w-4" /> Booth Dimensions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Size" value={project.booth_size} />
            <Field label="Ceiling Height" value={project.ceiling_height} />
            <Field label="Meeting Rooms" value={String(project.meeting_rooms)} />
            <Field label="Entry/Exit Points" value={String(project.entry_exit_points)} />
          </dl>
        </CardContent>
      </Card>

      {/* Design Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" /> Design Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Field label="Theme" value={project.design_theme} />
            <div>
              <dt className="text-sm text-muted-foreground">Primary Color</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span
                  className="inline-block h-6 w-6 rounded-full border"
                  style={{ backgroundColor: project.primary_color }}
                />
                <span className="text-sm">{project.primary_color}</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Secondary Color</dt>
              <dd className="mt-1 flex items-center gap-2">
                <span
                  className="inline-block h-6 w-6 rounded-full border"
                  style={{ backgroundColor: project.secondary_color }}
                />
                <span className="text-sm">{project.secondary_color}</span>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Zones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="h-4 w-4" /> Zones & Elements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project.zones.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {project.zones.map((zone) => (
                <Badge key={zone} variant="outline">{zone}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No zones selected</p>
          )}
        </CardContent>
      </Card>

      {/* Materials & Lighting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lamp className="h-4 w-4" /> Materials & Lighting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Flooring" value={project.flooring_type} />
            <div>
              <dt className="text-sm text-muted-foreground">Lighting</dt>
              <dd className="mt-1">
                {project.lighting_preferences.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {project.lighting_preferences.map((l) => (
                      <Badge key={l} variant="outline">{l}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm">—</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Client Brief */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Client Brief
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Branding Requirements" value={project.branding_requirements} />
            <Field label="Product Categories" value={project.product_categories} />
            <Field label="Required Zones" value={project.required_zones} />
            <Field label="Display Requirements" value={project.display_requirements} />
            <Field label="Visitor Engagement" value={project.visitor_engagement} />
            <Field label="Color Guidelines" value={project.color_guidelines} />
          </dl>
        </CardContent>
      </Card>

      {/* References */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" /> References
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.logo_url && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Company Logo</p>
              <img
                src={project.logo_url}
                alt="Logo"
                className="h-20 w-20 rounded-lg border object-contain p-1"
              />
            </div>
          )}
          {project.reference_images.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Reference Images</p>
              <div className="flex flex-wrap gap-3">
                {project.reference_images.map((url, i) => (
                  <img key={i} src={url} alt={`Ref ${i + 1}`} className="h-24 w-24 rounded-lg border object-cover" />
                ))}
              </div>
            </div>
          )}
          <Field label="PDF Pages" value={project.reference_pdf_pages} />
          <Field label="Additional Requirements" value={project.additional_requirements} />
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value || '—'}</dd>
    </div>
  )
}
