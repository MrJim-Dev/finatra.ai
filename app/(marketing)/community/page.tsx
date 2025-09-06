import { meServer } from '@/lib/api/auth';
import { capitalizeWords } from '@/lib/utils';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import ProjectIcon from '@/components/slug/project-icon';
import { getPublicProjects } from '@/lib/project';
import { ProjectTypes } from '@/lib/types/project';
import { getCurrentUserServer } from '@/lib/session';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { SearchInput } from '@/components/search-input';
import Particles from '@/components/magicui/particles';
import CallToActionSection from '@/components/landing/cta-section';
export const metadata = {
  title: 'Community Projects | Featurize',
  description: 'Discover public projects and ideas on Featurize.',
};

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: { page: string; search: string };
}) {
  const user = await getCurrentUserServer();
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || '';
  const pageSize = 9;
  const allProjects = await getPublicProjects();

  if (!allProjects) {
    // Handle the case where no projects are found
    return (
      <section className="container py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight mb-8 text-center">
            Community Projects
          </h1>
          <p className="text-xl text-center text-muted-foreground">
            No projects found at the moment.
          </p>
        </div>
      </section>
    );
  }

  const filteredProjects = search
    ? allProjects.filter(
        (project) =>
          project.name.toLowerCase().includes(search.toLowerCase()) ||
          project.description.toLowerCase().includes(search.toLowerCase())
      )
    : allProjects;

  const totalPages = Math.ceil(filteredProjects.length / pageSize);
  const projects = filteredProjects.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <>
      <section className="container py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight mb-8 text-center">
            Community Projects
          </h1>
          <p className="text-xl text-center text-muted-foreground mb-12">
            Discover and explore public projects created by the Featurize
            community
          </p>

          <SearchInput />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={page > 1 ? `?page=${page - 1}&search=${search}` : '#'}
                />
              </PaginationItem>
              {[...Array(totalPages)].map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    href={`?page=${i + 1}&search=${search}`}
                    isActive={page === i + 1}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href={
                    page < totalPages
                      ? `?page=${page + 1}&search=${search}`
                      : '#'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </section>

      <CallToActionSection />

      <Particles
        className="absolute inset-0 -z-10"
        quantity={50}
        ease={70}
        size={0.05}
        staticity={40}
        color={'#ffffff'}
      />
    </>
  );
}

function ProjectCard({ project }: { project: ProjectTypes }) {
  return (
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
          {/* <div className="flex gap-2">
            <Badge variant="secondary">{project.status}</Badge>
            <Badge variant="secondary">{project.privacy}</Badge>
          </div> */}
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
  );
}

