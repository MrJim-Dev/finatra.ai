import { getUser, getUserById } from '@/lib/supabase/server';
import FeatureHeader from '@/components/slug/feature-header';
import FeatureContent from '@/components/slug/feature-content';
import CommentSection from '@/components/slug/CommentSection';
import {
  getFeatureByProjectSlug,
  getFeatureComments,
  getProjectBySlug,
} from '@/lib/project';

export const metadata = {
  title: 'Feature Details | Featurize',
  description: 'Explore feature details and user feedback on Featurize.',
};

export default async function FeatureTitle({
  params,
}: {
  params: { slug: string; feature_slug: string };
}) {
  const project = await getProjectBySlug(params.slug);
  if (!project) {
    return <div>Project not found</div>;
  }
  const feature = await getFeatureByProjectSlug(
    project.project_id,
    params.feature_slug
  );

  const author = await getUserById(feature.user_id);

  const feature_comments = await getFeatureComments(feature.id);

  if (!feature) {
    return <div>Feature not found</div>;
  }

  // ! Check if the user is the owner of the project or the author of the feature, if so, set isAuthorized to true
  const { user } = await getUser();
  let isAuthorized = false;
  if (user && (project.user_id === user.id || feature.user_id === user.id)) {
    isAuthorized = true;
  }

  console.log(project);

  return (
    <div className="space-y-6">
      <FeatureHeader
        project={project}
        feature={feature}
        isAuthorized={isAuthorized}
      />
      <FeatureContent feature={feature} author={author} />
      <CommentSection
        project={project}
        feature={feature}
        feature_comments={feature_comments || []}
        projectCreatorId={project.user_id}
        featureAuthorId={feature.user_id}
      />
    </div>
  );
}
