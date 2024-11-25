import { cn } from '@/lib/utils';

interface RightSidebarProps {
  isOpen: boolean;
}

export function RightSidebar({ isOpen }: RightSidebarProps) {
  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-full w-64 bg-background border-l transition-transform duration-200 ease-in-out',
        !isOpen && 'translate-x-full'
      )}
    >
      {/* Add your right sidebar content here */}
    </div>
  );
}
