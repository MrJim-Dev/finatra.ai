// New reusable category section component
import { Button } from '@/components/ui/button';
import { ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CategorySectionProps {
  categoryData?: CategoryViewData;
  type: 'income' | 'expense';
  onAddClick: (parentId: number | null) => void;
  onEditClick: (category: { id: number; name: string }) => void;
  onDeleteClick: (categoryId: number) => void;
}

export function CategorySection({
  categoryData,
  type,
  onAddClick,
  onEditClick,
  onDeleteClick,
}: CategorySectionProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);

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
      <div key={category.id}>
        <div
          className={`group px-4 py-2.5 ${
            depth === 0 ? 'bg-muted/30' : 'bg-muted/10'
          } hover:bg-muted/50 transition-colors cursor-pointer`}
          style={{ paddingLeft: `${depth * 1 + 1}rem` }}
          onClick={() => toggleCategory(category.id.toString())}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 flex-1">
              {category.subcategories && category.subcategories.length > 0 && (
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    expandedCategories.has(category.id.toString())
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
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick({ id: category.id, name: category.name });
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  setCategoryToDelete(category.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddClick(category.id);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {category.subcategories &&
          expandedCategories.has(category.id.toString()) && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              {renderCategories(category.subcategories, depth + 1)}
            </div>
          )}
      </div>
    ));
  };

  return (
    <>
      <div className="rounded-lg bg-card overflow-hidden border">
        <div className="px-4 py-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onAddClick(null)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="divide-y divide-border bg-card">
          {categoryData && renderCategories(categoryData.categories)}
        </div>
      </div>

      <AlertDialog
        open={categoryToDelete !== null}
        onOpenChange={() => setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              category and all its subcategories.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (categoryToDelete) {
                  onDeleteClick(categoryToDelete);
                  setCategoryToDelete(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
