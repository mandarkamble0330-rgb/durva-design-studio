'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Project } from '@/types'
import {
  PenTool,
  Ruler,
  Factory,
  Palette,
  LayoutGrid,
  Lamp,
  Calendar,
  ExternalLink,
} from 'lucide-react'

interface ProjectSidebarProps {
  project: Project
}

export function ProjectSidebar({ project }: ProjectSidebarProps) {
  return (
    <aside className="flex flex-col gap-4">
      {/* Project Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-semibold leading-tight">
              {project.project_name}
            </CardTitle>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
          {project.company_name && (
            <p className="text-xs text-muted-foreground">{project.company_name}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Separator />

          <DetailRow icon={Ruler} label="Booth Size" value={project.booth_size} />
          <DetailRow icon={Factory} label="Industry" value={project.industry_type} />
          <DetailRow icon={Palette} label="Theme" value={project.design_theme} />
          <DetailRow icon={LayoutGrid} label="Zones" value={project.zones.length > 0 ? `${project.zones.length} selected` : undefined} />
          <DetailRow icon={Lamp} label="Flooring" value={project.flooring_type} />

          {project.event_date && (
            <DetailRow
              icon={Calendar}
              label="Event Date"
              value={new Date(project.event_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            />
          )}

          {/* Colors */}
          {(project.primary_color || project.secondary_color) && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Brand Colors</p>
                <div className="flex items-center gap-2">
                  <span
                    className="h-6 w-6 rounded-full border shadow-sm"
                    style={{ backgroundColor: project.primary_color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {project.primary_color}
                  </span>
                  <span
                    className="ml-2 h-6 w-6 rounded-full border shadow-sm"
                    style={{ backgroundColor: project.secondary_color }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {project.secondary_color}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Zones list */}
          {project.zones.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Selected Zones</p>
                <div className="flex flex-wrap gap-1">
                  {project.zones.map((zone) => (
                    <Badge key={zone} variant="outline" className="text-[10px] px-1.5 py-0">
                      {zone}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Link href={`/projects/${project.id}/edit`} className="block">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <PenTool className="h-3.5 w-3.5" />
              Edit Project
            </Button>
          </Link>
          <Link href={`/projects/${project.id}`} className="block">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              View Details
            </Button>
          </Link>
        </CardContent>
      </Card>
    </aside>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="ml-auto text-right text-xs font-medium truncate max-w-[120px]">
        {value || '—'}
      </span>
    </div>
  )
}
