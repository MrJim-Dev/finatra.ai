'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Plus } from 'lucide-react';
import { NewAccountButton } from '@/components/new-account-button';

type Category = {
  category_id: string;
  name: string;
  subcategories?: Category[];
  description?: string;
  created_at: string;
};

type CategoryGroup = {
  group_id: string;
  group_name: string;
  categories: Category[];
};

interface CategoryListProps {
  categoryGroups: CategoryGroup[];
}

export function CategoryList({ categoryGroups }: CategoryListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['1', '2'])
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const renderCategories = (categories: Category[], depth: number = 0) => {
    return categories.map((category) => (
      <div key={category.category_id}>
        <div
          className={`group px-4 py-2.5 ${
            depth === 0 ? 'bg-muted/30' : 'bg-muted/10'
          } hover:bg-muted/50 transition-colors cursor-pointer`}
          style={{ paddingLeft: `${depth * 1 + 1}rem` }}
          onClick={() => toggleCategory(category.category_id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-1">
              {category.subcategories && category.subcategories.length > 0 && (
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    expandedCategories.has(category.category_id)
                      ? 'rotate-90'
                      : ''
                  }`}
                />
              )}
              <span className={`text-sm ${depth === 0 ? 'font-medium' : ''}`}>
                {category.name}
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {category.subcategories &&
          expandedCategories.has(category.category_id) && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              {renderCategories(category.subcategories, depth + 1)}
            </div>
          )}
      </div>
    ));
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Categories</h2>
        <NewAccountButton />
      </div>

      <div className="space-y-4">
        {categoryGroups.map((group) => (
          <div
            key={group.group_id}
            className="rounded-lg bg-card overflow-hidden border"
          >
            <div className="px-4 py-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {group.group_name}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="divide-y divide-border bg-card">
              {renderCategories(group.categories)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
