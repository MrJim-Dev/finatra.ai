'use client';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Assuming you have a Textarea component
import { createClient, getUser } from '@/lib/supabase/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from './ui/use-toast';
import { trimString } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { v4 as uuidv4 } from 'uuid';
import { ProjectTypes } from '@/lib/types/project';
import FileInput from '@/components/ui/custom/file-input';

const supabase = createClient();

const formSchema = z.object({
  projectName: z
    .string()
    .min(1, 'Project Name is required')
    .max(50, 'Project Name must be at most 50 characters'),
  slug: z
    .string()
    .min(1, 'A unique slug is required')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be a valid format'),
  description: z.string().min(1, 'Project Description is required'),
  websiteUrl: z
    .string()
    .url('Must be a valid URL')
    .min(1, 'Website URL is required'),
  projectIcon: z.any().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProjectFormProps {
  project?: ProjectTypes;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ project }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: project?.name || '',
      slug: project?.slug || '',
      description: project?.description || '',
      websiteUrl: project?.website_url || '',
    },
  });

  const { watch, setValue, setError, clearErrors } = form;
  const projectName = watch('projectName');
  const slug = watch('slug');

  useEffect(() => {
    if (projectName && !project) {
      // Only generate slug for new projects
      const generatedSlug = trimString(projectName);
      setValue('slug', generatedSlug);
    }
  }, [projectName, setValue, project]);

  const handleSlugChange = (value: string) => {
    const input = value.toLowerCase().replace(/[^a-z0-9-]+/g, '');
    setValue('slug', input);
  };

  useEffect(() => {
    const checkSlugUnique = async () => {
      if (slug && (!project || slug !== project.slug)) {
        const { data: projects, error } = await supabase
          .from('projects')
          .select('*')
          .eq('slug', slug);

        if (error) {
          console.error('Error checking slug uniqueness:', error);
          return;
        }

        if (projects && projects.length > 0) {
          setError('slug', {
            type: 'manual',
            message: 'This slug is already taken. Please choose another one.',
          });
        } else {
          clearErrors('slug');
        }
      }
    };

    checkSlugUnique();
  }, [slug, project, setError, clearErrors]);

  const onSubmit = async (data: FormData) => {
    const { user } = await getUser();

    if (!user) {
      router.replace('/login');
      return;
    }

    // Check if the slug is unique before submitting (only for new projects or changed slugs)
    if (!project || (project && data.slug !== project.slug)) {
      const { data: existingProjects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', data.slug);

      if (error) {
        console.error('Error checking slug uniqueness:', error);
        toast({
          title: 'Error',
          description: 'An error occurred while checking slug uniqueness.',
          variant: 'destructive',
        });
        return;
      }

      if (existingProjects && existingProjects.length > 0) {
        setError('slug', {
          type: 'manual',
          message: 'This slug is already taken. Please choose another one.',
        });
        return;
      }
    }

    try {
      setLoading(true);
      const { projectName, slug, description, websiteUrl, projectIcon } = data;

      let projectId: number | undefined;

      if (project) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            name: projectName,
            slug: slug,
            description: description,
            website_url: websiteUrl,
          })
          .eq('id', project.id);

        if (updateError) throw updateError;
        projectId = project.id;
      } else {
        // Insert new project
        const { data: newProject, error: insertError } = await supabase
          .from('projects')
          .insert([
            {
              name: projectName,
              slug: slug,
              description: description,
              website_url: websiteUrl,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        projectId = newProject?.id;
      }

      // Handle project icon upload (for both new and existing projects)
      if (projectIcon instanceof File && projectId) {
        const fileExt = projectIcon.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${projectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('projects')
          .upload(filePath, projectIcon);

        if (uploadError) throw uploadError;

        // Update the project with the new icon path
        const { error: updateError } = await supabase
          .from('projects')
          .update({ project_icon: filePath })
          .eq('id', projectId);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Success',
        description: project
          ? 'Project was updated successfully.'
          : 'Project was created successfully.',
      });

      if (pathname.startsWith('/p')) {
        router.replace(`/p/${slug}`);
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while saving the project.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 py-2 pb-4"
      >
        <FormField
          control={form.control}
          name="projectIcon"
          render={({ field: { onChange, value, ...rest } }) => (
            <FileInput
              label="Project Icon"
              description="Recommended size: 256x256 pixels"
              value={value}
              onChange={onChange}
              id="projectIcon"
              existingImageUrl={project?.icon_url || undefined}
            />
          )}
        />
        <FormField
          control={form.control}
          name="projectName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project / App Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Inc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input
                  placeholder="acme"
                  {...field}
                  onChange={(e) => handleSlugChange(e.target.value)}
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
              <FormLabel>Project Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe your project" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="websiteUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website URL</FormLabel>
              <FormControl>
                <Input placeholder="https://www.example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading}>
          {loading
            ? project
              ? 'Updating...'
              : 'Creating...'
            : project
              ? 'Update'
              : 'Create'}
        </Button>
      </form>
    </Form>
  );
};

export default ProjectForm;
