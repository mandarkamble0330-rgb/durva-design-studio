'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAllCameraViews } from '@/lib/camera'
import type { CameraViewId } from '@/types/camera'
import {
  Monitor,
  PanelLeft,
  PanelRight,
  FlipHorizontal,
  RotateCcw,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const VIEW_ICONS: Record<CameraViewId, React.ComponentType<{ className?: string }>> = {
  front: Monitor,
  left: PanelLeft,
  right: PanelRight,
  rear: FlipHorizontal,
  angle_45: RotateCcw,
  top_iso: Layers,
}

interface CameraViewSelectorProps {
  activeViewId: CameraViewId
  onSelectView: (viewId: CameraViewId) => void
  completedViews?: CameraViewId[]
  disabled?: boolean
}

export function CameraViewSelector({
  activeViewId,
  onSelectView,
  completedViews = [],
  disabled = false,
}: CameraViewSelectorProps) {
  const views = getAllCameraViews()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Camera View</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-2">
          {views.map((view) => {
            const Icon = VIEW_ICONS[view.id]
            const isActive = view.id === activeViewId
            const isCompleted = completedViews.includes(view.id)

            return (
              <button
                key={view.id}
                onClick={() => onSelectView(view.id)}
                disabled={disabled}
                className={cn(
                  'relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all',
                  'hover:border-primary/50 hover:bg-accent/50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:pointer-events-none disabled:opacity-50',
                  isActive && 'border-primary bg-primary/5 ring-1 ring-primary/20',
                  !isActive && 'border-border bg-background',
                )}
              >
                {isCompleted && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-green-500" />
                )}
                <Icon className={cn(
                  'h-5 w-5',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )} />
                <span className={cn(
                  'text-[10px] font-medium leading-tight',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}>
                  {view.label}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {views.find(v => v.id === activeViewId)?.description}
        </p>
      </CardContent>
    </Card>
  )
}
