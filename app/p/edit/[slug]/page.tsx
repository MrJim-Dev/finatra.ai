import BackButton from '@/components/back-button';
import AddProjectForm from '@/components/add-project-form';
import { buttonVariants } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { getProjectBySlug } from '@/lib/project';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';

export default async function EditProject({
  params,
}: {
  params: { slug: string };
}) {
  const project = await getProjectBySlug(params.slug);

  const { user } = await getUser();

  if (!user) {
    return redirect('/dashboard');
  }

  // ! Check if the user is the owner of the project
  if (project?.user_id !== user.id) {
    return redirect('/dashboard');
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <BackButton />
      <div className="mx-auto flex w-full flex-col justify-center gap-6 max-w-md">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit Project
          </h1>
          <p className="text-sm text-muted-foreground">
            Update your project details.
          </p>
        </div>
        <AddProjectForm project={project ?? undefined} />
      </div>
      <Toaster />
    </div>
  );
}
