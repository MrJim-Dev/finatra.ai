'use client';

import { toggleRightSidebar } from '@/lib/actions/sidebar';

export function RightSidebarToggle() {
  return (
    <button
      className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
      onClick={() => toggleRightSidebar()}
    >
      Toggle Sidebar
    </button>
  );
}
