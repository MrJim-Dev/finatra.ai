'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FeatureTypes, ProjectTypes } from '@/lib/types/project';
import { createClient, getPublicUrl, getUser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '../ui/use-toast';
import { UserData } from '@/lib/types/user';
import {
  checkUserUpvote,
  handleUpvote,
  getUpvoteCount,
  updateFeatureUpvoteCount,
} from '@/lib/upvote';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadgeDropdown } from '../status-badge-dropdown';
import { FeatureView } from '@/lib/types/features';
export default function FeatureHeader({
  project,
  feature,
  isAuthorized = false,
}: {
  project: ProjectTypes;
  feature: FeatureView;
  isAuthorized: boolean;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(feature.upvotes || 0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [status, setStatus] = useState(feature.status || 'Open');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const initUpvote = async () => {
      const { user } = await getUser();
      if (user) {
        const hasUpvoted = await checkUserUpvote(user.id, feature.id);
        setHasUpvoted(hasUpvoted);
        const count = await getUpvoteCount(feature.id);
        setUpvoteCount(count);
      }
    };
    initUpvote();
  }, [feature.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleUpvoteClick = async () => {
    const { user } = await getUser();
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to upvote. Click here to sign in.',
        variant: 'destructive',
        onClick: () => {
          router.push('/signin');
        },
      });
      return;
    }

    const success = await handleUpvote(user.id, feature.id, hasUpvoted);
    if (success) {
      setHasUpvoted(!hasUpvoted);
      setUpvoteCount((prev) => (hasUpvoted ? prev - 1 : prev + 1));
      await updateFeatureUpvoteCount(feature);
    }
  };

  const handleDeletePost = async () => {
    const supabase = createClient();

    const { error } = await supabase
      .from('featurerequests')
      .delete()
      .eq('id', feature.id);

    if (!error) {
      setShowDeleteDialog(false);
      router.replace(`/p/${project.slug}`);
      toast({
        title: 'Feature deleted',
        description: 'The feature request has been successfully deleted.',
        variant: 'default',
      });
    } else {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to delete the feature request. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href={`/p/${project.slug}`} className="hover:text-foreground">
          {project.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{feature.title}</span>
      </div>

      <div className="space-y-4">
        <div className="flex items-stretch">
          {/* Upvote Button with Count */}
          <div className="flex items-stretch space-x-1 mr-4">
            <Button
              variant={hasUpvoted ? 'outline' : 'outline'}
              size="icon"
              className="h-full w-10 flex flex-col items-center justify-center"
              onClick={handleUpvoteClick}
            >
              <span>↑</span> {/* Replace with an icon if needed */}
              <span className="sr-only">Upvote</span>
              <p>{upvoteCount}</p>
            </Button>
          </div>

          <div className="flex-1">
            {/* Title and Status */}
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{feature.title}</h1>
              <StatusBadgeDropdown
                currentStatus={status}
                isAuthorized={isAuthorized}
                featureId={feature.id}
                onStatusUpdated={setStatus}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(feature.category) &&
                feature.category.map((cat: string, index: number) => (
                  <Badge key={index} variant="outline">
                    {cat}
                  </Badge>
                ))}
            </div>
          </div>
          {isAuthorized && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Link href={`/p/${project.slug}/request?id=${feature.slug}`}>
                    Edit Post
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  Delete Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Are you sure you want to delete this post?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              post.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePost}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
