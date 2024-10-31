import FeatureCard from '@/components/slug/feature-card';
import { FeatureView } from '@/lib/types/features';

export default function GridView({
  features,
  projectSlug,
  currentUser,
  isAuthorized,
}: {
  features: FeatureView[];
  projectSlug: string;
  currentUser: string;
  isAuthorized: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {features.map((feature) => (
        <FeatureCard
          key={feature.id}
          projectName={projectSlug}
          feature={feature}
          currentUser={currentUser}
          projectSlug={projectSlug}
          isAuthorized={isAuthorized}
        />
      ))}
    </div>
  );
}
