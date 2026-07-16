export interface BlenderExecutableInfo {
  path: string
  version: string | null
  pythonVersion: string | null
  detected: boolean
}

export interface BlenderRuntimeConfig {
  blenderPath: string | null
  searchPaths: string[]
  timeoutMs: number
  workspaceRoot: string
  cleanupOnExit: boolean
}

export interface BlenderProcessOptions {
  scriptPath: string
  args?: string[]
  workingDirectory?: string
  timeoutMs?: number
  env?: Record<string, string>
}

export interface BlenderProcessResult {
  exitCode: number | null
  stdout: string
  stderr: string
  durationMs: number
  timedOut: boolean
}

export interface WorkspaceLayout {
  root: string
  scenes: string
  renders: string
  scripts: string
  temp: string
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface RuntimeLogEntry {
  timestamp: string
  level: LogLevel
  source: string
  message: string
  data?: Record<string, unknown>
}

export interface RuntimeValidationResult {
  valid: boolean
  blenderInstalled: boolean
  blenderPath: string | null
  blenderVersion: string | null
  pythonAvailable: boolean
  workspaceWritable: boolean
  errors: string[]
  warnings: string[]
}
