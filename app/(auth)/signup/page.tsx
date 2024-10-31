import BackLink from '@/components/back-button';
import { SignUpForm } from '@/components/signup-form';
import { buttonVariants } from '@/components/ui/button';
import { getUser } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Sign Up | Featurize',
  description:
    'Create an account to start using Featurize and gather user feedback.',
};

export default async function SignUpPage() {
  const { user } = await getUser();

  if (user) {
    return redirect('/dashboard');
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <BackLink />

      <div className="mx-auto flex w-full flex-col justify-center gap-6 sm:w-[450px]">
        <div className="flex flex-col gap-2 text-center">
          <h3>Welcome to Featurize</h3>
          <p className="text-sm text-muted-foreground">
            Sign up for an account on Featurize
          </p>
        </div>
        <SignUpForm />
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href="/signin"
            className="hover:text-brand underline underline-offset-4"
          >
            Already have an account? Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
