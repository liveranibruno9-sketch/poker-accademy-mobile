// Abstract cloud-sync interface. NOT implemented in v1 — предисposto so cloud
// sync can be added later without refactoring the store.
import { SessionRecord } from "@/src/store/appStore";

export interface SyncProvider {
  isEnabled(): boolean;
  pushSessions(sessions: SessionRecord[]): Promise<void>;
  pullSessions(): Promise<SessionRecord[]>;
  lastSyncedAt(): Promise<string | null>;
}

// No-op provider used in v1 (local profile only, no network dependency).
export const noopSyncProvider: SyncProvider = {
  isEnabled: () => false,
  pushSessions: async () => {},
  pullSessions: async () => [],
  lastSyncedAt: async () => null,
};
