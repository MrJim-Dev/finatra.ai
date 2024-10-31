import { JSONContent } from "novel";

export type ProjectView = {
  id: number; // integer
  project_id: string; // uuid
  user_id: string; // uuid
  name: string; // text
  description: string; // text
  logo_url: string | null; // character varying
  social_links: JSON; // jsonb
  status: string; // character varying
  privacy: string; // character varying
  created_at: Date; // timestamp without time zone
  updated_at: Date; // timestamp without time zone
  slug: string; // text
  project_icon: string; // text
  website_url: string; // text
  creator: JSON; // json
  featurerequests: {
    id: string;
    project_id: string;
    user_id: string;
    title: string;
    description: JSONContent;
    status: string;
    priority: string;
    votes: number;
    due_date: Date;
    created_at: string;
    updated_at: string;
    tags: JSON;
    category: JSON;
    slug: string;
    author: JSON; // jsonb for author information
  }[]; // array of feature requests
}


export type ProjectTypes = {
  id: number;
  project_id: string;
  user_id: string;
  name: string;
  description: string;
  logo_url: null;
  social_links: null;
  status: string;
  privacy: string;
  created_at: Date;
  updated_at: Date;
  slug: string;
  website_url: string;
  icon_url?: string | null;
  project_icon?: string | null;
}

export type FeatureTypes = {
  id: string,
  project_id: string,
  user_id: string,
  title: string,
  description: JSONContent,
  status: string,
  priority: string,
  upvotes: number,
  due_date: Date,
  created_at: string,
  updated_at: string
  tags: JSON,
  category: JSON,
  slug: string,
}