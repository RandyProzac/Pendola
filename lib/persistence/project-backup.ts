import type { ProjectBackup } from '@/lib/types'

export const PROJECT_BACKUP_VERSION = 1 as const

export function isProjectBackup(value: unknown): value is ProjectBackup {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<ProjectBackup>

  return (
    candidate.version === PROJECT_BACKUP_VERSION &&
    !!candidate.project &&
    Array.isArray(candidate.books) &&
    Array.isArray(candidate.chapters) &&
    Array.isArray(candidate.chapterSnapshots) &&
    Array.isArray(candidate.editorialDrafts) &&
    Array.isArray(candidate.characters) &&
    Array.isArray(candidate.scenarios) &&
    Array.isArray(candidate.resources) &&
    Array.isArray(candidate.ideaNotes) &&
    Array.isArray(candidate.entityMentions) &&
    Array.isArray(candidate.aiConversations)
  )
}

export function parseProjectBackup(raw: string) {
  const parsed = JSON.parse(raw) as unknown

  if (!isProjectBackup(parsed)) {
    throw new Error('El archivo no tiene un formato de respaldo compatible con Péndola.')
  }

  return parsed
}

export function serializeProjectBackup(backup: ProjectBackup) {
  return JSON.stringify(backup, null, 2)
}
