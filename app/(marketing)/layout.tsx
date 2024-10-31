import { SiteBanner } from '@/components/site-banner';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getUser } from '@/lib/supabase/server';

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export default async function MarketingLayout({
  children,
}: MarketingLayoutProps) {
  const { user } = await getUser(); // Fetch user data here

  return (
    <>
      <SiteBanner />
      <SiteHeader user={user || null} />{' '}
      {/* Pass user data to SiteHeader, ensuring it is either User or null */}
      <main className="mx-auto flex-1 overflow-hidden">{children}</main>
      <SiteFooter />
    </>
  );
}
