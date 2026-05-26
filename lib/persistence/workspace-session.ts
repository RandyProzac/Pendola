export interface WorkspaceResumeState {
  chapterId: string
  chapterTitle: string
  lastVisitedAt: string
  lastSavedAt?: string
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

export function loadWorkspaceResumeState(storageKey: string) {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(storageKey)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as WorkspaceResumeState
    if (!parsed?.chapterId || !parsed?.chapterTitle || !parsed?.lastVisitedAt) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveWorkspaceResumeState(
  storageKey: string,
  value: WorkspaceResumeState
) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(value))
}

export function formatRelativeWorkspaceTime(value?: string) {
  if (!value) return 'sin registro'

  const target = new Date(value).getTime()
  const now = Date.now()
  const diffMs = target - now
  const diffMinutes = Math.round(diffMs / 60_000)

  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMs / 3_600_000)
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffMs / 86_400_000)
  return relativeTimeFormatter.format(diffDays, 'day')
}
