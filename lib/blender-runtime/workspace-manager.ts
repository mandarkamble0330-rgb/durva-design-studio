import type { WorkspaceLayout } from '@/types/blender-runtime'
import { runtimeLogger } from './logger'

export async function createWorkspace(projectId: string, baseDir: string): Promise<WorkspaceLayout> {
  const fs = await import('fs')
  const path = await import('path')

  const timestamp = Date.now().toString(36)
  const workspaceName = `blender_${projectId}_${timestamp}`
  const root = path.join(baseDir, workspaceName)

  const layout: WorkspaceLayout = {
    root,
    scenes: path.join(root, 'scenes'),
    renders: path.join(root, 'renders'),
    scripts: path.join(root, 'scripts'),
    temp: path.join(root, 'temp'),
  }

  for (const dir of Object.values(layout)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  runtimeLogger.info('workspace', `Created workspace at ${root}`, {
    projectId,
    folders: Object.keys(layout),
  })

  return layout
}

export async function cleanupWorkspace(workspace: WorkspaceLayout): Promise<void> {
  const fs = await import('fs')

  if (!fs.existsSync(workspace.root)) {
    runtimeLogger.warn('workspace', `Workspace not found for cleanup: ${workspace.root}`)
    return
  }

  fs.rmSync(workspace.root, { recursive: true, force: true })
  runtimeLogger.info('workspace', `Cleaned up workspace: ${workspace.root}`)
}

export async function ensureWorkspaceExists(workspace: WorkspaceLayout): Promise<boolean> {
  const fs = await import('fs')

  for (const dir of Object.values(workspace)) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true })
      } catch {
        runtimeLogger.error('workspace', `Failed to create directory: ${dir}`)
        return false
      }
    }
  }

  return true
}

export async function isWorkspaceWritable(dirPath: string): Promise<boolean> {
  const fs = await import('fs')
  const path = await import('path')

  try {
    const testFile = path.join(dirPath, `.write_test_${Date.now()}`)
    fs.writeFileSync(testFile, 'test')
    fs.unlinkSync(testFile)
    return true
  } catch {
    return false
  }
}
