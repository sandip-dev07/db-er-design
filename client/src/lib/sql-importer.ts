import { v4 as uuidv4 } from "uuid";
import { Column, ColumnType, DatabaseSchema, Relation, Table, columnTypes } from "./schema-types";

type ParsedForeignKey = {
  fromTableName: string;
  fromColumnName: string;
  toTableName: string;
  toColumnName: string;
};

const typeSet = new Set<string>(columnTypes);

function stripSqlComments(sql: string): string {
  const withoutBlockComments = sql.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlockComments.replace(/--.*$/gm, "");
}

function unquoteIdentifier(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function normalizeTableName(rawName: string): string {
  const cleaned = rawName.trim();
  const withoutSchema = cleaned.includes(".") ? cleaned.split(".").pop() || cleaned : cleaned;
  return unquoteIdentifier(withoutSchema).toLowerCase();
}

function splitTopLevelComma(input: string): string[] {
  const parts: string[] = [];
  let buffer = "";
  let depth = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const prev = i > 0 ? input[i - 1] : "";

    if (ch === "'" && !inDouble && prev !== "\\") {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle && prev !== "\\") {
      inDouble = !inDouble;
    }

    if (!inSingle && !inDouble) {
      if (ch === "(") depth += 1;
      if (ch === ")") depth = Math.max(0, depth - 1);
    }

    if (ch === "," && depth === 0 && !inSingle && !inDouble) {
      if (buffer.trim()) parts.push(buffer.trim());
      buffer = "";
      continue;
    }

    buffer += ch;
  }

  if (buffer.trim()) parts.push(buffer.trim());
  return parts;
}

function parseReferencedColumns(definition: string): string[] {
  const match = definition.match(/\(([^)]+)\)/);
  if (!match) return [];

  return splitTopLevelComma(match[1]).map((name) => unquoteIdentifier(name).toLowerCase());
}

function normalizeColumnType(rawType: string): ColumnType {
  const normalized = rawType.trim().toLowerCase().replace(/\s+/g, " ");

  if (typeSet.has(normalized)) return normalized as ColumnType;
  if (normalized.startsWith("character varying") || normalized.startsWith("varchar") || normalized.startsWith("char")) return "varchar";
  if (normalized.startsWith("uuid")) return "uuid";
  if (normalized.startsWith("serial") || normalized.startsWith("bigserial") || normalized.startsWith("smallserial")) return "serial";
  if (normalized.startsWith("int") || normalized.startsWith("integer") || normalized.startsWith("bigint") || normalized.startsWith("smallint")) return "integer";
  if (normalized.startsWith("text")) return "text";
  if (normalized.startsWith("bool")) return "boolean";
  if (normalized.startsWith("timestamp")) return "timestamp";
  if (normalized.startsWith("date")) return "date";
  if (normalized.startsWith("jsonb")) return "jsonb";
  if (normalized.startsWith("json")) return "json";
  if (normalized.startsWith("real") || normalized.startsWith("float4")) return "real";
  if (normalized.startsWith("double precision") || normalized.startsWith("float8") || normalized.startsWith("decimal") || normalized.startsWith("numeric")) {
    return "double precision";
  }

  return "text";
}

function parseColumnDefinition(definition: string): Column | null {
  const trimmed = definition.trim();
  const nameMatch = trimmed.match(/^("([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([a-zA-Z_][\w$]*))\s+(.+)$/);
  if (!nameMatch) return null;

  const rawName = nameMatch[1];
  const remainder = nameMatch[6];
  const lowerRemainder = remainder.toLowerCase();

  const keywordMatch = remainder.match(/\s+(primary\s+key|not\s+null|unique|default|references|constraint|check|generated|collate)\b/i);
  const rawType = keywordMatch ? remainder.slice(0, keywordMatch.index).trim() : remainder.trim();

  return {
    id: uuidv4(),
    name: unquoteIdentifier(rawName).toLowerCase(),
    type: normalizeColumnType(rawType),
    isPrimaryKey: /\bprimary\s+key\b/i.test(lowerRemainder),
    isNotNull: /\bnot\s+null\b/i.test(lowerRemainder) || /\bprimary\s+key\b/i.test(lowerRemainder),
    isUnique: /\bunique\b/i.test(lowerRemainder) || /\bprimary\s+key\b/i.test(lowerRemainder),
  };
}

function parseCreateTable(sql: string): { table: Table; foreignKeys: ParsedForeignKey[] } | null {
  const createMatch = sql.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([^\s(]+)\s*\(([\s\S]+)\)\s*$/i);
  if (!createMatch) return null;

  const tableName = normalizeTableName(createMatch[1]);
  const body = createMatch[2];
  const definitions = splitTopLevelComma(body);

  const columns: Column[] = [];
  const tablePrimaryColumns = new Set<string>();
  const tableUniqueColumns = new Set<string>();
  const foreignKeys: ParsedForeignKey[] = [];

  definitions.forEach((definition) => {
    const lower = definition.toLowerCase();

    const tablePkMatch = lower.match(/^(?:constraint\s+[^\s]+\s+)?primary\s+key\s*\(([^)]+)\)/i);
    if (tablePkMatch) {
      parseReferencedColumns(tablePkMatch[0]).forEach((name) => tablePrimaryColumns.add(name));
      return;
    }

    const tableUniqueMatch = lower.match(/^(?:constraint\s+[^\s]+\s+)?unique\s*\(([^)]+)\)/i);
    if (tableUniqueMatch) {
      parseReferencedColumns(tableUniqueMatch[0]).forEach((name) => tableUniqueColumns.add(name));
      return;
    }

    const fkMatch = definition.match(
      /^(?:constraint\s+[^\s]+\s+)?foreign\s+key\s*\(([^)]+)\)\s+references\s+([^\s(]+)\s*\(([^)]+)\)/i
    );
    if (fkMatch) {
      const fromColumns = splitTopLevelComma(fkMatch[1]).map((name) => unquoteIdentifier(name).toLowerCase());
      const toColumns = splitTopLevelComma(fkMatch[3]).map((name) => unquoteIdentifier(name).toLowerCase());
      const toTable = normalizeTableName(fkMatch[2]);

      if (fromColumns.length === 1 && toColumns.length === 1) {
        foreignKeys.push({
          fromTableName: tableName,
          fromColumnName: fromColumns[0],
          toTableName: toTable,
          toColumnName: toColumns[0],
        });
      }
      return;
    }

    const column = parseColumnDefinition(definition);
    if (column) columns.push(column);
  });

  const normalizedColumns = columns.map((column) => {
    const isPk = tablePrimaryColumns.has(column.name) || column.isPrimaryKey;
    const isUnique = tableUniqueColumns.has(column.name) || column.isUnique || isPk;
    return {
      ...column,
      isPrimaryKey: isPk,
      isUnique,
      isNotNull: column.isNotNull || isPk,
    };
  });

  return {
    table: {
      id: uuidv4(),
      name: tableName,
      columns: normalizedColumns,
      position: { x: 0, y: 0 },
    },
    foreignKeys,
  };
}

function parseAlterTableForeignKey(sql: string): ParsedForeignKey | null {
  const match = sql.match(
    /alter\s+table\s+([^\s]+)\s+(?:add\s+(?:constraint\s+[^\s]+\s+)?)?foreign\s+key\s*\(([^)]+)\)\s+references\s+([^\s(]+)\s*\(([^)]+)\)/i
  );
  if (!match) return null;

  const fromColumns = splitTopLevelComma(match[2]).map((name) => unquoteIdentifier(name).toLowerCase());
  const toColumns = splitTopLevelComma(match[4]).map((name) => unquoteIdentifier(name).toLowerCase());
  if (fromColumns.length !== 1 || toColumns.length !== 1) return null;

  return {
    fromTableName: normalizeTableName(match[1]),
    fromColumnName: fromColumns[0],
    toTableName: normalizeTableName(match[3]),
    toColumnName: toColumns[0],
  };
}

function buildTablePositions(tables: Table[]): Table[] {
  const startX = 100;
  const startY = 100;
  const columnCount = 4;
  const xGap = 360;
  const yGap = 280;

  return tables.map((table, index) => {
    const x = startX + (index % columnCount) * xGap;
    const y = startY + Math.floor(index / columnCount) * yGap;
    return {
      ...table,
      position: { x, y },
    };
  });
}

function buildRelations(tables: Table[], foreignKeys: ParsedForeignKey[]): Relation[] {
  const tableByName = new Map<string, Table>();
  tables.forEach((table) => tableByName.set(table.name.toLowerCase(), table));

  const relations: Relation[] = [];

  foreignKeys.forEach((fk) => {
    const fromTable = tableByName.get(fk.fromTableName.toLowerCase());
    const toTable = tableByName.get(fk.toTableName.toLowerCase());
    if (!fromTable || !toTable) return;

    const fromColumn = fromTable.columns.find((column) => column.name.toLowerCase() === fk.fromColumnName.toLowerCase());
    const toColumn = toTable.columns.find((column) => column.name.toLowerCase() === fk.toColumnName.toLowerCase());
    if (!fromColumn || !toColumn) return;

    const exists = relations.some((relation) => {
      return (
        relation.fromTableId === fromTable.id &&
        relation.fromColumnId === fromColumn.id &&
        relation.toTableId === toTable.id &&
        relation.toColumnId === toColumn.id
      );
    });

    if (!exists) {
      relations.push({
        id: uuidv4(),
        fromTableId: fromTable.id,
        fromColumnId: fromColumn.id,
        toTableId: toTable.id,
        toColumnId: toColumn.id,
        type: fromColumn.isUnique ? "1:1" : "1:N",
      });
    }
  });

  return relations;
}

export function parseSqlToSchema(sql: string): DatabaseSchema {
  const cleaned = stripSqlComments(sql).trim();
  if (!cleaned) {
    return { tables: [], relations: [] };
  }

  const statements = cleaned
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  const tables: Table[] = [];
  const foreignKeys: ParsedForeignKey[] = [];

  statements.forEach((statement) => {
    const createTable = parseCreateTable(statement);
    if (createTable) {
      tables.push(createTable.table);
      foreignKeys.push(...createTable.foreignKeys);
      return;
    }

    const alterTableFk = parseAlterTableForeignKey(statement);
    if (alterTableFk) {
      foreignKeys.push(alterTableFk);
    }
  });

  const positionedTables = buildTablePositions(tables);
  return {
    tables: positionedTables,
    relations: buildRelations(positionedTables, foreignKeys),
  };
}
