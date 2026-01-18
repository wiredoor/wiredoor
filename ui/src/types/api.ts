export type BaseEntity = {
  id: string;
  createdAt: number;
  updatedAt: number;
};

export type Entity<T> = {
  [K in keyof T]: T[K];
} & BaseEntity;

export type User = Entity<{
  name: string;
  email: string;
  role: string;
}>;

export type AuthResponse = {
  jwt: string;
  user: User;
};
