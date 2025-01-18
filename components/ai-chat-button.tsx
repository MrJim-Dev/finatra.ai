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
      className="h-14 w-14 rounded-full shadow-lg"
      onClick={toggle}
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
}
