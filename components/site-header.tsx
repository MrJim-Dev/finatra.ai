'use client';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { AlignJustify, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NavMenu } from './nav-menu';
import { getUser } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

const menuItem = [
  {
    id: 1,
    label: 'Features',
    href: '/features',
  },
  {
    id: 2,
    label: 'Pricing',
    href: '#',
  },
  {
    id: 3,
    label: 'Careers',
    href: '#',
  },
  {
    id: 4,
    label: 'Contact Us',
    href: '#',
  },
];

export function SiteHeader({ user }: { user: User | null }) {
  const [hamburgerMenuIsOpen, setHamburgerMenuIsOpen] = useState(false);

  useEffect(() => {
    const html = document.querySelector('html');
    if (html) html.classList.toggle('overflow-hidden', hamburgerMenuIsOpen);
  }, [hamburgerMenuIsOpen]);

  useEffect(() => {
    const closeHamburgerNavigation = () => setHamburgerMenuIsOpen(false);
    window.addEventListener('orientationchange', closeHamburgerNavigation);
    window.addEventListener('resize', closeHamburgerNavigation);

    return () => {
      window.removeEventListener('orientationchange', closeHamburgerNavigation);
      window.removeEventListener('resize', closeHamburgerNavigation);
    };
  }, [setHamburgerMenuIsOpen]);

  const mobilenavbarVariant = {
    initial: {
      opacity: 0,
      scale: 1,
    },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.2,
        delay: 0.2,
        ease: 'easeOut',
      },
    },
  };

  const mobileLinkVar = {
    initial: {
      y: '-20px',
      opacity: 0,
    },
    open: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  const containerVariants = {
    open: {
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  return (
    <>
      <header className="!m-2 z-50 max-w-7xl animate-fade-in border opacity-0 backdrop-blur-[12px] [--animation-delay:600ms] rounded-2xl sticky top-5 !mx-auto ">
        <div className="container flex h-[3rem] items-center justify-between w-full">
          <Link className="text-md flex items-center" href="/">
            <img src="/logo.png" alt="Featurize" className="h-5 w-5 mr-2" />
            Featurize
          </Link>
          <NavMenu className="hidden md:flex " />

          {user ? (
            <div className="flex h-full items-center">
              <Link
                className={cn(
                  buttonVariants({ variant: 'secondary' }),
                  'mr-6 text-sm'
                )}
                href="/dashboard"
              >
                Dashboard
              </Link>
              <button
                className="md:hidden"
                onClick={() => setHamburgerMenuIsOpen((open) => !open)}
              >
                <span className="sr-only">Toggle menu</span>
                {hamburgerMenuIsOpen ? <XIcon /> : <AlignJustify />}
              </button>
            </div>
          ) : (
            <div className="flex h-full items-center">
              <Link className="mr-6 text-sm" href="/signin">
                Log in
              </Link>
              <Link
                className={cn(
                  buttonVariants({ variant: 'secondary' }),
                  'mr-6 text-sm'
                )}
                href="/signup"
              >
                Sign up
              </Link>
              <button
                className="md:hidden"
                onClick={() => setHamburgerMenuIsOpen((open) => !open)}
              >
                <span className="sr-only">Toggle menu</span>
                {hamburgerMenuIsOpen ? <XIcon /> : <AlignJustify />}
              </button>
            </div>
          )}
        </div>
      </header>
      <AnimatePresence>
        <motion.nav
          initial="initial"
          exit="exit"
          variants={mobilenavbarVariant}
          animate={hamburgerMenuIsOpen ? 'animate' : 'exit'}
          className={cn(
            `fixed left-0 top-0 z-50 h-screen w-full overflow-auto bg-background/70 backdrop-blur-[12px] `,
            {
              'pointer-events-none': !hamburgerMenuIsOpen,
            }
          )}
        >
          <div className="container flex h-[3.5rem] items-center justify-between">
            <Link className="text-md flex items-center" href="/">
              <img src="/logo.png" alt="Featurize" className="h-5 w-5 mr-2" />
              Featurize
            </Link>

            <button
              className="ml-6 md:hidden"
              onClick={() => setHamburgerMenuIsOpen((open) => !open)}
            >
              <span className="sr-only">Toggle menu</span>
              {hamburgerMenuIsOpen ? <XIcon /> : <AlignJustify />}
            </button>
          </div>

          <motion.ul
            className={`flex flex-col md:flex-row md:items-center uppercase md:normal-case ease-in`}
            variants={containerVariants}
            initial="initial"
            animate={hamburgerMenuIsOpen ? 'open' : 'exit'}
          >
            {menuItem.map((item) => (
              <motion.li
                variants={mobileLinkVar}
                key={item.id}
                className="border-grey-dark pl-6 py-0.5 border-b md:border-none"
              >
                <Link
                  className={`hover:text-grey flex h-[var(--navigation-height)] w-full items-center text-xl transition-[color,transform] duration-300 md:translate-y-0 md:text-sm md:transition-colors ${
                    hamburgerMenuIsOpen ? '[&_a]:translate-y-0' : ''
                  }`}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        </motion.nav>
      </AnimatePresence>
    </>
  );
}
