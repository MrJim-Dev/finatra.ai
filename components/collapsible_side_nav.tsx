'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Menu,
  Home,
  Settings,
  HelpCircle,
  LogOut,
  ChevronUp,
  CircleUserRound,
  LogIn,
} from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth-client';
import { UserData } from '@/lib/types/user';
import { useRouter } from 'next/navigation';

// Add this custom left arrow icon
const LeftArrowIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 4L7 12L15 20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function CollapsibleSideNavbar({
  userData,
}: {
  userData: UserData;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleNavbar = () => setIsOpen(!isOpen);

  const router = useRouter();

  return (
    <>
      {!isOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50"
          onClick={toggleNavbar}
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 transform bg-background transition-transform duration-300 ease-in-out border-r ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {isOpen && (
          <Button
            variant="outline"
            size="icon"
            className="absolute -right-5 top-4 z-50 bg-background border rounded-full"
            onClick={toggleNavbar}
          >
            <LeftArrowIcon />
            <span className="sr-only">Close navigation menu</span>
          </Button>
        )}
        <div className="flex flex-col h-full">
          <ScrollArea className="flex-grow px-3 py-4">
            <Link href="/" className="flex items-center p-4">
              <img src="/logo.png" alt="Featurize" className="h-5 w-5 mr-2" />
              <div className="text-2xl font-bold">Featurize</div>
            </Link>
            <nav className="space-y-6 pt-4">
              <div className="space-y-1">
                <Link href="/dashboard">
                  <Button variant="ghost" className="w-full justify-start">
                    <Home className="mr-2 h-4 w-4" />
                    Home
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help
                </Button>
                {/* Add more menu items here */}
              </div>
            </nav>
          </ScrollArea>
          <div className="px-3 py-4 mt-auto">
            {userData ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="px-4 py-2 rounded-lg bg-secondary cursor-pointer">
                    <p className="text-sm font-medium flex items-center justify-between">
                      {userData.first_name} {userData.last_name}
                      <ChevronUp className="h-4 w-4" />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userData.email}
                    </p>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => router.push('/account/settings')}
                  >
                    <div className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Account Settings</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={async () => {
                      await signOut();
                      router.push('/'); // Redirect after sign out
                    }}
                  >
                    <div className="flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push('/signin')}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
