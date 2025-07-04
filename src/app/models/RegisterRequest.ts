export interface RegisterRequest {
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'ADMIN' | 'MODERADOR' | 'LECTOR';
}
