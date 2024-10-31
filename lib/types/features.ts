import { ProjectTypes } from "./project";
import { UserData } from "./user";


export type FeatureView = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  upvotes: number;
  slug: string;
  category: any; 
  tags: any; 
  author: UserData;
  project: ProjectTypes;
  comments: number;
};
