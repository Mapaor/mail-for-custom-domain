export interface Profile {
  id: string;
  alias: string;
  email: string;
  forward_to: string | null;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  profile: Profile;
}
