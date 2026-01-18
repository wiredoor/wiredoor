import { QueryRunner } from 'typeorm';

export const hasIndex = async (
  queryRunner: QueryRunner,
  tableName: string,
  fieldName: string,
): Promise<boolean> => {
  const indexList: Array<{ name: string; unique: number }> =
    await queryRunner.query(`PRAGMA index_list('${tableName}');`);

  let hasIndex = false;
  for (const idx of indexList) {
    if (idx.unique !== 1) continue;
    const info: Array<{ name: string }> = await queryRunner.query(
      `PRAGMA index_info('${idx.name}');`,
    );
    const names = info.map((i) => i.name);
    if (names.length === 1 && names[0] === fieldName) {
      hasIndex = true;
      break;
    }
  }

  return hasIndex;
};

export const addColumnIfMissing = async (
  queryRunner: QueryRunner,
  tableName: string,
  sqlFragment: string,
  name: string,
  normalizeDefault?: string,
): Promise<void> => {
  const cols: Array<{ name: string }> = await queryRunner.query(
    `PRAGMA table_info('${tableName}');`,
  );
  const have = new Set(cols.map((c) => c.name));
  if (!have.has(name)) {
    await queryRunner.query(
      `ALTER TABLE "${tableName}" ADD COLUMN ${sqlFragment};`,
    );
    if (normalizeDefault) {
      await queryRunner.query(`
        UPDATE "${tableName}" SET "${name}" = ${normalizeDefault}
        WHERE "${name}" IS NULL;
      `);
    }
  }
};
