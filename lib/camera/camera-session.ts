import type {
  CameraViewId,
  CameraViewResult,
  CameraSession,
} from '@/types/camera'
import { VIEW_ORDER } from './camera-presets'

export function createCameraSession(
  projectId: string,
  initialViewId: CameraViewId = 'front',
): CameraSession {
  const now = new Date().toISOString()
  const views = {} as Record<CameraViewId, CameraViewResult | null>
  for (const id of VIEW_ORDER) {
    views[id] = null
  }

  return {
    id: crypto.randomUUID(),
    projectId,
    activeViewId: initialViewId,
    views,
    createdAt: now,
    updatedAt: now,
  }
}

export function setActiveView(
  session: CameraSession,
  viewId: CameraViewId,
): CameraSession {
  return {
    ...session,
    activeViewId: viewId,
    updatedAt: new Date().toISOString(),
  }
}

export function setViewResult(
  session: CameraSession,
  viewId: CameraViewId,
  result: CameraViewResult,
): CameraSession {
  return {
    ...session,
    views: { ...session.views, [viewId]: result },
    updatedAt: new Date().toISOString(),
  }
}

export function getViewResult(
  session: CameraSession,
  viewId: CameraViewId,
): CameraViewResult | null {
  return session.views[viewId] ?? null
}

export function getCompletedViews(session: CameraSession): CameraViewId[] {
  return VIEW_ORDER.filter(id => session.views[id]?.status === 'completed')
}

export function getPendingViews(session: CameraSession): CameraViewId[] {
  return VIEW_ORDER.filter(id => !session.views[id] || session.views[id]?.status === 'pending')
}

export function isSessionComplete(session: CameraSession): boolean {
  return VIEW_ORDER.every(id => session.views[id]?.status === 'completed')
}
