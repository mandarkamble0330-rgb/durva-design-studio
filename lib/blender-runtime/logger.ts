import type { LogLevel, RuntimeLogEntry } from '@/types/blender-runtime'

const LOG_BUFFER: RuntimeLogEntry[] = []
const MAX_BUFFER_SIZE = 1000

function createEntry(level: LogLevel, source: string, message: string, data?: Record<string, unknown>): RuntimeLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    data,
  }
}

function append(entry: RuntimeLogEntry): void {
  LOG_BUFFER.push(entry)
  if (LOG_BUFFER.length > MAX_BUFFER_SIZE) {
    LOG_BUFFER.splice(0, LOG_BUFFER.length - MAX_BUFFER_SIZE)
  }

  const prefix = `[BlenderRuntime:${entry.source}]`
  switch (entry.level) {
    case 'debug':
      console.debug(prefix, entry.message, entry.data ?? '')
      break
    case 'info':
      console.log(prefix, entry.message, entry.data ?? '')
      break
    case 'warn':
      console.warn(prefix, entry.message, entry.data ?? '')
      break
    case 'error':
      console.error(prefix, entry.message, entry.data ?? '')
      break
  }
}

export const runtimeLogger = {
  debug(source: string, message: string, data?: Record<string, unknown>): void {
    append(createEntry('debug', source, message, data))
  },
  info(source: string, message: string, data?: Record<string, unknown>): void {
    append(createEntry('info', source, message, data))
  },
  warn(source: string, message: string, data?: Record<string, unknown>): void {
    append(createEntry('warn', source, message, data))
  },
  error(source: string, message: string, data?: Record<string, unknown>): void {
    append(createEntry('error', source, message, data))
  },
  getEntries(level?: LogLevel, source?: string, limit?: number): RuntimeLogEntry[] {
    let entries = [...LOG_BUFFER]
    if (level) entries = entries.filter(e => e.level === level)
    if (source) entries = entries.filter(e => e.source === source)
    if (limit) entries = entries.slice(-limit)
    return entries
  },
  clear(): void {
    LOG_BUFFER.length = 0
  },
}
