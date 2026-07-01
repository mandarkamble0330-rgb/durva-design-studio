import Link from 'next/link'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PenTool, Plus, FolderOpen, ArrowRight } from 'lucide-react'
import type { Project } from '@/types'

export default async function BoothDesignerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })

  const projects = (data ?? []) as Project[]

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booth Designer</h1>
          <p className="mt-1 text-muted-foreground">
            Select a project to open the AI design workspace
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="py-20">
          <CardContent className="flex flex-col items-center text-center">
            <FolderOpen className="h-14 w-14 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">No projects yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Create your first exhibition booth project to start designing with AI.
            </p>
            <Link href="/projects/new" className="mt-6">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create New Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/booth-designer/${project.id}`}>
              <Card className="group h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">
                        {project.project_name}
                      </CardTitle>
                      {project.company_name && (
                        <CardDescription className="truncate">
                          {project.company_name}
                        </CardDescription>
                      )}
                    </div>
                    <PenTool className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {project.status.replace('_', ' ')}
                    </Badge>
                    {project.booth_size && (
                      <Badge variant="outline">{project.booth_size}</Badge>
                    )}
                    {project.design_theme && (
                      <Badge variant="outline">{project.design_theme}</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Updated {format(new Date(project.updated_at), 'MMM d, yyyy')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Open Designer <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
