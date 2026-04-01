'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbLink,
  BreadcrumbItem,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const KNOWN_SEGMENTS: Record<string, string> = {
  dashboard: 'Dashboard',
  accounts: 'Accounts',
  settings: 'Settings',
  categories: 'Categories',
  signin: 'Sign in',
  signup: 'Sign up',
};

function labelForSegment(segment: string, prev: string | undefined): string {
  if (UUID_RE.test(segment) && prev === 'accounts') {
    return 'Account activity';
  }
  if (KNOWN_SEGMENTS[segment]) {
    return KNOWN_SEGMENTS[segment];
  }
  return (
    segment.charAt(0).toUpperCase() + segment.replace(/-/g, ' ').slice(1)
  );
}

function generateBreadcrumbs(pathname: string) {
  const paths = pathname.split('/').filter(Boolean);

  return paths.map((path, index) => ({
    href: '/' + paths.slice(0, index + 1).join('/'),
    label: labelForSegment(path, paths[index - 1]),
  }));
}

export function BreadcrumbNav() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => (
          <React.Fragment key={breadcrumb.href}>
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={breadcrumb.href}>
                  {breadcrumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
