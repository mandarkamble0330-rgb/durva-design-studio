'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { GenerationJob } from '@/types/generation'
import type { PromptSections } from '@/types/generation'
import {
  Copy,
  Check,
  RefreshCw,
  FileText,
  Palette,
  Wrench,
  Sparkles,
  ImageIcon,
  MonitorIcon,
} from 'lucide-react'

interface PromptPreviewProps {
  job: GenerationJob
  onRefresh?: () => void
  refreshing?: boolean
}

const SECTION_TABS = [
  { key: 'system', label: 'System', icon: MonitorIcon },
  { key: 'design', label: 'Design', icon: FileText },
  { key: 'technicalConstraints', label: 'Technical', icon: Wrench },
  { key: 'styleInstructions', label: 'Style', icon: Palette },
  { key: 'referenceInstructions', label: 'References', icon: ImageIcon },
  { key: 'outputInstructions', label: 'Output', icon: Sparkles },
] as const

type SectionKey = (typeof SECTION_TABS)[number]['key']

export function PromptPreview({ job, onRefresh, refreshing }: PromptPreviewProps) {
  const [activeTab, setActiveTab] = useState<SectionKey | 'full'>('full')
  const [copied, setCopied] = useState(false)

  const structured = (job.metadata as Record<string, unknown>)?.structured_prompt as {
    systemPrompt: string
    userPrompt: string
    sections: PromptSections
  } | undefined

  const promptMeta = (job.metadata as Record<string, unknown>)?.prompt_metadata as Record<string, unknown> | undefined

  async function handleCopy() {
    const text = activeTab === 'full'
      ? job.prompt ?? ''
      : structured?.sections[activeTab] ?? ''

    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  function getDisplayContent(): string {
    if (activeTab === 'full') return job.prompt ?? ''
    return structured?.sections[activeTab] ?? job.prompt ?? ''
  }

  return (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" />
            Generated Prompt
          </CardTitle>
          <div className="flex items-center gap-1">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                className="h-7 gap-1 text-xs"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 gap-1 text-xs"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        {structured && (
          <div className="flex flex-wrap gap-1 pt-2">
            <button
              onClick={() => setActiveTab('full')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === 'full'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Full Prompt
            </button>
            {SECTION_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-2">
        {/* Metadata summary */}
        {promptMeta && activeTab === 'full' && (
          <div className="mb-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5">
              {(promptMeta.totalCharacters as number)?.toLocaleString()} chars
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5">
              {promptMeta.sectionCount as number} sections
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5">
              {promptMeta.zoneCount as number} zones
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5">
              {promptMeta.lightingCount as number} lighting types
            </span>
            {Boolean(promptMeta.hasLogo) && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Logo included
              </span>
            )}
            {Boolean(promptMeta.hasReferenceImages) && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Ref images
              </span>
            )}
          </div>
        )}

        <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
          {getDisplayContent()}
        </div>
      </CardContent>
    </Card>
  )
}
