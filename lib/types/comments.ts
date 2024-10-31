import { JSONContent } from "novel";

export type FeatureComment = {
    comment_id: string;        
    feature_id: string;       
    user_id: string;          
    author_details: Record<string, any>; 
    comment: JSONContent;        
    created_at: string;      
    updated_at: string;       
};
