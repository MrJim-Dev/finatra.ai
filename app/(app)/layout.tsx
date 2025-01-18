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
import { RightSidebarToggle } from '@/components/right-sidebar-toggle';
import { getRightSidebarState } from '@/lib/actions/sidebar';
import { AIChatButton } from '@/components/ai-chat-button';
import { AIChatInterface } from '@/components/ai-chat-interface';
import { RightSidebarProvider } from '@/lib/context/sidebar-context';

interface LayoutProps {
  children: ReactNode;
}

const Layout = async ({ children }: LayoutProps) => {
  const currentUser = await getUserData();
  const supabase = await createClient();
  const isRightSidebarOpen = await getRightSidebarState();

  if (!currentUser) {
    redirect('/login');
  }

  const { data: portfolio, error } = await supabase
    .from('portfolio')
    .select('*')
    .eq('user_id', currentUser.id);

  return (
    <SidebarProvider>
      <RightSidebarProvider>
        <AppSidebar user={currentUser} portfolio={portfolio as Portfolio[]} />
        <SidebarInset>
          <div className="flex h-full">
            <div className="flex-1 flex flex-col">
              <header className="flex h-16 shrink-0 items-center gap-2 justify-between">
                <div className="flex items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <BreadcrumbNav />
                </div>
              </header>

              <div className="flex-1 relative overflow-y-auto">
                <div className="min-h-full">{children}</div>

                {!isRightSidebarOpen && (
                  <div className="fixed bottom-6 right-6 flex gap-2 z-50">
                    <AIChatButton />
                    <FloatingActionButton />
                  </div>
                )}
              </div>
            </div>

            <AIChatInterface />
          </div>
        </SidebarInset>
      </RightSidebarProvider>
    </SidebarProvider>
  );
};

export default Layout;
