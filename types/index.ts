export interface Account {
  account_id: string;
  name: string;
  currency?: string | null;
  in_total?: boolean | null;
  hidden?: boolean | null;
}

export interface Category {
  name: string;
  subcategories?: Category[];
}

export interface CategoryView {
  type: 'income' | 'expense';
  port_id: string;
  categories: Category[];
}

export interface Option {
  label: string;
  value: string;
  children?: Option[];
} 