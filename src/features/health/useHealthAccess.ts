import { useEffect, useState } from 'react';

import { healthAccess } from '@/features/health/healthConnect';
import { useHealthStatus } from '@/features/health/healthStatus';
import { readLine, type HealthAccess } from '@/lib/healthLink';

/** Whether Health Connect can be asked anything here. Null until the first answer. */
export function useHealthAccess(): HealthAccess | null {
  const [access, setAccess] = useState<HealthAccess | null>(null);

  useEffect(() => {
    let live = true;
    void healthAccess().then((next) => {
      if (live) setAccess(next);
    });
    return () => {
      live = false;
    };
  }, []);

  return access;
}

/**
 * "read 4m ago", kept current by a minute hand. A read that lands after the
 * last tick is "just now" by itself, since the age is never allowed below zero.
 */
export function useReadAgo(): string | null {
  const lastRead = useHealthStatus((state) => state.lastRead);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  return readLine(lastRead, Math.max(now, lastRead ?? 0));
}
