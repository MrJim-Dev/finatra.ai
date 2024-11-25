'use client';

import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import {
  toggleRightSidebar,
  getRightSidebarState,
} from '@/lib/actions/sidebar';

export function AIChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const initSidebarState = async () => {
      const state = await getRightSidebarState();
      setIsOpen(state);
    };
    initSidebarState();
  }, []);

  const handleToggle = async () => {
    await toggleRightSidebar();
    setIsOpen(!isOpen);
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      className="h-14 w-14 rounded-full shadow-lg"
      onClick={handleToggle}
      disabled
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
}
