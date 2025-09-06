export type Portfolio = {
  id: string;
  user_id: string;
  port_id: string;
  title: string;
  icon: {
    type: 'icon' | 'emoji';
    value: string;
  };
  color: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type CreatePortfolio = {
  title: string;
  icon?: { type: 'icon' | 'emoji'; value: string };
  color?: string;
};

export type UpdatePortfolio = Partial<CreatePortfolio>;
