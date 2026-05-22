import type { StorageAdapter } from '@/lib/persistence/storage-adapter'
import { emitStorageError, PENDOLA_STORE_KEY } from '@/lib/persistence/storage-adapter'

export const browserLocalAdapter: StorageAdapter = {
  key: PENDOLA_STORE_KEY,
  getItem(name) {
    if (typeof window === 'undefined') return null

    try {
      return window.localStorage.getItem(name)
    } catch (error) {
      emitStorageError(error)
      return null
    }
  },
  setItem(name, value) {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(name, value)
    } catch (error) {
      emitStorageError(error)
    }
  },
  removeItem(name) {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.removeItem(name)
    } catch (error) {
      emitStorageError(error)
    }
  },
  exportRawState() {
    if (typeof window === 'undefined') return null

    try {
      return window.localStorage.getItem(this.key)
    } catch (error) {
      emitStorageError(error)
      return null
    }
  },
  importRawState(rawState) {
    this.setItem(this.key, rawState)
  },
  clear() {
    this.removeItem(this.key)
  },
}
