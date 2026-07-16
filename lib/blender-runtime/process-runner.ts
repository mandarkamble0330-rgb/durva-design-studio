import type { BlenderProcessOptions, BlenderProcessResult } from '@/types/blender-runtime'
import { runtimeLogger } from './logger'

export async function runBlenderProcess(
  blenderPath: string,
  options: BlenderProcessOptions
): Promise<BlenderProcessResult> {
  const { execFile } = await import('child_process')
  const startTime = Date.now()

  const args = [
    '--background',
    '--python', options.scriptPath,
    ...(options.args ?? []),
  ]

  const timeoutMs = options.timeoutMs ?? 300_000

  runtimeLogger.info('process-runner', `Starting Blender process`, {
    blenderPath,
    script: options.scriptPath,
    timeout: timeoutMs,
  })

  return new Promise<BlenderProcessResult>((resolve) => {
    let timedOut = false
    let stdoutData = ''
    let stderrData = ''

    const child = execFile(
      blenderPath,
      args,
      {
        cwd: options.workingDirectory,
        timeout: timeoutMs,
        env: { ...process.env, ...options.env },
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - startTime
        stdoutData = stdout ?? ''
        stderrData = stderr ?? ''

        if (error && 'killed' in error && error.killed) {
          timedOut = true
          runtimeLogger.error('process-runner', `Blender process timed out after ${durationMs}ms`)
        }

        const exitCode = error ? (error as NodeJS.ErrnoException & { code?: number }).code as unknown as number ?? 1 : 0

        if (exitCode !== 0 && !timedOut) {
          runtimeLogger.error('process-runner', `Blender process exited with code ${exitCode}`, {
            stderr: stderrData.slice(0, 500),
          })
        } else if (!timedOut) {
          runtimeLogger.info('process-runner', `Blender process completed in ${durationMs}ms`)
        }

        resolve({
          exitCode: timedOut ? null : exitCode,
          stdout: stdoutData,
          stderr: stderrData,
          durationMs,
          timedOut,
        })
      }
    )

    child.on('error', (err) => {
      const durationMs = Date.now() - startTime
      runtimeLogger.error('process-runner', `Failed to start Blender process: ${err.message}`)
      resolve({
        exitCode: null,
        stdout: stdoutData,
        stderr: err.message,
        durationMs,
        timedOut: false,
      })
    })
  })
}
