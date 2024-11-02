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

  // Redirect to first portfolio if no slug is present
  React.useEffect(() => {
    if (!params.slug && portfolios.length > 0) {
      router.push(`/dashboard/${portfolios[0].slug}`);
    }
  }, [params.slug, portfolios, router]);

  // Find portfolio matching slug from params or default to first portfolio
  const initialPortfolio =
    portfolios.find((p) => p.slug === params.slug) || portfolios[0];
  const [activePortfolio, setActivePortfolio] =
    React.useState(initialPortfolio);
  const [showAddPortfolio, setShowAddPortfolio] = React.useState(false);

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
                  backgroundColor: tinycolor(activePortfolio.color)
                    .setAlpha(0.15)
                    .toString(),
                  borderColor: tinycolor(activePortfolio.color)
                    .setAlpha(0.3)
                    .toString(),
                }}
              >
                <IconComponent
                  icon={activePortfolio.icon}
                  color={activePortfolio.color}
                  className="size-5"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activePortfolio.title}
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
            {portfolios.map((portfolio, index) => (
              <DropdownMenuItem
                key={portfolio.port_id}
                onClick={() => {
                  setActivePortfolio(portfolio);
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
