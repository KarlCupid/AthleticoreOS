#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');

function normalizeIdentifier(identifier) {
  return identifier.replace(/"/g, '').toLowerCase();
}

function stripLineComments(sql) {
  return sql.replace(/--.*$/gm, '');
}

function splitTopLevel(sql) {
  const parts = [];
  let current = '';
  let depth = 0;
  let inSingleQuote = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const previous = sql[index - 1];

    if (char === "'" && previous !== '\\') {
      inSingleQuote = !inSingleQuote;
    }

    if (!inSingleQuote) {
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;
      if (char === ',' && depth === 0) {
        if (current.trim()) parts.push(current.trim());
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function ensureTable(tables, tableName) {
  const normalized = normalizeIdentifier(tableName);
  if (!tables.has(normalized)) {
    tables.set(normalized, {
      columns: new Set(),
      refs: [],
      dropped: false,
    });
  }
  return tables.get(normalized);
}

function parseReference(definition, columnName) {
  const reference = definition.match(
    /REFERENCES\s+(public|auth)\."?([A-Za-z_][\w]*)"?\s*(?:\(([^)]*)\))?([\s\S]*)/i,
  );
  if (!reference) return null;

  const tail = reference[4] || '';
  let onDelete = '';
  if (/ON\s+DELETE\s+CASCADE/i.test(tail)) onDelete = 'cascade';
  if (/ON\s+DELETE\s+SET\s+NULL/i.test(tail)) onDelete = 'set null';

  return {
    column: normalizeIdentifier(columnName),
    schema: reference[1].toLowerCase(),
    table: normalizeIdentifier(reference[2]),
    onDelete,
  };
}

function parseForeignKeyConstraint(definition) {
  const foreignKey = definition.match(
    /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+(public|auth)\."?([A-Za-z_][\w]*)"?\s*\(([^)]*)\)([\s\S]*)/i,
  );
  if (!foreignKey) return [];

  const tail = foreignKey[5] || '';
  let onDelete = '';
  if (/ON\s+DELETE\s+CASCADE/i.test(tail)) onDelete = 'cascade';
  if (/ON\s+DELETE\s+SET\s+NULL/i.test(tail)) onDelete = 'set null';

  return foreignKey[1].split(',').map((column) => ({
    column: normalizeIdentifier(column.trim()),
    schema: foreignKey[2].toLowerCase(),
    table: normalizeIdentifier(foreignKey[3]),
    onDelete,
  }));
}

function parseCreateTable(tables, sql) {
  const createTablePattern =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\."?([A-Za-z_][\w]*)"?\s*\(([\s\S]*?)\);/gi;

  for (const match of sql.matchAll(createTablePattern)) {
    const table = ensureTable(tables, match[1]);
    table.dropped = false;

    for (const definition of splitTopLevel(match[2])) {
      const columnMatch = definition.match(/^"?([A-Za-z_][\w]*)"?\s+/);
      if (!columnMatch) continue;

      const firstToken = normalizeIdentifier(columnMatch[1]);
      if (['constraint', 'primary', 'foreign', 'unique', 'check'].includes(firstToken)) {
        table.refs.push(...parseForeignKeyConstraint(definition));
        continue;
      }

      table.columns.add(firstToken);
      const reference = parseReference(definition, firstToken);
      if (reference) table.refs.push(reference);
    }
  }
}

function parseAlterTable(tables, sql) {
  const alterTablePattern =
    /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?public\."?([A-Za-z_][\w]*)"?\s+([\s\S]*?);/gi;

  for (const match of sql.matchAll(alterTablePattern)) {
    const table = ensureTable(tables, match[1]);

    for (const clause of splitTopLevel(match[2])) {
      const addColumn = clause.match(
        /ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z_][\w]*)"?\s+([\s\S]*)/i,
      );
      if (addColumn) {
        const columnName = normalizeIdentifier(addColumn[1]);
        table.columns.add(columnName);
        const reference = parseReference(addColumn[2], columnName);
        if (reference) table.refs.push(reference);
      }

      const dropColumn = clause.match(
        /DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?"?([A-Za-z_][\w]*)"?/i,
      );
      if (dropColumn) {
        table.columns.delete(normalizeIdentifier(dropColumn[1]));
      }

      table.refs.push(...parseForeignKeyConstraint(clause));
    }
  }
}

function parseDropTable(tables, sql) {
  const dropTablePattern = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?public\."?([A-Za-z_][\w]*)"?/gi;
  for (const match of sql.matchAll(dropTablePattern)) {
    ensureTable(tables, match[1]).dropped = true;
  }
}

function parseSchemaFromMigrations(files) {
  const tables = new Map();

  for (const filePath of files) {
    const sql = stripLineComments(fs.readFileSync(filePath, 'utf8'));
    parseCreateTable(tables, sql);
    parseAlterTable(tables, sql);
    parseDropTable(tables, sql);
  }

  return tables;
}

function isDirectlyUserOwned(tableName, table) {
  if (tableName === 'users') return true;
  if (table.columns.has('user_id') || table.columns.has('owner_id')) return true;

  return table.refs.some((reference) => {
    if (reference.schema === 'auth' && reference.table === 'users') return true;
    if (reference.schema !== 'public' || reference.table !== 'users') return false;
    return ['id', 'user_id', 'owner_id', 'athlete_id'].includes(reference.column);
  });
}

function findUserOwnedTables(tables) {
  const existingTables = [...tables.entries()].filter(([, table]) => !table.dropped);
  const ownedTables = new Set();

  for (const [tableName, table] of existingTables) {
    if (isDirectlyUserOwned(tableName, table)) ownedTables.add(tableName);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const [tableName, table] of existingTables) {
      if (ownedTables.has(tableName)) continue;
      if (table.refs.some((reference) => reference.table !== 'users' && ownedTables.has(reference.table))) {
        ownedTables.add(tableName);
        changed = true;
      }
    }
  }

  return ownedTables;
}

function extractLatestDeleteFunction(files) {
  const allSql = files.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
  const functionPattern =
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.delete_my_account\s*\(\)[\s\S]*?AS\s+\$\$([\s\S]*?)\$\$;/gi;
  const matches = [...allSql.matchAll(functionPattern)];
  if (matches.length === 0) {
    throw new Error('No public.delete_my_account() definition found in migrations.');
  }
  return matches[matches.length - 1][1];
}

function findDeletedPublicTables(functionBody) {
  const deletedTables = new Set();
  const deletePattern = /DELETE\s+FROM\s+public\."?([A-Za-z_][\w]*)"?/gi;
  for (const match of functionBody.matchAll(deletePattern)) {
    deletedTables.add(normalizeIdentifier(match[1]));
  }
  return deletedTables;
}

function hasCascadePathToDeletedTable(tableName, tables, deletedPublicTables, visited = new Set()) {
  if (visited.has(tableName)) return false;
  visited.add(tableName);

  const table = tables.get(tableName);
  if (!table) return false;

  return table.refs.some((reference) => {
    if (reference.onDelete !== 'cascade') return false;
    if (reference.schema === 'auth' && reference.table === 'users') return true;
    if (reference.schema !== 'public') return false;
    if (deletedPublicTables.has(reference.table)) return true;
    return hasCascadePathToDeletedTable(reference.table, tables, deletedPublicTables, visited);
  });
}

function main() {
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort()
    .map((fileName) => path.join(migrationsDir, fileName));

  const tables = parseSchemaFromMigrations(migrationFiles);
  const ownedTables = findUserOwnedTables(tables);
  const functionBody = extractLatestDeleteFunction(migrationFiles);
  const deletedPublicTables = findDeletedPublicTables(functionBody);
  const deletesAuthUser = /DELETE\s+FROM\s+auth\.users\b/i.test(functionBody);

  const missingCoverage = [...ownedTables]
    .filter((tableName) => {
      if (deletedPublicTables.has(tableName)) return false;
      return !hasCascadePathToDeletedTable(tableName, tables, deletedPublicTables);
    })
    .sort();

  const staticDeletes = [...deletedPublicTables]
    .filter((tableName) => !ownedTables.has(tableName))
    .sort();

  if (!deletesAuthUser || missingCoverage.length > 0 || staticDeletes.length > 0) {
    console.error('Account deletion coverage check failed.');
    if (!deletesAuthUser) {
      console.error('- delete_my_account() does not delete auth.users.');
    }
    if (missingCoverage.length > 0) {
      console.error('- User-owned tables missing deletion/cascade coverage:');
      for (const tableName of missingCoverage) console.error(`  - ${tableName}`);
    }
    if (staticDeletes.length > 0) {
      console.error('- delete_my_account() deletes tables that are not classified as user-owned:');
      for (const tableName of staticDeletes) console.error(`  - ${tableName}`);
    }
    process.exit(1);
  }

  console.log(
    `PASS account deletion coverage: ${ownedTables.size} user-owned public tables covered; auth.users deletion present.`,
  );
}

main();
