'use client'

import { useState, useCallback } from 'react'
import { GenerationPanel } from './generation-panel'
import { HistorySidebar } from './history-sidebar'
import { ProjectSidebar } from './project-sidebar'
import { CameraViewSelector } from './camera-view-selector'
import { MultiViewGallery } from './multi-view-gallery'
import type { GenerationJob } from '@/types/generation'
import type { CameraViewId } from '@/types/camera'
import type { Project } from '@/types'

interface BoothWorkspaceProps {
  project: Project
  jobs: GenerationJob[]
}

export function BoothWorkspace({ project, jobs }: BoothWorkspaceProps) {
  const latestJob = jobs.length > 0 ? jobs[0] : null
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(latestJob)
  const [activeViewId, setActiveViewId] = useState<CameraViewId>('front')
  const [generating, setGenerating] = useState(false)

  const handleSelectJob = useCallback((job: GenerationJob) => {
    setActiveJob(job)
  }, [])

  const handleJobChange = useCallback((job: GenerationJob | null) => {
    setActiveJob(job)
  }, [])

  const handleSelectView = useCallback((viewId: CameraViewId) => {
    setActiveViewId(viewId)
  }, [])

  const handleGeneratingChange = useCallback((isGenerating: boolean) => {
    setGenerating(isGenerating)
  }, [])

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Sidebar */}
      <div className="hidden w-72 shrink-0 overflow-y-auto border-r p-4 lg:block">
        <ProjectSidebar project={project} />
        <div className="mt-4">
          <CameraViewSelector
            activeViewId={activeViewId}
            onSelectView={handleSelectView}
            disabled={generating}
          />
        </div>
      </div>

      {/* Center Workspace */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mb-6 lg:hidden">
          <ProjectSidebar project={project} />
          <div className="mt-4">
            <CameraViewSelector
              activeViewId={activeViewId}
              onSelectView={handleSelectView}
              disabled={generating}
            />
          </div>
        </div>
        <GenerationPanel
          projectId={project.id}
          latestJob={activeJob}
          onJobChange={handleJobChange}
          cameraViewId={activeViewId}
          onGeneratingChange={handleGeneratingChange}
        />
        <div className="mt-6">
          <MultiViewGallery
            jobs={jobs}
            activeViewId={activeViewId}
            onSelectView={handleSelectView}
          />
        </div>
        <div className="mt-6 xl:hidden">
          <HistorySidebar
            jobs={jobs}
            activeJobId={activeJob?.id}
            onSelectJob={handleSelectJob}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden w-64 shrink-0 overflow-y-auto border-l p-4 xl:block">
        <HistorySidebar
          jobs={jobs}
          activeJobId={activeJob?.id}
          onSelectJob={handleSelectJob}
        />
      </div>
    </div>
  )
}
