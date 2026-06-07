import { useEffect, useSyncExternalStore } from "react";

import {
  getFlooringSnapshotRevision,
  refreshFlooringSnapshotOnce,
  subscribeFlooringSnapshot,
} from "../public-flooring-snapshot";

/** Triggers one remote snapshot fetch on mount and re-renders when runtime cache updates. */
export function useFlooringSnapshotRefresh(): number {
  const revision = useSyncExternalStore(
    subscribeFlooringSnapshot,
    getFlooringSnapshotRevision,
    getFlooringSnapshotRevision,
  );

  useEffect(() => {
    void refreshFlooringSnapshotOnce();
  }, []);

  return revision;
}
