import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { BoothWorkspace } from '@/components/booth-designer/booth-workspace'
import { ArrowLeft } from 'lucide-react'
import type { Project } from '@/types'
import type { GenerationJob } from '@/types/generation'

export default async function BoothDesignerWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (error || !data) notFound()

  const project = data as Project

  const { data: jobsData } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('project_id', id)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const jobs = (jobsData ?? []) as GenerationJob[]

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/booth-designer">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">
              {project.project_name}
            </h1>
            <p className="text-xs text-muted-foreground">
              Booth Designer Workspace
            </p>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <BoothWorkspace project={project} jobs={jobs} />
    </div>
  )
}
