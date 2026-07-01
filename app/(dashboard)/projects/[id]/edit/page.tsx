import { notFound } from 'next/navigation'
import { getProject } from '../../actions'
import { ProjectForm } from '@/components/projects/project-form'

export default async function EditProjectPage({
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
    <div>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Edit Project</h1>
        <p className="mt-1 text-muted-foreground">
          Update the details for &ldquo;{project.project_name}&rdquo;
        </p>
      </div>
      <ProjectForm project={project} mode="edit" />
    </div>
  )
}
