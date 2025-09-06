'use server'

import { createClient } from "./supabase/server";
import { revalidatePath } from "next/cache";
import { FeatureTypes } from "./types/project";
import { FeatureView } from "./types/features";

export async function checkUserUpvote(userId: string, featureId: string) {
  const supabase = await createClient(); // ← Add await
  const { data, error } = await supabase
    .from('upvotes')
    .select('id')
    .eq('user_id', userId)
    .eq('feature_id', featureId)
    .single();

  if (error) {
    console.error('Error checking upvote:', error);
    return false;
  }

  return !!data;
}

export async function handleUpvote(userId: string, featureId: string, hasUpvoted: boolean) {
  // Add a debounce mechanism to prevent spam clicks
  const debounceKey = `upvote_${userId}_${featureId}`;
  if ((globalThis as any)[debounceKey]) {
    console.log('Upvote action debounced');
    return false;
  }
  (globalThis as any)[debounceKey] = true;

  try {
    const supabase = await createClient(); // ← Add await and move inside try block
    
    // If it's not a spam click, proceed with the database operation
    if (hasUpvoted) {
      // Remove upvote
      const { error } = await supabase
        .from('upvotes')
        .delete()
        .eq('user_id', userId)
        .eq('feature_id', featureId);

      if (error) {
        console.error('Error removing upvote:', error);
        return false;
      }
    } else {
      // Add upvote
      const { error } = await supabase
        .from('upvotes')
        .insert({ user_id: userId, feature_id: featureId });

      if (error) {
        console.error('Error adding upvote:', error);
        return false;
      }
    }

    return true;
  } finally {
    // Reset the debounce after a short delay
    setTimeout(() => {
      (globalThis as any)[debounceKey] = false;
    }, 1000); // 1 second delay
  }
}

export async function getUpvoteCount(featureId: string) {
  const supabase = await createClient(); // ← Add await
  const { count, error } = await supabase
    .from('upvotes')
    .select('id', { count: 'exact' })
    .eq('feature_id', featureId);

  if (error) {
    console.error('Error getting upvote count:', error);
    return 0;
  }

  return count || 0;
}

export async function updateFeatureUpvoteCount(feature: FeatureView) {
  const supabase = await createClient(); // ← Add await
  const count = await getUpvoteCount(feature.id);

  const { error } = await supabase
    .from('featurerequests')
    .update({ upvotes: count })
    .eq('id', feature.id);

  if (error) {
    console.error('Error updating feature upvote count:', error);
    return false;
  }

  revalidatePath(`/p/${feature.slug}`);
  return true;
}