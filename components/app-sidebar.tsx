'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  GalleryVerticalEnd,
  LayoutDashboard,
  type LucideIcon,
  Settings2,
  Tag,
  Wallet,
} from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
import { NavUser } from '@/components/nav-user';
import { PortfolioSwitcher } from '@/components/portfolio-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { UserData } from '@/lib/types/user';
import { Portfolio } from '@/lib/types/portfolio';

function dashboardBasePath(slug: string | undefined, fallbackSlug?: string) {
  const s = slug || fallbackSlug || '';
  return s ? `/dashboard/${s}` : '/dashboard';
}

const staticSidebarMeta = {
  teams: [
    {
      name: 'Finatra',
      logo: GalleryVerticalEnd,
      plan: 'Portfolio',
    },
  ],
};

function buildNavMain(base: string) {
  return [
    {
      title: 'Activity',
      url: base,
      icon: LayoutDashboard,
    },
    {
      title: 'Accounts',
      url: `${base}/accounts`,
      icon: Wallet,
    },
    {
      title: 'Categories',
      url: `${base}/categories`,
      icon: Tag,
    },
    {
      title: 'Settings',
      url: `${base}/settings`,
      icon: Settings2,
    },
  ];
}

const data = {
  ...staticSidebarMeta,
  projects: [] as { name: string; url: string; icon: LucideIcon }[],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: UserData;
  portfolio: Portfolio[];
}

export function AppSidebar({ user, portfolio, ...props }: AppSidebarProps) {
  const params = useParams();
  const paramSlug = params?.slug;
  const slugFromParams =
    typeof paramSlug === 'string'
      ? paramSlug
      : Array.isArray(paramSlug)
        ? paramSlug[0]
        : undefined;
  const fallbackSlug = portfolio[0]?.slug;
  const base = dashboardBasePath(slugFromParams, fallbackSlug);
  const navMain = React.useMemo(() => buildNavMain(base), [base]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <PortfolioSwitcher portfolios={portfolio} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
