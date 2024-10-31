import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import CollapsibleSideNavbar from '@/components/collapsible_side_nav';
import { SiteHeader } from '@/components/site-header';
import { getUser, getUserById, getUserData } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface LayoutProps {
  children: ReactNode;
}

const Layout = async ({ children }: LayoutProps) => {
  const currentUser = await getUserData();

  return (
    <>
      {/* <SiteHeader /> */}
      <div className="md:hidden">
        {/* You can add your mobile-specific layout or images here */}
      </div>
      <div className="hidden flex-col md:flex">
        <CollapsibleSideNavbar userData={currentUser} />
        {/* <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <TeamSwitcher />
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
              <UserNav />
            </div>
          </div>
        </div> */}
        <div className="flex-1 space-y-4 p-8 pt-6">{children}</div>
        <Toaster />
      </div>
    </>
  );
};

export default Layout;
