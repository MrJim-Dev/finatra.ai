'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { FeatureTypes } from '@/lib/types/project';
import { UserData } from '@/lib/types/user';
import Editor from '../editor/advanced-editor';

export default function FeatureContent({
  feature,
  author,
}: {
  feature: FeatureTypes;
  author: UserData;
}) {
  // console.log(author);
  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <Editor
            initialValue={feature.description} // Pass JSON directly
            onChange={() => {}}
            editable={false}
          />
          <div className="flex flex-wrap gap-2 mt-4">
            {Array.isArray(feature.tags) &&
              feature.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end space-x-2  text-muted-foreground mt-2 text-xs">
        <Avatar className="w-5 h-5">
          <AvatarImage
            src={author.avatar_url || undefined} // Ensure src is either string or undefined
            alt={`${author.first_name} ${author.last_name}`}
          />
          <AvatarFallback className="text-xs">
            {author.first_name.charAt(0)}
            {author.last_name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span>{`${author.first_name} ${author.last_name}`}</span>
        <span>•</span>
        <span>{formatDistanceToNow(new Date(feature.created_at))} ago</span>
      </div>
    </>
  );
}
