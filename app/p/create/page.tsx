import BackButton from '@/components/back-button';
import AddProjectForm from '@/components/add-project-form';
import { buttonVariants } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Create Project | Featurize',
  description:
    'Create a project and start gathering user feedback with Featurize.',
};

export default async function CreateProject() {
  const { user } = await getUser();

  if (!user) {
    return redirect('/dashboard');
  }
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <BackButton />
      <div className="mx-auto flex w-full flex-col justify-center gap-6 max-w-md">
        <div className="flex flex-col gap-2 text-center">
          {/* <Icons.logo className="mx-auto h-6 w-6" /> */}
          <h1 className="text-2xl font-semibold tracking-tight">
            Create Project
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a project and start getting feedback from your users.
          </p>
        </div>
        <AddProjectForm />
        {/* <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href="/register"
            className="hover:text-brand underline underline-offset-4"
          >
            Don&apos;t have an account? Sign Up
          </Link>
        </p> */}
      </div>
      <Toaster />
    </div>
  );
}
