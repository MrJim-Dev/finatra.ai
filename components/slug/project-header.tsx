'use client';
import React, { useState, useEffect } from 'react';
import ProjectIcon from './project-icon';
import { capitalizeWords, dateAndTimeFormat } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ProjectTypes } from '@/lib/types/project';
import {
  MoreVertical,
  Edit,
  Trash2,
  Link as LinkIcon,
  Bookmark,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import Link from 'next/link';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { createClient, getUser } from '@/lib/supabase/client';
import { useToast } from '../ui/use-toast';
import { useRouter } from 'next/navigation';
import { UserData } from '@/lib/types/user';
import { User } from '@supabase/supabase-js';

export default function ProjectHeader({
  project,
  isAuthorized,
  isBookmarked: initialIsBookmarked,
  user = null,
}: {
  project: ProjectTypes;
  isAuthorized: boolean;
  isBookmarked: boolean;
  user: User | null;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);

  const supabase = createClient();

  useEffect(() => {
    checkBookmarkStatus();
  }, []);

  const checkBookmarkStatus = async () => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('project_id', project.id)
      .single();

    if (error) {
      console.error('Error checking bookmark status:', error);
    } else {
      setIsBookmarked(!!data);
    }
  };

  const toast = useToast();

  const router = useRouter();

  const handleDeleteProject = async () => {
    if (deleteConfirmation === project.slug) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('slug', project.slug);

      if (error) {
        console.error('Error deleting project:', error);
        toast.toast({
          title: 'Error',
          description: 'Failed to delete project. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast.toast({
          title: 'Success',
          description: 'Project deleted successfully',
        });
        setIsDeleteDialogOpen(false);
        router.replace('/dashboard');
      }
    }
  };

  const toggleBookmark = async () => {
    if (isBookmarked) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('project_id', project.project_id)
        .eq('user_id', user?.id as string);

      if (error) {
        console.error('Error removing bookmark:', error);
        toast.toast({
          title: 'Error',
          description: 'Failed to remove bookmark. Please try again.',
          variant: 'destructive',
        });
      } else {
        setIsBookmarked(false);
        toast.toast({
          title: 'Success',
          description: 'Bookmark removed successfully',
        });
      }
    } else {
      const { error } = await supabase.from('bookmarks').insert({
        project_id: project.project_id,
      });

      if (error) {
        console.error('Error adding bookmark:', error);
        toast.toast({
          title: 'Error',
          description: 'Failed to add bookmark. Please try again.',
          variant: 'destructive',
        });
      } else {
        setIsBookmarked(true);
        toast.toast({
          title: 'Success',
          description: 'Bookmark added successfully',
        });
      }
    }
  };

  return (
    <>
      <article className="">
        <div className="mx-auto mt-10 gap-8 sm:mt-10 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          <div className="flex flex-col items-start justify-between space-y-4">
            <div className="relative w-full space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-3">
                  {project?.icon_url ? (
                    <ProjectIcon
                      name={project.name}
                      icon_url={project?.icon_url ?? ''}
                    />
                  ) : (
                    <ProjectIcon name={project?.name as string} />
                  )}
                  <div>
                    <h1 className="text-2xl font-semibold mb-2">
                      {capitalizeWords(project?.name as string)}
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleBookmark}
                      className="h-8 px-2"
                    >
                      <Bookmark
                        className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`}
                      />
                    </Button>
                  )}
                  {isAuthorized && (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="focus:outline-none">
                        <MoreVertical className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem asChild>
                          <Link href={`/p/edit/${project?.slug}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit Project</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setIsDeleteDialogOpen(true)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete Project</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              <p className="line-clamp-3 text-md leading-6 text-gray-200">
                {project?.description}
              </p>
              <div className="flex items-center gap-2">
                {/* <Badge variant="secondary">{project?.status}</Badge>
                <Badge variant="secondary">{project?.privacy}</Badge> */}
                {project?.website_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-6 px-2 text-xs"
                  >
                    <a
                      href={project.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Website
                    </a>
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-x-4 text-sm text-gray-500">
                <time
                  dateTime={
                    project?.created_at
                      ? dateAndTimeFormat(project?.created_at.toString())
                      : ''
                  }
                >
                  Created:{' '}
                  {project?.created_at
                    ? dateAndTimeFormat(project?.created_at.toString())
                    : ''}
                </time>
              </div>
            </div>
          </div>
        </div>
      </article>
      <Separator className="my-8" />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              This action cannot be undone. To confirm, please type "
              {project.slug}" below.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder={`Type "${project.slug}" to confirm`}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={deleteConfirmation !== project.slug}
            >
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
