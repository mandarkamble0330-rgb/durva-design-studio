import type { BlenderRuntimeConfig, RuntimeValidationResult } from '@/types/blender-runtime'
import { detectBlender, getBlenderVersion } from './blender-detector'
import { isWorkspaceWritable } from './workspace-manager'
import { runtimeLogger } from './logger'

export async function validateRuntime(config: BlenderRuntimeConfig): Promise<RuntimeValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  runtimeLogger.info('validator', 'Starting runtime validation')

  const blenderInfo = await detectBlender(config)
  let blenderVersion: string | null = null
  let pythonAvailable = false

  if (!blenderInfo.detected) {
    errors.push('Blender executable not found. Set BLENDER_PATH environment variable or install Blender.')
  } else {
    runtimeLogger.info('validator', `Blender found at: ${blenderInfo.path}`)

    const versionInfo = await getBlenderVersion(blenderInfo.path)
    blenderVersion = versionInfo.blenderVersion

    if (blenderVersion) {
      runtimeLogger.info('validator', `Blender version: ${blenderVersion}`)
      const major = parseInt(blenderVersion.split('.')[0])
      if (major < 3) {
        errors.push(`Blender version ${blenderVersion} is too old. Minimum required: 3.6`)
      }
    } else {
      warnings.push('Could not determine Blender version')
    }

    if (versionInfo.pythonVersion) {
      pythonAvailable = true
      runtimeLogger.info('validator', `Python version: ${versionInfo.pythonVersion}`)
    } else {
      warnings.push('Could not detect Python inside Blender')
    }
  }

  let workspaceWritable = false
  if (config.workspaceRoot) {
    const fs = await import('fs')
    if (!fs.existsSync(config.workspaceRoot)) {
      try {
        fs.mkdirSync(config.workspaceRoot, { recursive: true })
      } catch {
        errors.push(`Cannot create workspace directory: ${config.workspaceRoot}`)
      }
    }
    if (fs.existsSync(config.workspaceRoot)) {
      workspaceWritable = await isWorkspaceWritable(config.workspaceRoot)
      if (!workspaceWritable) {
        errors.push(`Workspace directory is not writable: ${config.workspaceRoot}`)
      }
    }
  } else {
    warnings.push('No workspace root configured. Set BLENDER_WORKSPACE environment variable.')
  }

  const result: RuntimeValidationResult = {
    valid: errors.length === 0,
    blenderInstalled: blenderInfo.detected,
    blenderPath: blenderInfo.detected ? blenderInfo.path : null,
    blenderVersion,
    pythonAvailable,
    workspaceWritable,
    errors,
    warnings,
  }

  runtimeLogger.info('validator', `Validation complete: ${result.valid ? 'PASS' : 'FAIL'}`, {
    errors: errors.length,
    warnings: warnings.length,
  })

  return result
}
