'use client'

import { cn } from '@/lib/utils'
import {
  GENERATION_STATUS_ORDER,
  GENERATION_STATUS_CONFIG,
  type GenerationStatus,
} from '@/types/generation'
import { Check, Circle, Loader2, X } from 'lucide-react'

interface ProgressTimelineProps {
  currentStatus: GenerationStatus
}

export function ProgressTimeline({ currentStatus }: ProgressTimelineProps) {
  const currentIdx = GENERATION_STATUS_ORDER.indexOf(currentStatus)
  const isFailed = currentStatus === 'failed'
  const isCancelled = currentStatus === 'cancelled'

  return (
    <div className="space-y-1">
      {GENERATION_STATUS_ORDER.map((step, idx) => {
        const config = GENERATION_STATUS_CONFIG[step]
        const isCompleted = currentIdx > idx
        const isCurrent = step === currentStatus
        const isPending = currentIdx < idx

        let Icon = Circle
        let iconColor = 'text-muted-foreground/30'
        let lineColor = 'bg-muted'
        let textColor = 'text-muted-foreground/40'

        if (isCompleted) {
          Icon = Check
          iconColor = 'text-green-600'
          lineColor = 'bg-green-500'
          textColor = 'text-foreground'
        } else if (isCurrent) {
          if (isFailed || isCancelled) {
            Icon = X
            iconColor = isFailed ? 'text-red-500' : 'text-muted-foreground'
            textColor = isFailed ? 'text-red-600' : 'text-muted-foreground'
          } else {
            Icon = Loader2
            iconColor = 'text-primary'
            textColor = 'text-foreground font-medium'
          }
        }

        return (
          <div key={step} className="flex items-start gap-3">
            {/* Connector + Icon */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border',
                  isCompleted && 'border-green-500 bg-green-50 dark:bg-green-950',
                  isCurrent && !isFailed && !isCancelled && 'border-primary bg-primary/10',
                  isCurrent && isFailed && 'border-red-500 bg-red-50 dark:bg-red-950',
                  isCurrent && isCancelled && 'border-muted-foreground bg-muted',
                  isPending && 'border-muted-foreground/20'
                )}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5',
                    iconColor,
                    isCurrent && !isFailed && !isCancelled && 'animate-spin'
                  )}
                />
              </div>
              {idx < GENERATION_STATUS_ORDER.length - 1 && (
                <div className={cn('h-4 w-0.5 rounded-full', isCompleted ? lineColor : 'bg-muted')} />
              )}
            </div>

            {/* Label */}
            <div className="pb-3">
              <p className={cn('text-sm leading-6', textColor)}>{config.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
