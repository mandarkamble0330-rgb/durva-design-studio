import { getProjects } from './actions'
import { ProjectList } from '@/components/projects/project-list'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const search = typeof params.search === 'string' ? params.search : ''
  const status = typeof params.status === 'string' ? params.status : 'all'
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1

  const data = await getProjects({ search, status, page, perPage: 12 })

  return (
    <div className="mx-auto max-w-6xl">
      <ProjectList
        initialProjects={data.projects}
        initialTotal={data.total}
        initialPage={data.page}
        initialTotalPages={data.totalPages}
        perPage={data.perPage}
      />
    </div>
  )
}
