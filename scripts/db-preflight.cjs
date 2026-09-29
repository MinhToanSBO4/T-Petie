const { loadEnvConfig } = require('@next/env');
const { PrismaClient, Prisma } = require('@prisma/client');

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

async function main() {
  const context = await prisma.$queryRawUnsafe("SELECT current_schema() AS schema, current_setting('search_path') AS search_path");
  const schema = context[0].schema;
  console.log(`connection_schema=${schema}; search_path=${context[0].search_path}`);
  const columns = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
    ORDER BY table_name, ordinal_position
  `);
  const actual = new Map();
  for (const row of columns) {
    if (!actual.has(row.table_name)) actual.set(row.table_name, new Map());
    actual.get(row.table_name).set(row.column_name, row.data_type);
  }
  const expected = new Map();
  for (const model of Prisma.dmmf.datamodel.models) {
    const table = model.dbName || model.name;
    const scalarFields = model.fields.filter((field) => field.kind === 'scalar');
    expected.set(table, scalarFields.map((field) => field.dbName || field.name));
  }
  for (const [table, fields] of expected) {
    const present = actual.get(table);
    if (!present) {
      console.log(`${table}: MISSING TABLE`);
      continue;
    }
    const missing = fields.filter((field) => !present.has(field));
    let count = 'unknown';
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${schema.replaceAll('"', '""')}"."${table.replaceAll('"', '""')}"`);
      count = result[0].count;
    } catch (error) {
      count = `unavailable (${error.code || 'query error'})`;
    }
    console.log(`${table}: rows=${count}; missing_columns=${missing.length ? missing.join(',') : 'none'}`);
  }
  const extra = [...actual.keys()].filter((table) => !expected.has(table) && !table.startsWith('_'));
  for (const table of extra) {
    const result = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${schema.replaceAll('"', '""')}"."${table.replaceAll('"', '""')}"`);
    console.log(`${table}: additional table; rows=${result[0].count}`);
  }
}

main().catch((error) => {
  console.error('Preflight failed:', error.code || error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
