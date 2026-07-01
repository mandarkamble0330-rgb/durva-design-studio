'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { GenerationJob } from '@/types/generation'
import {
  Images,
  Download,
  Maximize2,
  X,
  Grid2X2,
  LayoutList,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface GeneratedImagesProps {
  job: GenerationJob
}

type ViewMode = 'grid' | 'single'

function LeonardoMetadata({ job }: { job: GenerationJob }) {
  const metadata = job.metadata as Record<string, unknown> | null
  const leonardo = metadata?.leonardo as Record<string, unknown> | null
  if (!leonardo) return null

  const items: Array<{ label: string; value: string }> = []

  if (leonardo.generationTime) {
    items.push({ label: 'Render', value: `${Math.round(Number(leonardo.generationTime))}s` })
  }
  if (leonardo.width && leonardo.height) {
    items.push({ label: 'Size', value: `${String(leonardo.width)}×${String(leonardo.height)}px` })
  }
  if (leonardo.seed !== undefined) {
    items.push({ label: 'Seed', value: String(leonardo.seed) })
  }
  if (leonardo.generationId) {
    items.push({ label: 'ID', value: String(leonardo.generationId).slice(0, 8) })
  }
  if (leonardo.modelId) {
    items.push({ label: 'Model', value: String(leonardo.modelId).slice(0, 12) })
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {items.map((item) => (
          <span key={item.label}>
            <span className="font-medium">{item.label}:</span> {item.value}
          </span>
        ))}
      </div>
      {Boolean(leonardo.usedReference) && (
        <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          Reference image used
        </span>
      )}
    </div>
  )
}

function ImageWithFallback({
  src,
  alt,
  fill,
  className,
  sizes,
  onError,
}: {
  src: string
  alt: string
  fill?: boolean
  className?: string
  sizes?: string
  onError?: () => void
}) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-muted/50 text-muted-foreground">
        <AlertCircle className="h-8 w-8 opacity-40" />
        <p className="mt-2 text-xs">Image unavailable</p>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      unoptimized
      loading="lazy"
      onError={() => {
        setHasError(true)
        onError?.()
      }}
    />
  )
}

export function GeneratedImages({ job }: GeneratedImagesProps) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('single')
  const [activeIndex, setActiveIndex] = useState(0)

  const urls = job.image_urls ?? []

  useEffect(() => {
    if (!expandedUrl) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpandedUrl(null)
      if (e.key === 'ArrowRight') {
        const idx = urls.indexOf(expandedUrl!)
        if (idx < urls.length - 1) setExpandedUrl(urls[idx + 1])
      }
      if (e.key === 'ArrowLeft') {
        const idx = urls.indexOf(expandedUrl!)
        if (idx > 0) setExpandedUrl(urls[idx - 1])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [expandedUrl, urls])

  const handleDownload = useCallback(async (url: string, index: number) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `booth-design-${job.id.slice(0, 8)}-${index + 1}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }, [job.id])

  if (urls.length === 0) return null

  const showMultipleControls = urls.length > 1

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Images className="h-5 w-5" />
              Generated Booth Images
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {urls.length} image{urls.length > 1 ? 's' : ''}
              </span>
              {showMultipleControls && (
                <div className="flex rounded-md border">
                  <Button
                    variant={viewMode === 'single' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-7 w-7 rounded-r-none"
                    onClick={() => setViewMode('single')}
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-7 w-7 rounded-l-none"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid2X2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'grid' && showMultipleControls ? (
            <div className="grid grid-cols-2 gap-3">
              {urls.map((url, i) => (
                <div key={i} className="group relative overflow-hidden rounded-lg border bg-muted/30">
                  <div className="relative aspect-[4/3] w-full">
                    <ImageWithFallback
                      src={url}
                      alt={`Generated booth design ${i + 1}`}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 50vw, 300px"
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => setExpandedUrl(url)}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => handleDownload(url, i)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="group relative overflow-hidden rounded-lg border bg-muted/30">
                <div className="relative aspect-[4/3] w-full">
                  <ImageWithFallback
                    src={urls[activeIndex]}
                    alt={`Generated booth design ${activeIndex + 1}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                </div>
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => setExpandedUrl(urls[activeIndex])}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => handleDownload(urls[activeIndex], activeIndex)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                {showMultipleControls && (
                  <>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-0"
                      disabled={activeIndex === 0}
                      onClick={() => setActiveIndex(activeIndex - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-0"
                      disabled={activeIndex === urls.length - 1}
                      onClick={() => setActiveIndex(activeIndex + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              {showMultipleControls && (
                <div className="flex justify-center gap-1.5">
                  {urls.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIndex(i)}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        i === activeIndex
                          ? 'bg-primary'
                          : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <LeonardoMetadata job={job} />
        </CardContent>
      </Card>

      {/* Fullscreen overlay */}
      {expandedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExpandedUrl(null)
          }}
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
            onClick={() => handleDownload(expandedUrl, urls.indexOf(expandedUrl))}
          >
            <Download className="h-5 w-5" />
          </Button>

          {urls.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/20 disabled:opacity-30"
                disabled={urls.indexOf(expandedUrl) === 0}
                onClick={() => {
                  const idx = urls.indexOf(expandedUrl)
                  if (idx > 0) setExpandedUrl(urls[idx - 1])
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/20 disabled:opacity-30"
                disabled={urls.indexOf(expandedUrl) === urls.length - 1}
                onClick={() => {
                  const idx = urls.indexOf(expandedUrl)
                  if (idx < urls.length - 1) setExpandedUrl(urls[idx + 1])
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
              <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-sm text-white/70">
                {urls.indexOf(expandedUrl) + 1} / {urls.length}
              </div>
            </>
          )}

          <div className="relative h-[90vh] w-[90vw]">
            <ImageWithFallback
              src={expandedUrl}
              alt="Generated booth design (fullscreen)"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </>
  )
}
