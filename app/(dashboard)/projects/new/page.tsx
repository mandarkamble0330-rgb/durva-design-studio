import { ProjectForm } from '@/components/projects/project-form'

export default function NewProjectPage() {
  return (
    <div>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="mt-1 text-muted-foreground">
          Fill in the details to generate your exhibition booth design
        </p>
      </div>
      <ProjectForm />
    </div>
  )
}
