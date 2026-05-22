let currentSupabaseUserId: string | null = null;
let remoteSyncEnabled = false;

export function setCurrentSupabaseUserId(userId: string | null) {
  currentSupabaseUserId = userId;
}

export function getCurrentSupabaseUserId() {
  return currentSupabaseUserId;
}

export function setRemoteSyncEnabled(enabled: boolean) {
  remoteSyncEnabled = enabled;
}

export function isRemoteSyncEnabled() {
  return remoteSyncEnabled;
}
