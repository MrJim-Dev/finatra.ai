import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FeatureView } from '@/lib/types/features';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getStatusVariant } from '@/lib/utils';
import { GripVertical, ArrowUp, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { StrictModeDroppable } from './StrictModeDroppable';
import { Button } from '@/components/ui/button';
import {
  checkUserUpvote,
  handleUpvote,
  getUpvoteCount,
  updateFeatureUpvoteCount,
} from '@/lib/upvote';
import { getUser } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

const statusOrder = ['Open', 'In Progress', 'Completed'];

export default function BoardView({
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

    // Find the moved feature by its id
    const movedFeature = featureList.find(
      (feature) => feature.id.toString() === draggableId
    );

    if (!movedFeature) {
      console.error('Moved feature not found');
      return;
    }

    const newStatus = destination.droppableId;

    // Create a new list with the updated feature
    const newFeatureList = featureList.map((feature) =>
      feature.id === movedFeature.id
        ? { ...feature, status: newStatus }
        : feature
    );

    setFeatureList(newFeatureList);

    // Update the status in Supabase
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
      <div className="flex space-x-4">
        {statusOrder.map((status) => (
          <StrictModeDroppable
            key={status}
            droppableId={status}
            isDropDisabled={!isAuthorized}
          >
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="flex-1 min-w-[250px]"
              >
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">
                      <h3 className="text-lg font-semibold">{status}</h3>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
                                className="relative mb-2 group"
                              >
                                <Card className="shadow-sm hover:shadow-md transition-shadow">
                                  <CardContent className="p-3">
                                    {isAuthorized && (
                                      <div
                                        {...provided.dragHandleProps}
                                        className="absolute top-4 right-4 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <GripVertical
                                          size={16}
                                          className="text-muted-foreground"
                                        />
                                      </div>
                                    )}
                                    <Link
                                      href={`/p/${projectSlug}/${feature.slug}`}
                                    >
                                      <h4 className="text-sm font-large mb-2">
                                        {feature.title}
                                      </h4>
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {feature.category &&
                                          feature.category.map(
                                            (cat: string) => (
                                              <Badge
                                                key={cat}
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {cat}
                                              </Badge>
                                            )
                                          )}
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
                                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                                        <div className="flex items-center space-x-2">
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
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Avatar className="w-4 h-4">
                                            <AvatarImage
                                              src={feature.author.avatar_url}
                                            />
                                            <AvatarFallback>
                                              {feature.author.first_name.charAt(
                                                0
                                              )}
                                              {feature.author.last_name.charAt(
                                                0
                                              )}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span>
                                            {formatDistanceToNow(
                                              new Date(feature.created_at),
                                              { addSuffix: true }
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </Link>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No features {status.toLowerCase()}.
                      </div>
                    )}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              </div>
            )}
          </StrictModeDroppable>
        ))}
      </div>
    </DragDropContext>
  );
}
