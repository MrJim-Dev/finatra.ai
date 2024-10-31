import { getUser } from '@/lib/supabase/server';
import { capitalizeWords, dateAndTimeFormat } from '@/lib/utils';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ProjectIcon from '@/components/slug/project-icon';
import { PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { getProjectsByUserId, getBookmarkedProjects } from '@/lib/project';
import { redirect } from 'next/navigation';
import { ProjectTypes } from '@/lib/types/project';

export const metadata = {
  title: 'Your Projects | Featurize',
  description: 'Manage your projects and gather user feedback on Featurize.',
};

export default async function ProjectPage() {
  const { user } = await getUser();

  if (!user) {
    redirect('/signin');
  }

  const projects = await getProjectsByUserId(user?.id as string);
  const bookmarkedProjects = await getBookmarkedProjects(user?.id as string);

  const ProjectGrid = ({
    projects,
    title,
  }: {
    projects: ProjectTypes[];
    title: string;
  }) => (
    <>
      <h2 className="text-3xl text-center sm:text-left font-bold tracking-tight sm:text-3xl mb-6">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link key={project.id} href={`/p/${project.slug}`}>
            <Card className="h-full hover:scale-[1.02] transition-all ease-in duration-200">
              <CardHeader className="flex flex-row justify-between items-start">
                {project.icon_url ? (
                  <ProjectIcon
                    name={project?.name as string}
                    icon_url={project.icon_url as string}
                  />
                ) : (
                  <ProjectIcon name={project?.name as string} />
                )}
                <div className="flex gap-2">
                  <Badge variant="secondary">{project.status}</Badge>
                  <Badge variant="secondary">{project.privacy}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-semibold text-gray-100">
                  {capitalizeWords(project.name)}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-gray-300">
                  {project.description}
                </p>
              </CardContent>
              <CardFooter className="flex items-center text-xs">
                <p className="text-muted-foreground">
                  Space reserved for project data count
                </p>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <section className="container">
      <div className="py-10 sm:py-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl text-center sm:text-left font-bold tracking-tight sm:text-3xl">
              Dashboard
            </h2>

            <Link href="/p/create">
              <Button>Add Project</Button>
            </Link>
          </div>

          {projects && projects.length > 0 ? (
            <ProjectGrid projects={projects} title="Your Projects" />
          ) : (
            <p className="mt-10 text-md text-muted-foreground">
              You don't have any projects yet. Click{' '}
              <Link href="/p/create">"Add Project"</Link> to get started.
            </p>
          )}

          {bookmarkedProjects && bookmarkedProjects.length > 0 && (
            <div className="mt-16">
              <ProjectGrid
                projects={bookmarkedProjects}
                title="Saved Projects"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
