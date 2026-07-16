import type { BlenderExecutableInfo, BlenderRuntimeConfig } from '@/types/blender-runtime'

const BLENDER_FOUNDATION_DIRS_WIN = [
  'C:\\Program Files\\Blender Foundation',
  'C:\\Program Files (x86)\\Blender Foundation',
]

const STATIC_SEARCH_PATHS_MAC = [
  '/Applications/Blender.app/Contents/MacOS/Blender',
]

const STATIC_SEARCH_PATHS_LINUX = [
  '/usr/bin/blender',
  '/usr/local/bin/blender',
  '/snap/bin/blender',
]

function parseVersion(name: string): number[] | null {
  const match = name.match(/(\d+)\.(\d+)/)
  if (!match) return null
  return [parseInt(match[1]), parseInt(match[2])]
}

function scanBlenderFoundationDirs(): string[] {
  try {
    const fs = require('fs')
    const path = require('path')
    const found: Array<{ path: string; version: number[] }> = []

    for (const baseDir of BLENDER_FOUNDATION_DIRS_WIN) {
      if (!fs.existsSync(baseDir)) continue
      const entries = fs.readdirSync(baseDir, { withFileTypes: true }) as Array<{ isDirectory(): boolean; name: string }>
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const ver = parseVersion(entry.name)
        if (!ver) continue
        const exePath = path.join(baseDir, entry.name, 'blender.exe')
        if (fs.existsSync(exePath)) {
          found.push({ path: exePath, version: ver })
        }
      }
    }

    found.sort((a, b) => {
      for (let i = 0; i < Math.max(a.version.length, b.version.length); i++) {
        const diff = (b.version[i] ?? 0) - (a.version[i] ?? 0)
        if (diff !== 0) return diff
      }
      return 0
    })

    return found.map(f => f.path)
  } catch {
    return []
  }
}

function findBlenderOnPath(): string | null {
  const pathEnv = process.env.PATH ?? ''
  const sep = process.platform === 'win32' ? ';' : ':'
  const exe = process.platform === 'win32' ? 'blender.exe' : 'blender'

  try {
    const fs = require('fs')
    const path = require('path')
    for (const dir of pathEnv.split(sep)) {
      if (!dir) continue
      const candidate = path.join(dir, exe)
      if (fs.existsSync(candidate)) return candidate
    }
  } catch {}
  return null
}

export function getDefaultSearchPaths(): string[] {
  const platform = process.platform
  switch (platform) {
    case 'win32': return [...scanBlenderFoundationDirs()]
    case 'darwin': return STATIC_SEARCH_PATHS_MAC
    case 'linux': return STATIC_SEARCH_PATHS_LINUX
    default: return STATIC_SEARCH_PATHS_LINUX
  }
}

export function getDefaultConfig(): BlenderRuntimeConfig {
  const blenderPathEnv = process.env.BLENDER_PATH ?? null

  return {
    blenderPath: blenderPathEnv,
    searchPaths: getDefaultSearchPaths(),
    timeoutMs: 300_000,
    workspaceRoot: process.env.BLENDER_WORKSPACE ?? '',
    cleanupOnExit: true,
  }
}

export async function detectBlender(config: BlenderRuntimeConfig): Promise<BlenderExecutableInfo> {
  const fs = await import('fs')
  const path = await import('path')

  if (config.blenderPath) {
    const resolved = path.resolve(config.blenderPath)
    if (fs.existsSync(resolved)) {
      return { path: resolved, version: null, pythonVersion: null, detected: true }
    }
  }

  for (const searchPath of config.searchPaths) {
    const resolved = path.resolve(searchPath)
    if (fs.existsSync(resolved)) {
      return { path: resolved, version: null, pythonVersion: null, detected: true }
    }
  }

  const pathResult = findBlenderOnPath()
  if (pathResult) {
    return { path: pathResult, version: null, pythonVersion: null, detected: true }
  }

  return { path: '', version: null, pythonVersion: null, detected: false }
}

export async function getBlenderVersion(blenderPath: string): Promise<{ blenderVersion: string | null; pythonVersion: string | null }> {
  const { execFile } = await import('child_process')
  const { promisify } = await import('util')
  const execFileAsync = promisify(execFile)

  try {
    const { stdout } = await execFileAsync(blenderPath, ['--version'], { timeout: 10_000 })
    const versionMatch = stdout.match(/Blender\s+(\d+\.\d+(?:\.\d+)?)/i)
    const pythonMatch = stdout.match(/Python\s+(\d+\.\d+(?:\.\d+)?)/i) ??
      stdout.match(/bundled Python:\s*(\d+\.\d+(?:\.\d+)?)/i)

    return {
      blenderVersion: versionMatch?.[1] ?? null,
      pythonVersion: pythonMatch?.[1] ?? null,
    }
  } catch {
    return { blenderVersion: null, pythonVersion: null }
  }
}
