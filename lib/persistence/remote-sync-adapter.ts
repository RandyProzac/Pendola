import type { StorageAdapter } from '@/lib/persistence/storage-adapter'

export const remoteSyncAdapter: StorageAdapter = {
  key: 'pendola-remote-store',
  getItem() {
    return null
  },
  setItem() {
    throw new Error('remoteSyncAdapter no está conectado todavía.')
  },
  removeItem() {
    throw new Error('remoteSyncAdapter no está conectado todavía.')
  },
  exportRawState() {
    return null
  },
  importRawState() {
    throw new Error('remoteSyncAdapter no está conectado todavía.')
  },
  clear() {
    throw new Error('remoteSyncAdapter no está conectado todavía.')
  },
}
