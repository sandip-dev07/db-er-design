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
    <div className="w-64 border-r border-slate-800 bg-slate-950/80 backdrop-blur-xl flex flex-col h-full z-20 shadow-xl shadow-black">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <div className="bg-primary/20 p-2 rounded-lg border border-primary/30">
          <Database size={20} className="text-primary" />
        </div>
        <h1 className="font-bold text-lg text-slate-100 tracking-tight">DB Designer</h1>
      </div>

      <div className="p-4">
        <Button 
          onClick={onAddTable} 
          className="w-full justify-start bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus size={16} className="mr-2" /> New Table
        </Button>
      </div>

      <div className="px-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Tables ({schema.tables.length})
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-4">
          {schema.tables.map(table => (
            <button
              key={table.id}
              onClick={() => onEditTable(table.id)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-800/80 text-left transition-colors group border border-transparent hover:border-slate-700/50"
            >
              <Table2 size={14} className="text-slate-500 group-hover:text-primary transition-colors" />
              <span className="font-mono text-sm text-slate-300 truncate">{table.name}</span>
            </button>
          ))}
          {schema.tables.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm italic px-4">
              Click 'New Table' to start building your schema.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
