'use client';

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbLink,
  BreadcrumbItem,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';

function generateBreadcrumbs(pathname: string) {
  const paths = pathname.split('/').filter(Boolean);

  return paths.map((path, index) => ({
    href: '/' + paths.slice(0, index + 1).join('/'),
    label: path.charAt(0).toUpperCase() + path.replace(/-/g, ' ').slice(1),
  }));
}

export function BreadcrumbNav() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => (
          <>
            <BreadcrumbItem key={breadcrumb.href}>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={breadcrumb.href}>
                  {breadcrumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
