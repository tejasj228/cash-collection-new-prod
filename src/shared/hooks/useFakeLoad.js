import { useEffect, useState } from "react";

/**
 * Prototype-only: hold a screen in a loading state for a beat on mount so the
 * page-level loaders are visible during a design review. Data on these screens
 * is already in memory, so there is nothing real to wait for.
 */
export function useFakeLoad(ms = 1000) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);
  return loading;
}
