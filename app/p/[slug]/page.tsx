import { Suspense } from 'react';
import ProjectHeader from '@/components/slug/project-header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getFeaturesByProjectId, getProjectBySlug } from '@/lib/project';
import { getUser } from '@/lib/supabase/server';
import { ProjectTypes } from '@/lib/types/project';
import { FeatureView } from '@/lib/types/features';
import { createClient } from '@/lib/supabase/server';
import FeatureViews from '@/components/feature-views';
import { cookies } from 'next/headers';

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { v?: string };
}) {
  const { user } = await getUser();
  const project = await getProjectBySlug(params.slug);

  const features = (await getFeaturesByProjectId(
    project?.project_id as string
  )) as FeatureView[];

  let isAuthorized = false;
  if (user && project?.user_id === user.id) {
    isAuthorized = true;
  }

  const supabase = createClient();
  const { data: bookmarkData } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('project_id', project?.project_id)
    .eq('user_id', user?.id)
    .single();

  const isBookmarked = !!bookmarkData;

  const cookieStore = cookies();
  let activeView =
    searchParams.v || cookieStore.get('activeView')?.value || 'grid';

  // Validate the view parameter
  if (!['grid', 'list', 'board'].includes(activeView)) {
    activeView = 'grid';
  }

  // We no longer set the cookie here

  return (
    <div className="space-y-6">
      <ProjectHeader
        project={project as ProjectTypes}
        isAuthorized={isAuthorized}
        isBookmarked={isBookmarked}
        user={user}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Requests</h2>
        <div className="space-x-4">
          <Link href={`/p/${project?.slug}/request`}>
            <Button variant="outline" size="sm">
              Request a feature
            </Button>
          </Link>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <FeatureViews
          features={features}
          projectSlug={project?.slug as string}
          currentUser={user?.id as string}
          isAuthorized={isAuthorized}
          activeView={activeView}
        />
      </Suspense>
    </div>
  );
}
