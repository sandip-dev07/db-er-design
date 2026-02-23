import React from 'react';
import { DatabaseSchema } from '@/lib/schema-types';
import { Button } from '@/components/ui/button';
import { Plus, Database, Table2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  schema: DatabaseSchema;
  onAddTable: () => void;
  onEditTable: (tableId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ schema, onAddTable, onEditTable }) => {
  return (
    <div className="w-64 border-r border-border bg-background/90 backdrop-blur-xl flex flex-col h-full z-20 shadow-xl shadow-black/10 dark:shadow-black">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <div className="bg-card p-2 rounded-lg border border-border">
          <Database size={16} className="text-foreground" />
        </div>
        <h1 className="font-semibold text-lg text-foreground tracking-tight">DB Designer</h1>
      </div>

      <div className="p-4">
        <Button 
          onClick={onAddTable} 
          className="w-full justify-start bg-card text-foreground hover:bg-accent border border-border shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus size={16} className="mr-2" /> New Table
        </Button>
      </div>

      <div className="px-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Tables ({schema.tables.length})
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-4">
          {schema.tables.map(table => (
            <button
              key={table.id}
              onClick={() => onEditTable(table.id)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-left transition-colors group border border-transparent hover:border-border"
            >
              <Table2 size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="font-mono text-sm text-foreground truncate">{table.name}</span>
            </button>
          ))}
          {schema.tables.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm italic px-4">
              Click 'New Table' to start building your schema.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
