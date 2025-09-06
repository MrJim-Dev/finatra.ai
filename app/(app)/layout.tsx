import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { getCurrentUserServer } from '@/lib/session';
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
import { getPortfoliosServer } from '@/lib/api/finance';
import { Portfolio } from '@/lib/types/portfolio';
import { getActivePortfolioServer } from '@/lib/portfolio';
import { RightSidebarToggle } from '@/components/right-sidebar-toggle';
import { getRightSidebarState } from '@/lib/actions/sidebar';
import { AIChatButton } from '@/components/ai-chat-button';
import { AIChatInterface } from '@/components/ai-chat-interface';
import { RightSidebarProvider } from '@/lib/context/sidebar-context';
import { AuthTest } from '@/components/auth-test';

interface LayoutProps {
  children: ReactNode;
}

const Layout = async ({ children }: LayoutProps) => {
  const currentUser = await getCurrentUserServer();

  const isRightSidebarOpen = await getRightSidebarState();

  console.log(
    '[Layout] Current user:',
    currentUser ? `${currentUser.name} (${currentUser.email})` : 'NOT LOGGED IN'
  );

  if (!currentUser) {
    console.log(
      '[Layout] No current user - should redirect to signin but commented out'
    );
    // redirect('/signin');
  }

  // When auth is invalid on first request, middleware will refresh and redirect.
  // Still, guard here to avoid crashing the layout on a transient 401.
  let portfolios: any[] = [];
  try {
    const result = await getPortfoliosServer({
      method: 'GET',
      skipAuth: false, // Use proper authentication
    });
    portfolios = result?.data || [];
    console.log('[Layout] Successfully fetched portfolios:', portfolios.length);
  } catch (error) {
    console.error('[Layout] Failed to fetch portfolios:', error);
    // Try with skipAuth as fallback for development
    try {
      const fallbackResult = await getPortfoliosServer({
        method: 'GET',
        skipAuth: true,
      });
      portfolios = fallbackResult?.data || [];
      console.log('[Layout] Fallback fetch successful:', portfolios.length);
    } catch (fallbackError) {
      console.error('[Layout] Fallback fetch also failed:', fallbackError);
      portfolios = [];
    }
  }

  console.log('portfolios', portfolios);

  // Fallback to active portfolio from cookie when list is empty (e.g., transient 401)
  const cookieActive = await getActivePortfolioServer();
  const effectivePortfolios =
    Array.isArray(portfolios) && portfolios.length > 0
      ? portfolios
      : cookieActive
        ? [cookieActive]
        : [];
  console.log(
    '[layout] portfolios fetched:',
    portfolios?.length ?? 0,
    'cookieActive:',
    !!cookieActive,
    'effective:',
    effectivePortfolios.length
  );
  const mappedUser = currentUser
    ? {
        id: (currentUser as any).id,
        first_name: ((currentUser as any).name || '').split(' ')[0] || '',
        last_name:
          ((currentUser as any).name || '').split(' ').slice(1).join(' ') || '',
        avatar: null,
        billing_address: {},
        payment_method: {},
        email: (currentUser as any).email || '',
        role: 'user',
        avatar_url: null,
      }
    : undefined;

  return (
    <SidebarProvider>
      <RightSidebarProvider>
        <AppSidebar
          user={mappedUser as any}
          portfolio={effectivePortfolios as Portfolio[]}
        />
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
        <AuthTest />
      </RightSidebarProvider>
    </SidebarProvider>
  );
};

export default Layout;
