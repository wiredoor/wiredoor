import {
  DataSource,
  DeepPartial,
  DeleteResult,
  EntityManager,
  EntityTarget,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  InsertResult,
  ObjectLiteral,
  RemoveOptions,
  Repository,
  SaveOptions,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';

export default class BaseRepository<T extends ObjectLiteral> {
  protected readonly entity: EntityTarget<T>;
  protected readonly ds: DataSource;

  constructor(entity: EntityTarget<T>, dataSource: DataSource) {
    this.entity = entity;
    this.ds = dataSource;
  }

  protected repo(manager?: EntityManager): Repository<T> {
    if (manager) return manager.getRepository(this.entity);
    return this.ds.getRepository(this.entity);
  }

  async transaction<R>(fn: (manager: EntityManager) => Promise<R>): Promise<R> {
    return this.ds.transaction(fn);
  }

  create(partial?: DeepPartial<T>): T {
    return this.repo().create(partial);
  }

  // merge data into an existing entity. does not save to the database
  merge(entity: T, ...sources: DeepPartial<T>[]): T {
    return this.repo().merge(entity, ...sources);
  }

  createQueryBuilder(
    alias?: string,
    manager?: EntityManager,
  ): SelectQueryBuilder<T> {
    return this.repo(manager).createQueryBuilder(
      alias || this.entity.toString().toLowerCase(),
    );
  }

  async findById(
    id: number | string,
    manager?: EntityManager,
  ): Promise<T | null> {
    return this.repo(manager).findOne({
      where: { id },
    } as unknown as FindOneOptions<T>);
  }

  async findOne(
    options: FindOneOptions<T>,
    manager?: EntityManager,
  ): Promise<T | null> {
    return this.repo(manager).findOne(options);
  }

  async findOneBy(
    where: FindOptionsWhere<T>,
    manager?: EntityManager,
  ): Promise<T | null> {
    return this.repo(manager).findOneBy(where);
  }

  async find(
    options?: FindManyOptions<T>,
    manager?: EntityManager,
  ): Promise<T[]> {
    return this.repo(manager).find(options);
  }

  async findBy(
    where: FindOptionsWhere<T>,
    manager?: EntityManager,
  ): Promise<T[]> {
    return this.repo(manager).findBy(where);
  }

  async findAndCount(
    options?: FindManyOptions<T>,
    manager?: EntityManager,
  ): Promise<[T[], number]> {
    return this.repo(manager).findAndCount(options);
  }

  async findAndCountBy(
    where: FindOptionsWhere<T>,
    manager?: EntityManager,
  ): Promise<[T[], number]> {
    return this.repo(manager).findAndCountBy(where);
  }

  async count(
    options?: FindManyOptions<T>,
    manager?: EntityManager,
  ): Promise<number> {
    return this.repo(manager).count(options);
  }

  async countBy(
    where: FindOptionsWhere<T>,
    manager?: EntityManager,
  ): Promise<number> {
    return this.repo(manager).countBy(where);
  }

  async exists(
    options?: FindManyOptions<T>,
    manager?: EntityManager,
  ): Promise<boolean> {
    return this.repo(manager).exists(options);
  }

  async existsBy(
    where: FindOptionsWhere<T>,
    manager?: EntityManager,
  ): Promise<boolean> {
    return this.repo(manager).existsBy(where);
  }

  async save(entity: Partial<T>, manager?: EntityManager): Promise<T> {
    return this.repo(manager).save(entity as T);
  }

  async saveMany(
    entities: DeepPartial<T>[],
    options?: SaveOptions,
    manager?: EntityManager,
  ): Promise<T[]> {
    return this.repo(manager).save(entities, options);
  }

  // insert does not check for existing entities and is faster than save, but does not trigger entity listeners or subscribers
  async insert(
    entity: DeepPartial<T>,
    manager?: EntityManager,
  ): Promise<InsertResult> {
    return this.repo(manager).insert(entity as any);
  }

  async insertMany(
    entities: DeepPartial<T>[],
    manager?: EntityManager,
  ): Promise<InsertResult> {
    return this.repo(manager).insert(entities as any);
  }

  // update does not check for existing entities and is faster than save, but does not trigger entity listeners or subscribers
  // it uses QueryBuilder and does not support all features of the regular update method, such as cascades or relations
  async update(
    where: FindOptionsWhere<T>,
    partial: DeepPartial<T>,
    manager?: EntityManager,
  ): Promise<UpdateResult> {
    return this.repo(manager).update(where, partial as any);
  }

  async delete(
    where: number | string | FindOptionsWhere<T>,
    manager?: EntityManager,
  ): Promise<DeleteResult> {
    return this.repo(manager).delete(where);
  }

  // remove checks for existing entities and is slower than delete, but triggers entity listeners and subscribers
  async remove(
    entity: T,
    options?: RemoveOptions,
    manager?: EntityManager,
  ): Promise<T> {
    return this.repo(manager).remove(entity, options);
  }

  async removeMany(
    entities: T[],
    options?: RemoveOptions,
    manager?: EntityManager,
  ): Promise<T[]> {
    return this.repo(manager).remove(entities, options);
  }

  // ----------------------------------------------------------------
  // Aggregate
  // ----------------------------------------------------------------
  async sum(
    columnName: keyof T,
    where: FindOptionsWhere<T>,
    manager?: EntityManager,
  ): Promise<number | null> {
    return this.repo(manager).sum(columnName as any, where);
  }

  async average(
    columnName: keyof T,
    where: FindOptionsWhere<T>,
    manager?: EntityManager,
  ): Promise<number | null> {
    return this.repo(manager).average(columnName as any, where);
  }

  async minimum(
    columnName: keyof T,
    where: FindOptionsWhere<T>,
    manager?: EntityManager,
  ): Promise<number | null> {
    return this.repo(manager).minimum(columnName as any, where);
  }

  async maximum(
    columnName: keyof T,
    where: FindOptionsWhere<T>,
    manager?: EntityManager,
  ): Promise<number | null> {
    return this.repo(manager).maximum(columnName as any, where);
  }

  // clears all records from the table. use with caution.
  // used for testing purposes to reset the state of the database between tests
  async clear(manager?: EntityManager): Promise<void> {
    return this.repo(manager).clear();
  }
}
