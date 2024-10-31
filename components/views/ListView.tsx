import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FeatureView } from '@/lib/types/features';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getStatusVariant } from '@/lib/utils';
import { GripVertical, ArrowUp, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { StrictModeDroppable } from './StrictModeDroppable';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  checkUserUpvote,
  handleUpvote,
  getUpvoteCount,
  updateFeatureUpvoteCount,
} from '@/lib/upvote';
import { getUser } from '@/lib/supabase/client';

const statusOrder = ['Open', 'In Progress', 'Completed'];

export default function ListView({
  features,
  projectSlug,
  isAuthorized,
}: {
  features: FeatureView[];
  projectSlug: string;
  isAuthorized: boolean;
}) {
  const [featureList, setFeatureList] = useState(features);
  const { toast } = useToast();

  useEffect(() => {
    setFeatureList(features);
  }, [features]);

  const onDragEnd = async (result: any) => {
    if (!isAuthorized || !result.destination) return;

    const { source, destination, draggableId } = result;

    const movedFeature = featureList.find(
      (feature) => feature.id.toString() === draggableId
    );

    if (!movedFeature) {
      console.error('Moved feature not found');
      return;
    }

    const newStatus = destination.droppableId;

    const newFeatureList = featureList.map((feature) =>
      feature.id === movedFeature.id
        ? { ...feature, status: newStatus }
        : feature
    );

    setFeatureList(newFeatureList);

    const supabase = createClient();
    const { error } = await supabase
      .from('featurerequests')
      .update({ status: newStatus })
      .eq('id', movedFeature.id);

    if (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Status updated',
        description: `Feature "${movedFeature.title}" status changed to ${newStatus}`,
        variant: 'default',
      });
    }
  };

  const handleUpvoteClick = async (
    e: React.MouseEvent,
    feature: FeatureView
  ) => {
    e.preventDefault();
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

    const hasUpvoted = await checkUserUpvote(user.id, feature.id);
    const success = await handleUpvote(user.id, feature.id, hasUpvoted);
    if (success) {
      const newCount = await getUpvoteCount(feature.id);
      setFeatureList(
        featureList.map((f) =>
          f.id === feature.id ? { ...f, upvotes: newCount } : f
        )
      );
      await updateFeatureUpvoteCount(feature);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-8">
        {statusOrder.map((status) => (
          <div key={status}>
            <h3 className="text-lg font-semibold mb-4">{status}</h3>
            <StrictModeDroppable
              droppableId={status}
              isDropDisabled={!isAuthorized}
            >
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {featureList.filter((feature) => feature.status === status)
                    .length > 0 ? (
                    featureList
                      .filter((feature) => feature.status === status)
                      .map((feature, index) => (
                        <Draggable
                          key={feature.id}
                          draggableId={feature.id.toString()}
                          index={index}
                          isDragDisabled={!isAuthorized}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="group"
                            >
                              <Card className="hover:bg-accent transition-colors my-2">
                                <CardContent className="flex items-center justify-between py-4 gap-2">
                                  {isAuthorized && (
                                    <div
                                      {...provided.dragHandleProps}
                                      className="hidden group-hover:flex cursor-move mr-2"
                                    >
                                      <GripVertical
                                        size={16}
                                        className="text-muted-foreground"
                                      />
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4 flex-grow">
                                    <Link
                                      href={`/p/${projectSlug}/${feature.slug}`}
                                    >
                                      <span className="text-sm font-medium">
                                        {feature.title}
                                      </span>
                                    </Link>
                                    <div className="flex flex-wrap gap-1">
                                      {feature.category &&
                                        feature.category.map((cat: string) => (
                                          <Badge
                                            key={cat}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {cat}
                                          </Badge>
                                        ))}
                                      {feature.tags &&
                                        feature.tags.map((tag: string) => (
                                          <Badge
                                            key={tag}
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            {tag}
                                          </Badge>
                                        ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground px-2"
                                      onClick={(e) =>
                                        handleUpvoteClick(e, feature)
                                      }
                                    >
                                      <ArrowUp className="h-4 w-4 mr-1" />
                                      <span>{feature.upvotes}</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground px-2"
                                    >
                                      <MessageSquare className="h-4 w-4 mr-1" />
                                      <span>{feature.comments}</span>
                                    </Button>
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage
                                        src={feature.author.avatar_url}
                                      />
                                      <AvatarFallback>
                                        {feature.author.last_name.charAt(0)}
                                        {feature.author.first_name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(
                                        new Date(feature.created_at),
                                        {
                                          addSuffix: true,
                                        }
                                      )}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))
                  ) : (
                    <Card className="">
                      <CardContent className="py-4 text-center text-muted-foreground">
                        No features in {status.toLowerCase()} status
                      </CardContent>
                    </Card>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </StrictModeDroppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
