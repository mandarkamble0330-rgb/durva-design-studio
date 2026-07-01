'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { GenerationJob } from '@/types/generation'
import type { CameraViewId } from '@/types/camera'
import { mapJobsToViews, type ViewGalleryEntry } from '@/lib/camera/view-gallery-mapper'
import { cn } from '@/lib/utils'
import {
  Camera,
  Download,
  Maximize2,
  X,
  RotateCcw,
  ImageOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Monitor,
  PanelLeft,
  PanelRight,
  FlipHorizontal,
  Layers,
} from 'lucide-react'

const VIEW_ICONS: Record<CameraViewId, React.ComponentType<{ className?: string }>> = {
  front: Monitor,
  left: PanelLeft,
  right: PanelRight,
  rear: FlipHorizontal,
  angle_45: RotateCcw,
  top_iso: Layers,
}

interface MultiViewGalleryProps {
  jobs: GenerationJob[]
  activeViewId: CameraViewId
  onSelectView: (viewId: CameraViewId) => void
  onRetryView?: (viewId: CameraViewId) => void
}

function ViewThumbnail({ src }: { src: string }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/50">
        <AlertCircle className="h-5 w-5 text-muted-foreground/40" />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      className="object-cover"
      sizes="(max-width: 768px) 50vw, 200px"
      unoptimized
      loading="lazy"
      onError={() => setHasError(true)}
    />
  )
}

function ViewCard({
  entry,
  isActive,
  onSelect,
  onRetry,
}: {
  entry: ViewGalleryEntry
  isActive: boolean
  onSelect: () => void
  onRetry?: () => void
}) {
  const Icon = VIEW_ICONS[entry.viewId]
  const { status, imageUrl, error } = entry.result

  return (
    <button
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border text-left transition-all',
        'hover:border-primary/50 hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive && 'border-primary ring-1 ring-primary/20',
        !isActive && 'border-border',
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-muted/30">
        {status === 'completed' && imageUrl ? (
          <ViewThumbnail src={imageUrl} />
        ) : status === 'rendering' ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
            <span className="text-[10px] text-muted-foreground">Rendering...</span>
          </div>
        ) : status === 'failed' ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive/60" />
            <span className="text-[10px] text-destructive/80 px-2 text-center truncate max-w-full">
              {error ? error.slice(0, 40) : 'Failed'}
            </span>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 px-2 text-[10px]"
                onClick={(e) => {
                  e.stopPropagation()
                  onRetry()
                }}
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </Button>
            )}
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <ImageOff className="h-6 w-6 text-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground/60">Not Generated</span>
          </div>
        )}

        {status === 'completed' && (
          <div className="absolute right-1 top-1">
            <CheckCircle2 className="h-4 w-4 text-green-500 drop-shadow" />
          </div>
        )}
      </div>

      <div className={cn(
        'flex items-center gap-1.5 px-2 py-1.5',
        isActive ? 'bg-primary/5' : 'bg-background',
      )}>
        <Icon className={cn(
          'h-3.5 w-3.5 shrink-0',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )} />
        <span className={cn(
          'text-[11px] font-medium truncate',
          isActive ? 'text-primary' : 'text-foreground',
        )}>
          {entry.label}
        </span>
      </div>
    </button>
  )
}

export function MultiViewGallery({
  jobs,
  activeViewId,
  onSelectView,
  onRetryView,
}: MultiViewGalleryProps) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null)
  const entries = mapJobsToViews(jobs)
  const completedCount = entries.filter(e => e.result.status === 'completed').length
  const activeEntry = entries.find(e => e.viewId === activeViewId)

  const handleDownload = useCallback(async (url: string, viewId: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `booth-${viewId}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }, [])

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5" />
              Multi-View Gallery
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {completedCount}/6 views
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {entries.map((entry) => (
              <ViewCard
                key={entry.viewId}
                entry={entry}
                isActive={entry.viewId === activeViewId}
                onSelect={() => onSelectView(entry.viewId)}
                onRetry={onRetryView ? () => onRetryView(entry.viewId) : undefined}
              />
            ))}
          </div>

          {activeEntry?.result.status === 'completed' && activeEntry.result.imageUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">{activeEntry.label}</p>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setExpandedUrl(activeEntry.result.imageUrl)}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDownload(activeEntry.result.imageUrl!, activeEntry.viewId)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted/30">
                <ViewThumbnail src={activeEntry.result.imageUrl} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {expandedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setExpandedUrl(null) }}
        >
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-4 top-4 z-10 text-white hover:bg-white/20"
            onClick={() => setExpandedUrl(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="absolute bottom-4 right-4 z-10 text-white hover:bg-white/20"
            onClick={() => {
              const entry = entries.find(e => e.result.imageUrl === expandedUrl)
              if (entry) handleDownload(expandedUrl, entry.viewId)
            }}
          >
            <Download className="h-5 w-5" />
          </Button>
          <div className="relative h-[90vh] w-[90vw]">
            <Image
              src={expandedUrl}
              alt="Booth view (fullscreen)"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
    </>
  )
}
