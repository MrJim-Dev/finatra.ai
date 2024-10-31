import { createClient } from "./supabase/server";
import { ProjectTypes } from "./types/project";

export function getPublicUrl(bucket: string, path: string): string | null {
  const supabase = createClient();
  const { data } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(path);

  if (!data) {
    return null;
  }

  return data.publicUrl;
}

export async function getProjectBySlug(slug: string): Promise<ProjectTypes | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select()
    .eq('slug', slug)
    .single();

  if (error) {
    return null;
  }

  if (data) {
    let icon_url = null;
    if (data.project_icon) {
      icon_url = getPublicUrl('projects', data.project_icon);
    }

    return { ...data, icon_url };
  }

  return null;
}

export async function getPublicProjects(): Promise<ProjectTypes[] | null> {
  const supabase = createClient();
  

  const { data, error } = await supabase
    .from('projects_view')
    .select()
    .eq('privacy', 'public')
    .order('feature_count', { ascending: false });

  if (error) {
    return null;
  }

  if (data) {
    const projectsWithIcons = await Promise.all(data.map(async (project) => {
      let icon_url = null;
      if (project.project_icon) {
        icon_url = await getPublicUrl('projects', project.project_icon);
      }

      return { ...project, icon_url };
    }));

    return projectsWithIcons;
  }

  return null;
}

export async function getProjectsByUserId(userId: string): Promise<ProjectTypes[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects_view")
    .select()
    .eq("user_id", userId)

  if (error) {
    return null;
  }

  if (data) {
    const projectsWithIcons = await Promise.all(data.map(async (project) => {
      let icon_url = null;
      if (project.project_icon) {
        icon_url = await getPublicUrl('projects', project.project_icon);
      }

      return { ...project, icon_url };
    }));

    return projectsWithIcons;
  }

  return null;
}



export async function getFeaturesByProjectId(projectId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('features_view')
    .select()
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    return data;
  }

  const projectsWithAvatars = await Promise.all(data.map(async (feature) => {
    const avatar_url = getPublicUrl('profiles', feature.author.avatar || null); // Get avatar_url
    return { ...feature, author: { ...feature.author, avatar_url } }; // Append avatar_url to author
  }));

  return projectsWithAvatars;
}

export async function getFeatureByProjectSlug(project_id: string, featureSlug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('features_view')
    .select()
    .eq('project_id', project_id)
    .eq('slug', featureSlug)
    .single();

  if (error) {
    return data;
  }

  const avatar_url = getPublicUrl('profiles', data.author.avatar || null); // Get avatar_url
  return { ...data, author: { ...data.author, avatar_url } }; // Append avatar_url to author
}

export async function getUpdatedVotesPerFeature(requestId: string, userId: string) {
  const supabase = createClient();
  const {data, error} = await supabase.from("votes").select().eq("request_id", requestId).eq("user_id", userId)

  if(error) return

  return data
}

export async function getFeatureComments(featureId: string) {
  const supabase = createClient();
  let { data: feature_comments_view, error } = await supabase
    .from('feature_comments_view')
    .select('*')
    .eq('feature_id', featureId)
    .order('created_at', { ascending: true }); // Added order clause

  if (error) {
    return null; 
  }

  if (!feature_comments_view) {
    return null;
  }

  const commentsWithAvatars = await Promise.all(feature_comments_view.map(async (comment) => {
    const avatar_url = getPublicUrl('profiles', comment.author_details.avatar || null); 
    return { ...comment, author_details: { ...comment.author_details, avatar_url } }; 
  }));

  return commentsWithAvatars; 
}

export async function getBookmarkedProjects(userId: string): Promise<ProjectTypes[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .select("project_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching bookmarks:", error);
    return null;
  }

  if (data && data.length > 0) {
    const projectIds = data.map(bookmark => bookmark.project_id);
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select()
      .in("project_id", projectIds);


    if (projectsError) {
      console.error("Error fetching bookmarked projects:", projectsError);
      return null;
    }

    const projectsWithIcons = await Promise.all(projects.map(async (project) => {
      let icon_url = null;
      if (project.project_icon) {
        icon_url = await getPublicUrl('projects', project.project_icon);
      }

      return { ...project, icon_url };
    }));

    return projectsWithIcons;
  }

  return null;
}