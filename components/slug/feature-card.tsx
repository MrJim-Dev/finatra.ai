'use client';

import { FeatureView } from '@/lib/types/features';
import { dateAndTimeFormat, trimString } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import {
  checkUserUpvote,
  handleUpvote,
  getUpvoteCount,
  updateFeatureUpvoteCount,
} from '@/lib/upvote';
import { getUser } from '@/lib/supabase/client';
import { useToast } from '../ui/use-toast';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { MessageSquare, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useRouter } from 'next/navigation';
import { StatusBadgeDropdown } from '../status-badge-dropdown';
import { getPublicUrl } from '@/lib/supabase/client';
import Link from 'next/link';

export default function FeatureCard({
  projectName,
  feature,
  currentUser,
  projectSlug,
  isAuthorized = false,
}: {
  projectName: string;
  feature: FeatureView;
  currentUser: string;
  projectSlug: string;
  isAuthorized?: boolean;
}) {
  const router = useRouter();

  const [upvoteCount, setUpvoteCount] = useState(feature.upvotes);
  const [hasUpvoted, setHasUpvoted] = useState(false);
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

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if the click is on a button or the status badge
    if (
      e.target instanceof HTMLElement &&
      (e.target.closest('button') || e.target.closest('.status-badge-dropdown'))
    ) {
      return;
    }
    router.push(`/p/${projectSlug}/${feature.slug}`);
  };

  const handleUpvoteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { user } = await getUser();
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to upvote.',
        variant: 'destructive',
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

  const handleStatusBadgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleInteractiveElementClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link href={`/p/${projectSlug}/${feature.slug}`} passHref legacyBehavior>
      <a className="block">
        <Card className="w-full cursor-pointer">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start gap-2">
              <div className="flex flex-wrap items-start gap-2 pr-2">
                <CardTitle className="text-lg font-semibold break-words">
                  {feature.title}
                  <span className="status-badge-dropdown">
                    <StatusBadgeDropdown
                      currentStatus={feature.status}
                      isAuthorized={isAuthorized}
                      featureId={feature.id}
                      onStatusUpdated={(newStatus) => {
                        // Handle status update if needed
                        console.log('Status updated:', newStatus);
                      }}
                    />
                  </span>
                </CardTitle>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarImage
                        src={feature.author.avatar_url}
                        alt={`${feature.author.first_name} ${feature.author.last_name}`}
                      />
                      <AvatarFallback className="text-xs">
                        {feature.author.first_name[0]}
                        {feature.author.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{`${feature.author.first_name} ${feature.author.last_name}`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="pb-0">
            <div className="mt-2 flex flex-wrap gap-2">
              {feature.category &&
                feature.category.map((cat: string) => (
                  <Badge key={cat} variant="secondary" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              {feature.tags &&
                feature.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className={`text-muted-foreground px-2 ${hasUpvoted ? '' : ''}`}
                onClick={(e) => {
                  handleInteractiveElementClick(e);
                  handleUpvoteClick(e);
                }}
              >
                <ArrowUp className="h-4 w-4" />
                <span className="ml-1">{upvoteCount}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground px-2"
                onClick={handleInteractiveElementClick}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                {feature.comments}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(feature.created_at), {
                addSuffix: true,
              })}
            </p>
          </CardFooter>
        </Card>
      </a>
    </Link>
  );
}
