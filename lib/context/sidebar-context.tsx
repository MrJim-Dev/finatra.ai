'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getRightSidebarState,
  toggleRightSidebar,
} from '@/lib/actions/sidebar';

interface RightSidebarContextType {
  isOpen: boolean;
  toggle: () => Promise<void>;
}

const RightSidebarContext = createContext<RightSidebarContextType | undefined>(
  undefined
);

export function RightSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const initSidebarState = async () => {
      const state = await getRightSidebarState();
      setIsOpen(state);
    };
    initSidebarState();
  }, []);

  const toggle = async () => {
    await toggleRightSidebar();
    setIsOpen(!isOpen);
  };

  return (
    <RightSidebarContext.Provider value={{ isOpen, toggle }}>
      {children}
    </RightSidebarContext.Provider>
  );
}

export function useRightSidebar() {
  const context = useContext(RightSidebarContext);
  if (context === undefined) {
    throw new Error(
      'useRightSidebar must be used within a RightSidebarProvider'
    );
  }
  return context;
}
