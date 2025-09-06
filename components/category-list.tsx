'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, Plus } from 'lucide-react';
import { NewAccountButton } from '@/components/new-account-button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createCategory, updateCategory, deleteCategory } from '@/lib/api/finance';
import { useParams, useRouter } from 'next/navigation';
import { getPortfolioBySlug } from '@/lib/portfolio';
import { CategoryDialog } from './category-dialog';
import { CategorySection } from './category-section';

type Category = {
  category_id: string;
  name: string;
  type: 'income' | 'expense';
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
  categoryViewData: CategoryViewData[];
}

// Add form schema
const formSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
});

export function CategoryList({ categoryViewData }: CategoryListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>(
    'income'
  );
  const [editingCategory, setEditingCategory] = useState<{
    id: number;
    name: string;
  } | null>(null);
  
  const params = useParams();
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<any>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (params.slug) {
        const portfolioData = await getPortfolioBySlug(params.slug as string);
        setPortfolio(portfolioData);
      }
    };
    fetchPortfolio();
  }, [params.slug]);

  const handleAddClick = (
    parentId: number | null,
    type: 'income' | 'expense'
  ) => {
    setSelectedParentId(parentId);
    setSelectedType(type);
    setIsDialogOpen(true);
  };

  const handleEditClick = (category: { id: number; name: string }) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

    const handleDeleteClick = async (categoryId: number) => {
    try {
      await deleteCategory(categoryId);
      router.refresh();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingCategory) {
        // Update existing category
        await updateCategory(editingCategory.id, { name: values.name });
        
      } else {
        // Create new category
        await createCategory({ name: values.name, parent_id: selectedParentId, port_id: portfolio?.port_id, type: selectedType });
        
      }

      router.refresh();
      setIsDialogOpen(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Categories</h2>
      </div>

      <div className="space-y-4">
        <CategorySection
          categoryData={categoryViewData.find((d) => d.type === 'income')}
          type="income"
          onAddClick={(parentId) => handleAddClick(parentId, 'income')}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
        />
        <CategorySection
          categoryData={categoryViewData.find((d) => d.type === 'expense')}
          type="expense"
          onAddClick={(parentId) => handleAddClick(parentId, 'expense')}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
        />
      </div>

      <CategoryDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingCategory(null);
        }}
        onSubmit={onSubmit}
        type={selectedType}
        mode={editingCategory ? 'edit' : 'create'}
        initialData={editingCategory || undefined}
      />
    </div>
  );
}



