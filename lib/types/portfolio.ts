export type Portfolio = {
  id: number;
  user_id: string;
  port_id: string;
  title: string;
  icon: {
    type: 'icon' | 'emoji';
    value: string;
  };
  color: string;
  userid: string;
  created_at: string;
  updated_at: string;
};

// You might also want to create a type for creating a new portfolio
export type CreatePortfolio = Omit<
  Portfolio,
  'id' | 'created_at' | 'updated_at'
>;

// And a type for updating an existing portfolio
export type UpdatePortfolio = Partial<CreatePortfolio>;