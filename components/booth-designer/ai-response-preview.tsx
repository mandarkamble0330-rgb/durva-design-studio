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
import type { GenerationJob, OpenRouterDesignResponse } from '@/types/generation'
import {
  Copy,
  Check,
  BrainCircuit,
  Lightbulb,
  Layout,
  Palette,
  Hammer,
  Lamp,
  Footprints,
  ImageIcon,
  Ban,
} from 'lucide-react'

interface AIResponsePreviewProps {
  job: GenerationJob
}

const RESPONSE_SECTIONS = [
  { key: 'design_summary', label: 'Design Summary', icon: BrainCircuit },
  { key: 'design_concept', label: 'Design Concept', icon: Lightbulb },
  { key: 'layout_description', label: 'Layout', icon: Layout },
  { key: 'color_strategy', label: 'Color Strategy', icon: Palette },
  { key: 'materials', label: 'Materials', icon: Hammer },
  { key: 'lighting_plan', label: 'Lighting Plan', icon: Lamp },
  { key: 'visitor_flow', label: 'Visitor Flow', icon: Footprints },
  { key: 'rendering_prompt', label: 'Rendering Prompt', icon: ImageIcon },
  { key: 'negative_prompt', label: 'Negative Prompt', icon: Ban },
] as const

type ResponseKey = (typeof RESPONSE_SECTIONS)[number]['key']

export function AIResponsePreview({ job }: AIResponsePreviewProps) {
  const [activeSection, setActiveSection] = useState<ResponseKey | 'all'>('all')
  const [copied, setCopied] = useState(false)

  const structured = (job.metadata as Record<string, unknown>)?.ai_response_structured as OpenRouterDesignResponse | undefined

  const response: OpenRouterDesignResponse | null = structured ?? (() => {
    if (!job.ai_response) return null
    try { return JSON.parse(job.ai_response) as OpenRouterDesignResponse } catch { return null }
  })()

  if (!response) return null

  const aiModel = (job.metadata as Record<string, unknown>)?.ai_model_used as string | undefined

  async function handleCopy() {
    const text = activeSection === 'all'
      ? JSON.stringify(response, null, 2)
      : response![activeSection as ResponseKey] ?? ''

    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BrainCircuit className="h-4 w-4" />
            AI Design Response
          </CardTitle>
          <div className="flex items-center gap-2">
            {aiModel && (
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {aiModel}
              </span>
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

        <div className="flex flex-wrap gap-1 pt-2">
          <button
            onClick={() => setActiveSection('all')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeSection === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All Sections
          </button>
          {RESPONSE_SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeSection === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {activeSection === 'all' ? (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {RESPONSE_SECTIONS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </h4>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {response[key]}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {response[activeSection]}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
