'use client';

import { MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useRightSidebar } from '@/lib/context/sidebar-context';

export function AIChatButton() {
  const { toggle } = useRightSidebar();

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-11 w-11 md:h-14 md:w-14 rounded-full shadow-lg bg-background/90 backdrop-blur-sm"
      onClick={toggle}
    >
      <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
    </Button>
  );
}
