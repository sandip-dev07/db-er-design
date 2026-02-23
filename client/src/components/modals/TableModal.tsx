import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, Column, columnTypes } from '@/lib/schema-types';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (table: Table) => void;
  initialData?: Table;
}

export const TableModal: React.FC<TableModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setColumns([...initialData.columns]);
      } else {
        setName('new_table');
        setColumns([
          { id: uuidv4(), name: 'id', type: 'uuid', isPrimaryKey: true, isNotNull: true, isUnique: true }
        ]);
      }
    }
  }, [isOpen, initialData]);

  const handleAddColumn = () => {
    setColumns([
      ...columns,
      { id: uuidv4(), name: 'new_column', type: 'varchar', isPrimaryKey: false, isNotNull: false, isUnique: false }
    ]);
  };

  const handleUpdateColumn = (id: string, updates: Partial<Column>) => {
    setColumns(columns.map(col => col.id === id ? { ...col, ...updates } : col));
  };

  const handleRemoveColumn = (id: string) => {
    setColumns(columns.filter(col => col.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    
    const table: Table = {
      id: initialData?.id || uuidv4(),
      name: name.trim().toLowerCase().replace(/\s+/g, '_'),
      columns,
      position: initialData?.position || { x: 100, y: 100 } // Default position if new
    };
    
    onSave(table);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-slate-950 border-slate-800 text-slate-200">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Table' : 'Create Table'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tableName">Table Name</Label>
            <Input 
              id="tableName" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="users"
              className="bg-slate-900 border-slate-700 font-mono"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Columns</Label>
              <Button onClick={handleAddColumn} size="sm" variant="outline" className="h-8 border-slate-700 bg-slate-900 hover:bg-slate-800">
                <Plus size={14} className="mr-1" /> Add Column
              </Button>
            </div>

            <div className="border border-slate-800 rounded-md overflow-hidden bg-slate-900/50">
              <div className="grid grid-cols-[24px_2fr_2fr_1fr_1fr_1fr_40px] gap-2 p-2 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-400">
                <div></div>
                <div>Name</div>
                <div>Type</div>
                <div className="text-center">PK</div>
                <div className="text-center">Not Null</div>
                <div className="text-center">Unique</div>
                <div></div>
              </div>
              
              <ScrollArea className="h-[300px]">
                <div className="p-2 space-y-2">
                  {columns.map((col, index) => (
                    <div key={col.id} className="grid grid-cols-[24px_2fr_2fr_1fr_1fr_1fr_40px] gap-2 items-center bg-slate-950 p-2 rounded border border-slate-800/50">
                      <GripVertical size={14} className="text-slate-600 cursor-move" />
                      
                      <Input 
                        value={col.name}
                        onChange={(e) => handleUpdateColumn(col.id, { name: e.target.value })}
                        className="h-8 bg-slate-900 border-slate-700 font-mono text-sm"
                      />
                      
                      <Select 
                        value={col.type} 
                        onValueChange={(val: any) => handleUpdateColumn(col.id, { type: val })}
                      >
                        <SelectTrigger className="h-8 bg-slate-900 border-slate-700 font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                          {columnTypes.map(type => (
                            <SelectItem key={type} value={type} className="font-mono text-xs focus:bg-slate-800">
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex justify-center">
                        <Checkbox 
                          checked={col.isPrimaryKey}
                          onCheckedChange={(checked) => handleUpdateColumn(col.id, { 
                            isPrimaryKey: !!checked,
                            ...(checked ? { isNotNull: true, isUnique: true } : {}) 
                          })}
                          className="border-slate-600 data-[state=checked]:bg-primary"
                        />
                      </div>

                      <div className="flex justify-center">
                        <Checkbox 
                          checked={col.isNotNull}
                          disabled={col.isPrimaryKey}
                          onCheckedChange={(checked) => handleUpdateColumn(col.id, { isNotNull: !!checked })}
                          className="border-slate-600"
                        />
                      </div>

                      <div className="flex justify-center">
                        <Checkbox 
                          checked={col.isUnique}
                          disabled={col.isPrimaryKey}
                          onCheckedChange={(checked) => handleUpdateColumn(col.id, { isUnique: !!checked })}
                          className="border-slate-600"
                        />
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveColumn(col.id)}
                        className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/30"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                  {columns.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No columns defined. Add one to get started.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="hover:bg-slate-800">Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            Save Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
