'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FeatureView } from '@/lib/types/features';
import { useToast } from '@/components/ui/use-toast';
import { Grid, List, Columns } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import BoardView from '@/components/views/BoardView';
import GridView from '@/components/views/GridView';
import ListView from '@/components/views/ListView';

const ViewButton = ({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-md transition-colors ${
      active
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-muted-foreground hover:bg-muted'
    }`}
  >
    {icon}
    <span>{children}</span>
  </button>
);

export default function FeatureViews({
  features,
  projectSlug,
  currentUser,
  isAuthorized,
  activeView: initialActiveView,
}: {
  features: FeatureView[];
  projectSlug: string;
  currentUser: string;
  isAuthorized: boolean;
  activeView: string;
}) {
  const [activeView, setActiveView] = useState(initialActiveView);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const memoizedFeatures = useMemo(() => features, [features]);

  useEffect(() => {
    const view = searchParams.get('v');
    if (view && ['grid', 'list', 'board'].includes(view)) {
      setActiveView(view);
      setViewPreference(view);
    }
    setIsLoading(false);
  }, [searchParams]);

  const updateView = (view: string) => {
    setActiveView(view);
    setViewPreference(view);
    router.push(`/p/${projectSlug}?v=${view}`, { scroll: false });
  };

  const setViewPreference = async (view: string) => {
    try {
      await fetch('/api/set-view-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ view }),
      });
    } catch (error) {
      console.error('Failed to set view preference:', error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2 mb-4">
        <ViewButton
          active={activeView === 'grid'}
          onClick={() => updateView('grid')}
          icon={<Grid size={16} />}
        >
          Grid
        </ViewButton>
        <ViewButton
          active={activeView === 'list'}
          onClick={() => updateView('list')}
          icon={<List size={16} />}
        >
          List
        </ViewButton>
        <ViewButton
          active={activeView === 'board'}
          onClick={() => updateView('board')}
          icon={<Columns size={16} />}
        >
          Board
        </ViewButton>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        {activeView === 'board' && (
          <BoardView
            features={memoizedFeatures}
            projectSlug={projectSlug}
            isAuthorized={isAuthorized}
          />
        )}

        {activeView === 'grid' && (
          <GridView
            features={memoizedFeatures}
            projectSlug={projectSlug}
            currentUser={currentUser}
            isAuthorized={isAuthorized}
          />
        )}

        {activeView === 'list' && (
          <ListView
            features={memoizedFeatures}
            projectSlug={projectSlug}
            isAuthorized={isAuthorized}
          />
        )}
      </ScrollArea>
    </div>
  );
}
