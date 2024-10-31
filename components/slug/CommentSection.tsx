'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ThumbsUp, MoreVertical, Paperclip } from 'lucide-react';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import CommentForm from './add-comments';
import { createClient, getUser } from '@/lib/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { getUserById } from '@/lib/supabase/client';
import Editor, { EditorRef } from '@/components/editor/advanced-editor';
import { JSONContent } from 'novel';
import { FeatureComment } from '@/lib/types/comments';

import { FeatureView } from '@/lib/types/features';
import { useToast } from '@/components/ui/use-toast';
import { ProjectTypes } from '@/lib/types/project';

type CommentSectionProps = {
  project: ProjectTypes;
  feature: FeatureView;
  feature_comments: FeatureComment[];
  projectCreatorId: string;
  featureAuthorId: string;
};

export default function CommentSection({
  project,
  feature,
  feature_comments,
  projectCreatorId,
  featureAuthorId,
}: CommentSectionProps) {
  const router = useRouter();
  const [comments, setComments] = useState<FeatureComment[]>(feature_comments);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const editorRef = useRef<EditorRef>(null);

  const formSchema = z.object({
    comment: z.string().min(1, 'Comment cannot be empty'),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: '',
    },
  });

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

  const editFormSchema = z.object({
    editComment: z.string().min(1, 'Comment cannot be empty'),
  });

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      editComment: '',
    },
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      const { user: userData } = await getUser();
      setUser(userData);
    }
    fetchUser();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const supabase = createClient();

    // ! Check if the user is authenticated
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Please sign in to add comments.',
        onClick: () => {
          router.push('/signin');
        },
      });
      return;
    }

    const { comment } = values;

    // Parse the comment string back to JSONContent
    const commentContent: JSONContent = JSON.parse(comment);

    const { data: newComment, error } = await supabase
      .from('comments')
      .insert({
        comment: commentContent,
        feature_id: feature.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to add comment',
        description: "We couldn't add your comment. Please try again.",
      });
      return;
    }

    // Fetch author details
    const author_details = await getUserById(newComment.user_id);

    if (!author_details) {
      toast({
        variant: 'destructive',
        title: 'Failed to fetch author details',
        description: "We couldn't fetch the author details. Please try again.",
      });
      return;
    }

    // Create a new comment object with author details
    const newCommentWithAuthor: FeatureComment = {
      comment_id: newComment.id,
      feature_id: newComment.feature_id,
      user_id: newComment.user_id,
      comment: commentContent,
      created_at: newComment.created_at,
      updated_at: newComment.updated_at,
      author_details: {
        first_name: author_details.first_name || '',
        last_name: author_details.last_name || '',
        avatar: author_details.avatar || '',
        avatar_url: author_details.avatar_url || '',
      },
    };

    // Update the comments state with the new comment
    setComments([...comments, newCommentWithAuthor]);

    // Clear the form and the Editor content
    form.reset();
    if (editorRef.current) {
      editorRef.current.clearContent();
    }

    if (newComment) {
      await notifyFeatureOwner(newCommentWithAuthor);
    }
  };

  const handleEditComment = async (values: z.infer<typeof editFormSchema>) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Please sign in to edit comments.',
        onClick: () => {
          router.push('/signin');
        },
      });
      return;
    }

    if (!editingCommentId) return;

    const supabase = createClient();

    // Parse the edited comment string back to JSONContent
    const editedCommentContent: JSONContent = JSON.parse(values.editComment);

    const { data, error } = await supabase
      .from('comments')
      .update({ comment: editedCommentContent }) // Store as JSON
      .eq('id', editingCommentId)
      .select()
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to edit comment',
        description: "We couldn't edit your comment. Please try again.",
      });
      return;
    }

    setComments(
      comments.map((c) =>
        c.comment_id === editingCommentId
          ? { ...c, comment: editedCommentContent }
          : c
      )
    );
    setEditingCommentId(null);
    editForm.reset();

    toast({
      title: 'Comment updated.',
      description: 'Your comment has been successfully updated.',
    });
  };

  const handleDeleteComment = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'Please sign in to delete comments.',
        onClick: () => {
          router.push('/signin');
        },
      });
      return;
    }

    if (!commentToDelete) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No comment selected for deletion.',
      });
      return;
    }

    const commentToDeleteData = comments.find(
      (c) => c.comment_id === commentToDelete
    );

    if (!commentToDeleteData) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Comment not found.',
      });
      setCommentToDelete(null);
      setIsDeleteDialogOpen(false);
      return;
    }

    if (user.id !== commentToDeleteData.user_id) {
      toast({
        variant: 'destructive',
        title: 'Permission denied',
        description: 'You do not have permission to delete this comment.',
      });
      setCommentToDelete(null);
      setIsDeleteDialogOpen(false);
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentToDelete);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete comment',
        description: `We couldn't delete your comment. Error: ${error.message}`,
      });
      return;
    }

    // Update this line to use comment_id instead of id
    setComments(comments.filter((c) => c.comment_id !== commentToDelete));
    setCommentToDelete(null);

    toast({
      title: 'Comment deleted.',
      description: 'Your comment has been successfully deleted.',
    });

    setIsDeleteDialogOpen(false);
  };

  const notifyFeatureOwner = async (comment: FeatureComment) => {
    if (featureAuthorId === comment.user_id) {
      // Don't notify if the feature owner is commenting on their own feature
      return;
    }

    const featureOwner = await getUserById(featureAuthorId);
    if (!featureOwner) {
      console.error('Feature owner not found');
      return;
    }

    const commentAuthor = await getUserById(comment.user_id);
    if (!commentAuthor) {
      console.error('Comment author not found');
      return;
    }

    try {
      const emailResponse = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: featureOwner.email,
          subject: `New Comment on Your Feature Request: ${feature.title}`,
          emailTemplate: {
            projectName: project.name,
            projectIcon: project.icon_url,
            notificationType: 'New Comment',
            title: `New Comment on "${feature.title}"`,
            message: `${commentAuthor.first_name} ${commentAuthor.last_name} commented on your feature request "${feature.title}" in the project "${project.name}".`,
            ctaText: 'View Comment',
            ctaLink: `https://featurize.io/p/${project.slug}/${feature.slug}`,
          },
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      console.log('Email notification sent to feature owner');
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center">
        <MessageSquare className="mr-2 h-5 w-5" />
        Comments ({comments.length})
      </h2>

      {comments.map((comment, index) => (
        <div key={comment.comment_id} className="flex items-start space-x-4">
          <Avatar className="w-10 h-10">
            <AvatarImage
              src={comment.author_details.avatar_url}
              alt={`${comment.author_details.first_name} ${comment.author_details.last_name}`}
            />
            <AvatarFallback>{`${comment.author_details.first_name.charAt(0)}${comment.author_details.last_name.charAt(0)}`}</AvatarFallback>
          </Avatar>
          <Card className="flex-grow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <p className="font-semibold text-sm">{`${comment.author_details.first_name} ${comment.author_details.last_name}`}</p>
                {comment.user_id === projectCreatorId && (
                  <Badge variant="secondary" className="text-xs">
                    Staff
                  </Badge>
                )}
                {comment.user_id === featureAuthorId && (
                  <Badge variant="outline" className="text-xs">
                    Author
                  </Badge>
                )}
              </div>
              {user &&
                (user.id === comment.user_id ||
                  user.id === projectCreatorId) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingCommentId(comment.comment_id);
                          editForm.setValue(
                            'editComment',
                            JSON.stringify(comment.comment)
                          );
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (
                            user &&
                            (user.id === comment.user_id ||
                              user.id === projectCreatorId)
                          ) {
                            setCommentToDelete(comment.comment_id);
                            setIsDeleteDialogOpen(true);
                          } else {
                            toast({
                              variant: 'destructive',
                              title: 'Permission denied',
                              description:
                                'You do not have permission to delete this comment.',
                            });
                          }
                        }}
                        className="text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </CardHeader>
            <CardContent>
              {editingCommentId === comment.comment_id ? (
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(handleEditComment)}>
                    <FormField
                      control={editForm.control}
                      name="editComment"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Editor
                              initialValue={
                                field.value
                                  ? JSON.parse(field.value)
                                  : undefined
                              }
                              onChange={(newValue) =>
                                editForm.setValue(
                                  'editComment',
                                  JSON.stringify(newValue)
                                )
                              }
                              editable={true}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingCommentId(null);
                          editForm.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Save</Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <Editor
                  initialValue={comment.comment} // Pass JSON directly
                  onChange={() => {}}
                  editable={false}
                />
              )}
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground pt-2">
              {formatDistanceToNow(new Date(comment.created_at))} ago{' '}
              {/* Updated to use real created_at */}
            </CardFooter>
          </Card>
          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Are you sure you want to delete this comment?
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete
                  your comment.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteComment}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ))}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Editor
                        ref={editorRef}
                        initialValue={
                          field.value ? JSON.parse(field.value) : undefined
                        }
                        onChange={(newValue) =>
                          form.setValue('comment', JSON.stringify(newValue))
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end items-center mt-4 gap-2">
                {/* <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Paperclip className="mr-2 h-4 w-4" />
                  Attach
                </Button> */}
                <Button type="submit">Post Comment</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
