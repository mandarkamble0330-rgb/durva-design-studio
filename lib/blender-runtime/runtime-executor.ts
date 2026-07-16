import type { BlenderScene } from '@/types/blender'
import type { BlenderRuntimeConfig, BlenderProcessResult, WorkspaceLayout } from '@/types/blender-runtime'
import { detectBlender } from './blender-detector'
import { runBlenderProcess } from './process-runner'
import { createWorkspace, cleanupWorkspace } from './workspace-manager'
import { generateBlenderScript } from './script-generator'
import { runtimeLogger } from './logger'

export interface ExecutionResult {
  success: boolean
  blendFilePath: string | null
  workspace: WorkspaceLayout
  processResult: BlenderProcessResult | null
  error: string | null
}

export async function executeBlenderScene(
  scene: BlenderScene,
  config: BlenderRuntimeConfig
): Promise<ExecutionResult> {
  const fs = await import('fs')
  const path = await import('path')

  const blenderInfo = await detectBlender(config)
  if (!blenderInfo.detected) {
    return {
      success: false,
      blendFilePath: null,
      workspace: { root: '', scenes: '', renders: '', scripts: '', temp: '' },
      processResult: null,
      error: 'Blender executable not found',
    }
  }

  const workspaceRoot = config.workspaceRoot || (await import('os')).tmpdir()
  const workspace = await createWorkspace(scene.metadata.sourceProjectId, workspaceRoot)

  const blendFileName = `${scene.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.blend`
  const blendFilePath = path.join(workspace.scenes, blendFileName)
  const scriptPath = path.join(workspace.scripts, 'build_scene.py')

  runtimeLogger.info('executor', 'Generating Blender Python script', {
    objects: scene.metadata.objectCount,
    materials: scene.metadata.materialCount,
  })

  const script = generateBlenderScript(scene, blendFilePath)
  fs.writeFileSync(scriptPath, script, 'utf-8')

  runtimeLogger.info('executor', `Script written to ${scriptPath}`, {
    scriptSize: script.length,
  })

  const processResult = await runBlenderProcess(blenderInfo.path, {
    scriptPath,
    workingDirectory: workspace.root,
    timeoutMs: config.timeoutMs,
  })

  const blendSaved = processResult.stdout.includes('BLEND_SAVED:')
  const scriptComplete = processResult.stdout.includes('SCRIPT_COMPLETE')
  const blendExists = fs.existsSync(blendFilePath)

  const success = processResult.exitCode === 0 && blendSaved && scriptComplete && blendExists

  if (success) {
    runtimeLogger.info('executor', `Scene built successfully: ${blendFilePath}`, {
      duration: processResult.durationMs,
    })
  } else {
    const reason = processResult.timedOut ? 'Process timed out'
      : !blendSaved ? 'Blend file was not saved'
      : !scriptComplete ? 'Script did not complete'
      : !blendExists ? 'Blend file not found on disk'
      : `Exit code: ${processResult.exitCode}`

    runtimeLogger.error('executor', `Scene build failed: ${reason}`, {
      exitCode: processResult.exitCode,
      stderr: processResult.stderr.slice(0, 500),
    })
  }

  return {
    success,
    blendFilePath: blendExists ? blendFilePath : null,
    workspace,
    processResult,
    error: success ? null : processResult.stderr.slice(0, 1000) || 'Unknown error',
  }
}

export async function cleanupExecution(workspace: WorkspaceLayout, keepBlend: boolean): Promise<void> {
  if (keepBlend) {
    const fs = await import('fs')
    const path = await import('path')
    const blendFiles = fs.existsSync(workspace.scenes)
      ? fs.readdirSync(workspace.scenes).filter((f: string) => f.endsWith('.blend'))
      : []

    if (blendFiles.length > 0) {
      runtimeLogger.info('executor', `Keeping ${blendFiles.length} .blend file(s), cleaning rest`)
      for (const dir of [workspace.scripts, workspace.temp, workspace.renders]) {
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
      }
      return
    }
  }

  await cleanupWorkspace(workspace)
}
