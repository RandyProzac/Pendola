export const PENDOLA_RECOVERY_NOTICE_KEY = 'pendola-recovery-notice'

export interface RecoveryNotice {
  chapterId: string
  workspace: 'writing' | 'editorial'
  chapterTitle: string
  savedAt: string
}

export function setRecoveryNotice(notice: RecoveryNotice) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(PENDOLA_RECOVERY_NOTICE_KEY, JSON.stringify(notice))
}

export function consumeRecoveryNotice() {
  if (typeof window === 'undefined') return null

  const raw = window.sessionStorage.getItem(PENDOLA_RECOVERY_NOTICE_KEY)
  if (!raw) return null

  window.sessionStorage.removeItem(PENDOLA_RECOVERY_NOTICE_KEY)

  try {
    return JSON.parse(raw) as RecoveryNotice
  } catch {
    return null
  }
}
