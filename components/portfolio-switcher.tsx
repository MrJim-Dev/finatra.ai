'use client';

import * as React from 'react';
import { ChevronsUpDown, Plus } from 'lucide-react';
import * as Ri from 'react-icons/ri';
import tinycolor from 'tinycolor2';
import { cn } from '@/lib/utils';
import { useRouter, useParams } from 'next/navigation';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { AddPortfolioDialog } from '@/components/add-portfolio-dialog';
import { Portfolio } from '@/lib/types/portfolio';
import {
  setActivePortfolioCookieClient,
  getActivePortfolioClient,
} from '@/lib/portfolio';
import { useAuthenticatedPortfolios } from '@/lib/hooks/useAuthenticatedPortfolios';

const IconComponent = ({
  icon,
  color,
  className,
}: {
  icon: Portfolio['icon'];
  color: string;
  className?: string;
}) => {
  const backgroundColor = tinycolor(color).setAlpha(0.15).toString();

  if (icon.type === 'emoji') {
    return (
      <span
        className={cn('text-base leading-none', className)}
        style={{ color }}
      >
        {icon.value}
      </span>
    );
  }
  // @ts-ignore - Dynamically access Ri icons
  const RiIcon = Ri[icon.value];
  return RiIcon ? (
    <RiIcon className={cn('size-4', className)} style={{ color }} />
  ) : (
    <span style={{ color }}>{icon.value}</span>
  );
};

export function PortfolioSwitcher({ portfolios }: { portfolios: Portfolio[] }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const params = useParams();

  // Use authenticated portfolios hook for client-side portfolio management
  const {
    portfolios: clientPortfolios,
    activePortfolio: hookActivePortfolio,
    loading: hookLoading,
    error: hookError,
    selectPortfolio,
  } = useAuthenticatedPortfolios();

  // Prefer server-side portfolios, fallback to client-side
  const effectivePortfolios =
    portfolios.length > 0 ? portfolios : clientPortfolios;
  const hasPortfolios =
    Array.isArray(effectivePortfolios) && effectivePortfolios.length > 0;

  const [cookiePortfolio, setCookiePortfolio] = React.useState<any | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(false);

  // Initialize cookie portfolio on client side
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cp = getActivePortfolioClient();
        setCookiePortfolio(cp);
        if (cp) console.log('[PortfolioSwitcher] cookie snapshot ->', cp.slug);
      } catch (error) {
        console.warn(
          '[PortfolioSwitcher] Error reading cookie portfolio:',
          error
        );
      }
    }
  }, []);

  // Update cookie portfolio when params change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cp = getActivePortfolioClient();
        setCookiePortfolio(cp);
        if (cp)
          console.log(
            '[PortfolioSwitcher] updated cookie snapshot ->',
            cp.slug
          );
      } catch (error) {
        console.warn(
          '[PortfolioSwitcher] Error updating cookie portfolio:',
          error
        );
      }
    }
  }, [params.slug]);

  const list: Portfolio[] = hasPortfolios
    ? effectivePortfolios
    : cookiePortfolio
      ? [cookiePortfolio as Portfolio]
      : [];
  const hasList = list.length > 0;

  // Redirect to first portfolio if no slug is present
  React.useEffect(() => {
    if (!params.slug && hasList && !isLoading) {
      console.log(
        '[PortfolioSwitcher] no slug, redirecting to first and setting cookie'
      );
      setActivePortfolioCookieClient(list[0]);
      setIsLoading(true);
      router.push(`/dashboard/${list[0].slug}`);
    }
  }, [params.slug, hasList, list, router, isLoading]);

  // Derive active portfolio from params or default to first; undefined if none
  const activePortfolio = hasList
    ? list.find((p) => p.slug === params.slug) || list[0]
    : undefined;

  const [showAddPortfolio, setShowAddPortfolio] = React.useState(false);

  // Keep cookie in sync with active portfolio selection
  React.useEffect(() => {
    if (activePortfolio && typeof window !== 'undefined') {
      console.log(
        '[PortfolioSwitcher] syncing cookie ->',
        activePortfolio.slug
      );
      setActivePortfolioCookieClient(activePortfolio);
      // Also update the hook's active portfolio
      selectPortfolio(activePortfolio);
    }
  }, [activePortfolio, selectPortfolio]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div
                className="flex aspect-square size-8 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: tinycolor(
                    activePortfolio?.color || '#3B82F6'
                  )
                    .setAlpha(0.15)
                    .toString(),
                  borderColor: tinycolor(activePortfolio?.color || '#3B82F6')
                    .setAlpha(0.3)
                    .toString(),
                }}
              >
                {activePortfolio ? (
                  <IconComponent
                    icon={activePortfolio.icon}
                    color={activePortfolio.color}
                    className="size-5"
                  />
                ) : (
                  <Plus className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activePortfolio ? activePortfolio.title : 'Add a portfolio'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Portfolios
            </DropdownMenuLabel>
            {hasList &&
              list.map((portfolio, index) => (
                <DropdownMenuItem
                  key={portfolio.port_id}
                  onClick={() => {
                    console.log(
                      '[PortfolioSwitcher] selecting portfolio ->',
                      portfolio.slug
                    );
                    setActivePortfolioCookieClient(portfolio);
                    router.push(`/dashboard/${portfolio.slug}`);
                  }}
                  className="gap-2 p-2"
                >
                  <div
                    className="flex size-6 items-center justify-center rounded-sm border"
                    style={{
                      backgroundColor: tinycolor(portfolio.color)
                        .setAlpha(0.15)
                        .toString(),
                      borderColor: tinycolor(portfolio.color)
                        .setAlpha(0.3)
                        .toString(),
                    }}
                  >
                    <IconComponent
                      icon={portfolio.icon}
                      color={portfolio.color}
                      className="size-4"
                    />
                  </div>
                  {portfolio.title}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onSelect={(e) => {
                e.preventDefault();
                setShowAddPortfolio(true);
              }}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                Add Portfolio
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <AddPortfolioDialog
        open={showAddPortfolio}
        onOpenChange={setShowAddPortfolio}
      />
    </SidebarMenu>
  );
}
