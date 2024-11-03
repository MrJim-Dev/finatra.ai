type Category = {
  id: number;
  name: string;
  subcategories: Category[];
};

type CategoryViewData = {
  type: 'income' | 'expense';
  port_id: string;
  categories: Category[];
};

interface CategoryListProps {
  categoryViewData: CategoryViewData[];
}