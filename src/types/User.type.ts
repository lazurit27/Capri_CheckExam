export interface User {
  id: string;
  name: string;
  mail: string;
  avatarUrl: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}