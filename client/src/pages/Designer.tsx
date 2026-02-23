import React, { useState, useRef } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useSchemaStore } from '@/hooks/use-schema-store';
import { useTheme } from '@/hooks/use-theme';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { TableNode } from '@/components/canvas/TableNode';
import { RelationshipLines } from '@/components/canvas/RelationshipLines';
import { TableModal } from '@/components/modals/TableModal';
import { ExportModal } from '@/components/modals/ExportModal';
import { ImportModal } from '@/components/modals/ImportModal';
import { Table } from '@/lib/schema-types';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, Download, Trash2, MousePointer2, Upload, Moon, Sun } from 'lucide-react';

export default function Designer() {
  const store = useSchemaStore();
  const { theme, toggleTheme } = useTheme();
  
  // Modals state
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [editingTable, setEditingTable] = useState<Table | undefined>(undefined);
  
  // Canvas scale tracking for accurate drag math
  const [scale, setScale] = useState(1);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  const handleOpenNewTable = () => {
    setEditingTable(undefined);
    setIsTableModalOpen(true);
  };

  const handleOpenEditTable = (tableOrId: Table | string) => {
    const table = typeof tableOrId === 'string' 
      ? store.schema.tables.find(t => t.id === tableOrId) 
      : tableOrId;
    if (table) {
      setEditingTable(table);
      setIsTableModalOpen(true);
    }
  };

  const handleSaveTable = (table: Table) => {
    if (editingTable) {
      store.updateTable(table);
    } else {
      // Offset new tables slightly if added from sidebar without specific position
      const offset = (store.schema.tables.length * 30) % 200;
      store.addTable({ ...table, position: { x: 100 + offset, y: 100 + offset } });
    }
  };

  const handleDeleteTable = React.useCallback((tableId: string) => {
    const table = store.schema.tables.find((t) => t.id === tableId);
    const tableLabel = table?.name ?? 'this table';
    const shouldDelete = window.confirm(`Delete "${tableLabel}" and its relations?`);
    if (!shouldDelete) return;
    store.deleteTable(tableId);
  }, [store]);

  const handleQuickAddTable = React.useCallback(() => {
    const existingNames = new Set(store.schema.tables.map((t) => t.name));
    let index = store.schema.tables.length + 1;
    let name = `table_${index}`;

    while (existingNames.has(name)) {
      index += 1;
      name = `table_${index}`;
    }

    const offset = (store.schema.tables.length * 30) % 200;
    store.addTable({
      id: crypto.randomUUID(),
      name,
      columns: [
        {
          id: crypto.randomUUID(),
          name: 'id',
          type: 'uuid',
          isPrimaryKey: true,
          isNotNull: true,
          isUnique: true,
        },
      ],
      position: { x: 100 + offset, y: 100 + offset },
    });
  }, [store]);

  const handleToggleSidebar = React.useCallback(() => {
    setIsSidebarVisible((prev) => !prev);
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingInInput =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      const isNewTableShortcut =
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k');

      if (isNewTableShortcut) {
        if (isTypingInInput) return;
        e.preventDefault();
        e.stopPropagation();
        handleQuickAddTable();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        if (isTypingInInput) return;
        e.preventDefault();
        e.stopPropagation();
        handleToggleSidebar();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) store.redo();
        else store.undo();
      }
      if (e.key === 'Escape' && store.connectingFrom) {
        store.cancelConnecting();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [store, handleQuickAddTable, handleToggleSidebar]);

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden relative">
      {/* Top Navigation Bar */}
      <div className={`absolute top-0 ${isSidebarVisible ? 'left-64' : 'left-0'} right-0 h-[59px] glass-panel border-l-0 border-r-0 border-t-0 z-20 flex items-center justify-between px-4`}>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={store.undo} 
            disabled={!store.canUndo}
            className="text-muted-foreground hover:text-foreground"
          >
            <Undo2 size={16} className="mr-2" /> Undo
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={store.redo} 
            disabled={!store.canRedo}
            className="text-muted-foreground hover:text-foreground"
          >
            <Redo2 size={16} className="mr-2" /> Redo
          </Button>
          <div className="h-4 w-px bg-border mx-2" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if(confirm('Are you sure you want to clear the canvas?')) store.clear();
            }} 
            className="text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Trash2 size={16} className="mr-2" /> Clear
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          {store.connectingFrom && (
            <div className="flex items-center gap-2 text-foreground bg-card px-3 py-1.5 rounded-full text-xs font-medium border border-border animate-pulse">
              <MousePointer2 size={14} /> Select target column...
              <button onClick={store.cancelConnecting} className="ml-2 hover:text-foreground underline">Cancel</button>
            </div>
          )}
          <Button
            onClick={toggleTheme}
            variant="secondary"
            className="border-border bg-card/70 hover:bg-accent"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <Button
            onClick={() => setIsImportModalOpen(true)}
            variant="outline"
            className="border-border bg-card/70 text-foreground hover:bg-accent"
          >
            <Upload size={16} className="mr-2" /> Import SQL
          </Button>
          <Button 
            onClick={() => setIsExportModalOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 border-0"
          >
            <Download size={16} className="mr-2" /> Export SQL
          </Button>
        </div>
      </div>

      {isSidebarVisible && (
        <Sidebar 
          schema={store.schema} 
          onAddTable={handleOpenNewTable}
          onEditTable={handleOpenEditTable}
        />
      )}

      {/* Infinite Canvas Area */}
      <div className="flex-1 relative cursor-grab active:cursor-grabbing bg-zinc-100 dark:bg-zinc-900/70 bg-grid-pattern pt-14">
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={0.1}
          maxScale={2}
          limitToBounds={false}
          panning={{ excluded: ['drag-handle'] }}
          onTransformed={(ref) => setScale(ref.state.scale)}
        >
          <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
            <div className="w-[1000px] h-[1000px] relative origin-top-left">
              
              <RelationshipLines 
                schema={store.schema} 
                onDeleteRelation={store.deleteRelation}
                onSwapRelation={store.swapRelation}
                onUpdateRelationType={store.updateRelationType}
                scale={scale}
              />

              {store.schema.tables.map(table => (
                <TableNode
                  key={table.id}
                  table={table}
                  onUpdatePosition={store.updateTablePosition}
                  onDragEnd={store.commitTablePosition}
                  onEdit={handleOpenEditTable}
                  onDelete={handleDeleteTable}
                  onStartConnect={store.startConnecting}
                  onFinishConnect={store.finishConnecting}
                  onReorderColumns={store.reorderColumns}
                  connectingFrom={store.connectingFrom}
                  scale={scale}
                />
              ))}

            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>

      {/* Modals */}
      <TableModal 
        isOpen={isTableModalOpen} 
        onClose={() => setIsTableModalOpen(false)} 
        onSave={handleSaveTable}
        initialData={editingTable}
      />
      
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        schema={store.schema}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(schema, mode) => store.importSchema(schema, mode)}
      />
    </div>
  );
}
