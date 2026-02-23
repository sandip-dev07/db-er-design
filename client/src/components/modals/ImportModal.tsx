import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { parseSqlToSchema } from "@/lib/sql-importer";
import { DatabaseSchema } from "@/lib/schema-types";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (schema: DatabaseSchema, mode: "replace" | "merge") => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [sql, setSql] = useState("");
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  const handleImport = () => {
    try {
      const parsed = parseSqlToSchema(sql);
      if (parsed.tables.length === 0) {
        setError("No CREATE TABLE statements were found. Paste a SQL schema and try again.");
        return;
      }

      setError(null);
      onImport(parsed, mode);
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to parse SQL schema.";
      setError(message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Import Schema</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Paste SQL with CREATE TABLE and optional FOREIGN KEY statements.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="import-sql">SQL</Label>
            <Textarea
              id="import-sql"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder={'CREATE TABLE "users" (\n  "id" UUID PRIMARY KEY,\n  "email" VARCHAR UNIQUE\n);'}
              className="min-h-[360px] bg-card border-border font-mono text-sm text-foreground"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-foreground">
            <Label className="text-muted-foreground">Mode:</Label>
            <Button
              type="button"
              size="sm"
              variant={mode === "replace" ? "default" : "outline"}
              className={mode === "replace" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-border bg-card hover:bg-accent"}
              onClick={() => setMode("replace")}
            >
              Replace canvas
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "merge" ? "default" : "outline"}
              className={mode === "merge" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-border bg-card hover:bg-accent"}
              onClick={() => setMode("merge")}
            >
              Merge with existing
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="hover:bg-accent">
            Cancel
          </Button>
          <Button onClick={handleImport} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Import SQL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
