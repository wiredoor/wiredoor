export interface FilterQueryDto {
  id?: number;
  page?: number;
  limit?: number;
  orderBy?: string;
  relations?: string[];
  [field: string]: string | string[] | number | undefined;
}

export interface PagedData<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
