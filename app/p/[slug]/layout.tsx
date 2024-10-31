import CollapsibleSideNavbar from '@/components/collapsible_side_nav';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import ProjectHeader from '@/components/slug/project-header';
import { getFeaturesByProjectId, getProjectBySlug } from '@/lib/project';
import { getUser, getUserById } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface MarketingLayoutProps {
  params: {
    slug: string;
  };
  children: React.ReactNode;
}

export default async function MarketingLayout({
  params,
  children,
}: MarketingLayoutProps) {
  const currentUser = await getUser();
  const project = await getProjectBySlug(params.slug);
  if (!project) {
    redirect('/p');
  }

  const features = project
    ? await getFeaturesByProjectId(project.project_id)
    : [];
  const userData = currentUser?.user
    ? await getUserById(currentUser.user.id)
    : null;

  return (
    <>
      {/* <SiteBanner /> */}
      {/* <ComingSoon /> */}

      <CollapsibleSideNavbar userData={userData} />
      <section className="container mx-auto max-w-7xl py-12 sm:py-12">
        {/* <ProjectHeader project={project ?? undefined} /> */}
        {children}
      </section>

      {/* <SiteHeader /> */}
      {/* <main className="mx-auto flex-1 overflow-hidden">{children}</main> */}
      {/* <SiteFooter /> */}
    </>
  );
}
