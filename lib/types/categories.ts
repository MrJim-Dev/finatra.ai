export type Category = {
  id: number;
  name: string;
  subcategories: Category[];
};

export type CategoryViewData = {
  type: 'income' | 'expense';
  port_id: string;
  categories: Category[];
};
