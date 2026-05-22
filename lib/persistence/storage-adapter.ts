import { createJSONStorage, type StateStorage } from 'zustand/middleware'

export const PENDOLA_STORE_KEY = 'pendola-store'
export const PENDOLA_STORAGE_ERROR_EVENT = 'pendola-storage-error'

export interface StorageAdapter extends StateStorage {
  key: string
  exportRawState: () => string | null
  importRawState: (rawState: string) => void
  clear: () => void
}

export function emitStorageError(error: unknown) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent(PENDOLA_STORAGE_ERROR_EVENT, {
      detail: error instanceof Error ? error.message : 'No se pudo guardar el proyecto localmente.',
    })
  )
}

export function createPersistStorage(adapter: StorageAdapter) {
  return createJSONStorage(() => adapter)
}
