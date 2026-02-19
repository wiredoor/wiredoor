import { SelectQueryBuilder } from 'typeorm';
import BaseRepository from '../base-repository';

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

export abstract class RepositoryQueryFilter<T, R extends BaseRepository<T>> {
  protected filters: FilterQueryDto;
  protected builder: SelectQueryBuilder<T>;

  constructor(protected repository: R) {}

  private initBuilder(): void {
    this.builder = this.repository.createQueryBuilder();
  }

  public before(): void {
    // To use if necessary in child classes
  }

  protected allowedRelations(): string[] {
    return [];
  }

  public async apply(filters: FilterQueryDto): Promise<T | T[] | PagedData<T>> {
    this.filters = filters;
    this.initBuilder();

    this.before();

    this.applyRelations();

    for (const [method, arg] of Object.entries(this.filters)) {
      if (typeof this[method] === 'function') {
        this.builder = await this[method](arg);
      }
    }

    this.applyOrdering();

    return this.finish();
  }

  protected applyRelations(): void {
    const allowed = this.allowedRelations();
    const relations = this.filters.relations;

    if (Array.isArray(relations) && relations.length > 0) {
      for (const relation of relations) {
        if (allowed.includes(relation)) {
          this.builder = this.builder.leftJoinAndSelect(
            `${this.builder.alias}.${relation}`,
            relation,
          );
        }
      }
    }
  }

  protected applyOrdering(): void {
    const orderBy = this.filters.orderBy as string;

    if (orderBy) {
      this.builder = this.builder.orderBy(
        `${this.builder.alias}.${orderBy.split(',')[0]}`,
        orderBy.split(',')[1].toUpperCase() as 'ASC' | 'DESC',
      );
    }
  }

  protected async finish(): Promise<T | T[] | PagedData<T>> {
    if (this.filters.id) {
      return this.builder.getOne();
    } else if (this.filters.limit) {
      const page = +this.filters?.page || 1;
      const limit = +this.filters?.limit || 12;
      const offset = (page - 1) * limit;

      const [data, total] = await this.builder
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      return {
        data,
        page,
        limit,
        total,
      };
    }
    return this.builder.getMany();
  }
}
