export type BaseEntity = {
  id: number;
  createdAt: number;
  updatedAt: number;
};

export type Entity<T> = {
  [K in keyof T]: T[K];
} & BaseEntity;

export type Meta = {
  page: number;
  total: number;
  totalPages: number;
};

export type User = Entity<{
  name: string;
  email: string;
  role: string;
}>;

export type AuthResponse = {
  jwt: string;
  user: User;
};

export interface FilterQueryDto {
  id?: number;
  page?: number;
  limit?: number;
  orderBy?: string;
  relations?: string[];
  [field: string]: string | string[] | number | undefined;
}

export interface NodeFilterQueryParams extends FilterQueryDto {
  search?: string;
  status?: 'online' | 'iddle' | 'offline';
  type?: 'nodes' | 'gateways';
}

export interface PagedData<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
