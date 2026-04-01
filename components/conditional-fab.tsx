'use client';

import { usePathname } from 'next/navigation';
import { FloatingActionButton } from '@/components/floating-action-button';

const ACCOUNT_DETAIL =
  /^\/dashboard\/[^/]+\/accounts\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ConditionalFAB() {
  const pathname = usePathname();
  if (ACCOUNT_DETAIL.test(pathname ?? '')) {
    return null;
  }
  return <FloatingActionButton />;
}
