import FeatureRequestForm from '@/components/slug/add-feature-request-form';
import ProjectHeader from '@/components/slug/project-header';
import {
  getProjectBySlug,
  getFeaturesByProjectId,
  getFeatureByProjectSlug,
} from '@/lib/project';
import { getUser } from '@/lib/supabase/server';
import { ProjectTypes } from '@/lib/types/project';
import { redirect } from 'next/navigation';
import React from 'react';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Request Feature | Featurize',
  description: 'Submit a feature request to enhance your project on Featurize.',
};

export default async function page({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { id?: string };
}) {
  const { user } = await getUser();

  if (!user) {
    return redirect('/signin');
  }

  const project = await getProjectBySlug(params.slug);
  const features = await getFeaturesByProjectId(project?.project_id as string);

  let initialData;
  if (searchParams.id && project?.project_id) {
    const featureRequest = await getFeatureByProjectSlug(
      project.project_id,
      searchParams.id
    );

    if (featureRequest) {
      initialData = {
        title: featureRequest.title,
        category: featureRequest.category,
        description: featureRequest.description,
        tags: featureRequest.tags,
      };
    }
  }

  // Check if the user is the owner of the project
  let isAuthorized = false;
  if (user && project?.user_id === user.id) {
    isAuthorized = true;
  }

  // Check if the project is bookmarked
  const supabase = createClient();
  const { data: bookmarkData, error: bookmarkError } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('project_id', project?.project_id)
    .eq('user_id', user.id)
    .single();

  const isBookmarked = !!bookmarkData;

  return (
    <div>
      <ProjectHeader
        project={project as ProjectTypes}
        isAuthorized={isAuthorized}
        isBookmarked={isBookmarked}
        user={user}
      />
      <FeatureRequestForm
        project={project as ProjectTypes}
        initialData={initialData}
      />
    </div>
  );
}
