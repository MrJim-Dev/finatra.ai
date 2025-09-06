'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/http';

export type CurrentUser = any;

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch<{ message: string; data: any }>(
          '/auth/me',
          { method: 'GET', skipAuth: true }
        );
        if (!mounted) return;
        setUser(res?.data);
      } catch {
        if (!mounted) return;
        setUser(undefined);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading } as const;
}

