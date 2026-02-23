import { z } from "zod";

export const columnTypes = [
  "uuid", "integer", "serial", "text", "varchar", "boolean", "timestamp", "date", "json", "jsonb", "real", "double precision"
] as const;

export const ColumnSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(columnTypes),
  isPrimaryKey: z.boolean().default(false),
  isNotNull: z.boolean().default(false),
  isUnique: z.boolean().default(false),
});

export const TableSchema = z.object({
  id: z.string(),
  name: z.string(),
  columns: z.array(ColumnSchema),
  position: z.object({
    x: z.number(),
    y: z.number()
  })
});

export const RelationSchema = z.object({
  id: z.string(),
  fromTableId: z.string(),
  fromColumnId: z.string(),
  toTableId: z.string(),
  toColumnId: z.string(),
});

export const DatabaseSchemaSchema = z.object({
  tables: z.array(TableSchema),
  relations: z.array(RelationSchema)
});

export type ColumnType = typeof columnTypes[number];
export type Column = z.infer<typeof ColumnSchema>;
export type Table = z.infer<typeof TableSchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type DatabaseSchema = z.infer<typeof DatabaseSchemaSchema>;
