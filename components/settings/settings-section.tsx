'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border bg-card/50 p-5 shadow-sm backdrop-blur-sm',
        className
      )}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
