'use client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import TagsInput from '@/components/ui/tags-inputv2';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { trimString } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '../ui/use-toast';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Editor from '@/components/editor/advanced-editor';
import { JSONContent } from 'novel';
import { ProjectTypes } from '@/lib/types/project'; // Import ProjectTypes
import { getUserById } from '@/lib/supabase/client';
const formSchema = z.object({
  title: z
    .string()
    .min(2, {
      message: 'Title must be at least 2 characters.',
    })
    .max(100, {
      message: 'Title must be at most 100 characters.',
    }),
  category: z.array(z.string()).min(1, {
    message: 'At least one category is required.',
  }),
  description: z.any(),
  tags: z.array(z.string()),
});

type FeatureRequestFormProps = {
  project: ProjectTypes; // Change this to accept the whole project data
  initialData?: z.infer<typeof formSchema>;
};

const FeatureRequestForm: React.FC<FeatureRequestFormProps> = ({
  project,
  initialData,
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const featureSlug = searchParams.get('id');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      title: '',
      category: [],
      description: {},
      tags: [],
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const supabase = createClient();

    const { title, category, description, tags } = values;

    const featureData = {
      title,
      category,
      description: description as JSONContent,
      tags,
    };

    let finalSlug = '';

    if (featureSlug) {
      // Update existing feature request
      const { error } = await supabase
        .from('featurerequests')
        .update(featureData)
        .eq('project_id', project.project_id)
        .eq('slug', featureSlug)
        .select();

      if (error) {
        return toast({
          variant: 'destructive',
          title: 'Failed to update feature request',
          description:
            "We couldn't update your feature request. Please try again.",
        });
      }

      toast({
        title: 'Feature request updated.',
        description: 'We have updated your feature request.',
      });

      router.replace(`./${featureSlug}`);
    } else {
      // Create new feature request
      let slug = trimString(title).toLowerCase().replace(/\s+/g, '-');
      if (slug.length > 20) {
        slug = slug.substring(0, 20);
      }
      let isUnique = false;
      let counter = 0;

      while (!isUnique) {
        const { data, error } = await supabase
          .from('featurerequests')
          .select('slug')
          .eq('project_id', project.project_id)
          .eq('slug', counter === 0 ? slug : `${slug}-${counter}`)
          .single();

        if (error || !data) {
          isUnique = true;
        } else {
          counter++;
        }
      }

      finalSlug = counter === 0 ? slug : `${slug}-${counter}`;

      const { error } = await supabase
        .from('featurerequests')
        .insert({
          ...featureData,
          project_id: project.project_id,
          slug: finalSlug,
        })
        .select()
        .single();

      if (error) {
        return toast({
          variant: 'destructive',
          title: 'Failed to add feature request',
          description:
            "We couldn't add your feature request. Please try again.",
        });
      }

      toast({
        title: 'Feature request added.',
        description: 'We have added your feature request to the project.',
      });

      // Fetch project owner's email
      const user = await getUserById(project.user_id);
      if (!user) {
        console.error('Project owner not found');
        return;
      }

      // Send email notification for new feature request
      try {
        const emailResponse = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: user.email,
            subject: 'New Feature Request Added',
            emailTemplate: {
              projectName: project.name,
              projectIcon: project.icon_url,
              notificationType: 'New Feature Request',
              title: `New Feature Request: ${title}`,
              message: `A new feature request has been added to your project "${project.name}".`,
              ctaText: 'View Feature Request',
              ctaLink: `https://featurize.io/p/${project.slug}/${finalSlug}`,
            },
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          throw new Error(errorData.error || 'Failed to send email');
        }

        const emailResult = await emailResponse.json();
        console.log('Email sent successfully:', emailResult);
      } catch (error) {
        console.error('Error sending email:', error);
        // Handle the error as needed, e.g., show a toast notification
      }

      router.replace(`./${finalSlug}`);
    }
  }

  const categorySuggestions = [
    'Feature',
    'Bug',
    'Improvement',
    'Task',
    'UI/UX',
    'Documentation',
    'Performance',
    'Security',
    'API',
    'Accessibility',
    'Backend',
    'Frontend',
    'DevOps',
    'Support',
  ];
  const tagSuggestions: string[] = [];

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col space-y-4 sticky "
      >
        <h2 className="text-2xl font-bold">Request a feature</h2>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Feature</FormLabel>
              <FormControl>
                <Input placeholder="Feature title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">
                Category
              </FormLabel>
              <FormControl>
                <TagsInput
                  placeholder="Add categories"
                  maxItems={3}
                  value={field.value}
                  onChange={field.onChange}
                  suggestions={categorySuggestions}
                  allowCustomTags={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Description</FormLabel>
              <FormControl>
                <Editor
                  initialValue={field.value as JSONContent}
                  onChange={(newValue) => field.onChange(newValue)}
                  editable={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Tags</FormLabel>
              <FormControl>
                <TagsInput
                  placeholder="Add tags"
                  maxItems={5}
                  value={field.value}
                  onChange={field.onChange}
                  suggestions={tagSuggestions}
                  allowCustomTags={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">
          {featureSlug ? 'Update Feature Request' : 'Submit Feature Request'}
        </Button>
      </form>
    </Form>
  );
};

export default FeatureRequestForm;
