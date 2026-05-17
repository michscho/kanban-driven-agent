'use client';

import { useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';

export function useFeature(flag: string): boolean {
  const params = useSearchParams();
  const raw = params.get('feature');
  if (!raw) return false;
  return raw.split(',').map((s) => s.trim()).includes(flag);
}

export function Feature({ flag, children }: { flag: string; children: ReactNode }) {
  return useFeature(flag) ? <>{children}</> : null;
}
