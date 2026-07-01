'use client'

import { cn } from '@/lib/utils'
import { GENERATION_STATUS_CONFIG, type GenerationStatus } from '@/types/generation'

interface GenerationStatusBadgeProps {
  status: GenerationStatus
  className?: string
}

export function GenerationStatusBadge({ status, className }: GenerationStatusBadgeProps) {
  const config = GENERATION_STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  )
}
