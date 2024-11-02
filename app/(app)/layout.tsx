import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { getUser, getUserById, getUserData } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import { BreadcrumbNav } from '@/components/breadcrumb-nav';
import { FloatingActionButton } from '@/components/floating-action-button';
import { createClient } from '@/lib/supabase/server';
import { Portfolio } from '@/lib/types/portfolio';

interface LayoutProps {
  children: ReactNode;
}

const Layout = async ({ children }: LayoutProps) => {
  const currentUser = await getUserData();
  const supabase = await createClient();

  if (!currentUser) {
    redirect('/login');
  }

  const { data: portfolio, error } = await supabase
    .from('portfolio')
    .select('*')
    .eq('user_id', currentUser.id);

  return (
    <SidebarProvider>
      <AppSidebar user={currentUser} portfolio={portfolio as Portfolio[]} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <BreadcrumbNav />
          </div>
        </header>
        {children}
        <FloatingActionButton />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
