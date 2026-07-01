'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { GenerationStatusBadge } from './generation-status-badge'
import { deleteGenerationJob } from '@/app/(dashboard)/booth-designer/actions'
import type { GenerationJob } from '@/types/generation'
import {
  Clock,
  Trash2,
  Image,
  Loader2,
  Eye,
} from 'lucide-react'

interface HistorySidebarProps {
  jobs: GenerationJob[]
  activeJobId?: string | null
  onSelectJob?: (job: GenerationJob) => void
}

function JobLeonardoMeta({ job }: { job: GenerationJob }) {
  const metadata = job.metadata as Record<string, unknown> | null
  const leonardo = metadata?.leonardo as Record<string, unknown> | null
  if (!leonardo) return null

  const parts: string[] = []
  if (leonardo.generationTime) parts.push(`${Math.round(Number(leonardo.generationTime))}s`)
  if (leonardo.width && leonardo.height) parts.push(`${String(leonardo.width)}×${String(leonardo.height)}`)
  if (leonardo.seed !== undefined) parts.push(`seed:${String(leonardo.seed)}`)

  if (parts.length === 0) return null

  return (
    <p className="text-[10px] text-muted-foreground/70 truncate">
      {parts.join(' · ')}
    </p>
  )
}

export function HistorySidebar({ jobs, activeJobId, onSelectJob }: HistorySidebarProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const completedCount = jobs.filter(j => j.status === 'completed').length
  const totalImages = jobs.reduce((sum, j) => sum + (j.image_urls?.length ?? 0), 0)

  async function handleDelete(e: React.MouseEvent, jobId: string) {
    e.stopPropagation()
    setDeletingId(jobId)
    const result = await deleteGenerationJob(jobId)
    if ('error' in result && result.error) {
      toast.error(result.error)
    } else {
      toast.success('Version deleted')
      router.refresh()
    }
    setDeletingId(null)
  }

  return (
    <aside className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Design History
          </CardTitle>
          {jobs.length > 0 && (
            <p className="text-[10px] text-muted-foreground/60">
              {completedCount} completed · {totalImages} image{totalImages !== 1 ? 's' : ''}
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Image className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-xs text-muted-foreground/60">
                No generated versions yet
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/40">
                Versions will appear here after generation
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job, index) => {
                const isActive = job.id === activeJobId
                const hasImages = job.image_urls && job.image_urls.length > 0
                const isLatest = index === 0

                return (
                  <div
                    key={job.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectJob?.(job)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectJob?.(job) } }}
                    className={`w-full cursor-pointer rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'hover:border-muted-foreground/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GenerationStatusBadge status={job.status} />
                        {isLatest && (
                          <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isActive && (
                          <Eye className="h-3 w-3 text-primary" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive/60 hover:text-destructive"
                          onClick={(e) => handleDelete(e, job.id)}
                          disabled={deletingId === job.id}
                        >
                          {deletingId === job.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
                      <span>{format(new Date(job.created_at), 'MMM d, HH:mm')}</span>
                      {hasImages && (
                        <span>· {job.image_urls!.length} img</span>
                      )}
                    </div>

                    {job.ai_model && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground/70 truncate">
                        {job.ai_model}
                      </p>
                    )}

                    <JobLeonardoMeta job={job} />

                    {hasImages && (
                      <div className="mt-2 flex gap-1 overflow-hidden">
                        {job.image_urls!.slice(0, 3).map((url, i) => (
                          <div key={i} className="relative h-10 w-14 shrink-0 overflow-hidden rounded border bg-muted/30">
                            <NextImage
                              src={url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="56px"
                              unoptimized
                              loading="lazy"
                            />
                          </div>
                        ))}
                        {job.image_urls!.length > 3 && (
                          <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded border bg-muted/50 text-[10px] text-muted-foreground">
                            +{job.image_urls!.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  )
}
