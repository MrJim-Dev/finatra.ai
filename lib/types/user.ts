export type UserData = {
  id: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  billing_address: object;
  payment_method: object;
  email: string;
  role: string;
  avatar_url?: string;
};