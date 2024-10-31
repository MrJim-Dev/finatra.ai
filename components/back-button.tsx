'use client'; // Mark this component as a client component

import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';

export default function BackLink() {
  return (
    <Link
      onClick={(e) => {
        e.preventDefault(); // Prevent default link behavior
        window.history.back(); // Navigate back to the previous page
      }}
      className={cn(
        buttonVariants({ variant: 'ghost' }),
        'absolute left-4 top-4 md:left-8 md:top-8'
      )}
      href="#" // Provide a dummy href
    >
      <ChevronLeft className="mr-2 h-4 w-4" />
      Back
    </Link>
  );
}
