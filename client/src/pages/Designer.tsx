import React, { useState, useRef } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useSchemaStore } from '@/hooks/use-schema-store';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { TableNode } from '@/components/canvas/TableNode';
import { RelationshipLines } from '@/components/canvas/RelationshipLines';
import { TableModal } from '@/components/modals/TableModal';
import { ExportModal } from '@/components/modals/ExportModal';
import { Table } from '@/lib/schema-types';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, Download, Trash2, MousePointer2 } from 'lucide-react';

export default function Designer() {
  const store = useSchemaStore();
  
  // Modals state
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) store.redo();
        else store.undo();
      }
      if (e.key === 'Escape' && store.connectingFrom) {
        store.cancelConnecting();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  return (
    <div className="h-screen w-full flex bg-[#0f111a] text-slate-200 overflow-hidden relative">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-64 right-0 h-14 bg-slate-950/50 backdrop-blur-md border-b border-white/5 z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={store.undo} 
            disabled={!store.canUndo}
            className="text-slate-400 hover:text-white"
          >
            <Undo2 size={16} className="mr-2" /> Undo
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={store.redo} 
            disabled={!store.canRedo}
            className="text-slate-400 hover:text-white"
          >
            <Redo2 size={16} className="mr-2" /> Redo
          </Button>
          <div className="h-4 w-px bg-slate-800 mx-2" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if(confirm('Are you sure you want to clear the canvas?')) store.clear();
            }} 
            className="text-slate-400 hover:text-red-400"
          >
            <Trash2 size={16} className="mr-2" /> Clear
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          {store.connectingFrom && (
            <div className="flex items-center gap-2 text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-full text-xs font-medium border border-cyan-900/50 animate-pulse">
              <MousePointer2 size={14} /> Select target column...
              <button onClick={store.cancelConnecting} className="ml-2 hover:text-white underline">Cancel</button>
            </div>
          )}
          <Button 
            onClick={() => setIsExportModalOpen(true)}
            className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg shadow-primary/20 border-0"
          >
            <Download size={16} className="mr-2" /> Export SQL
          </Button>
        </div>
      </div>

      <Sidebar 
        schema={store.schema} 
        onAddTable={handleOpenNewTable}
        onEditTable={handleOpenEditTable}
      />

      {/* Infinite Canvas Area */}
      <div className="flex-1 relative cursor-grab active:cursor-grabbing bg-grid-pattern pt-14">
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
            <div className="w-[10000px] h-[10000px] relative origin-top-left">
              
              <RelationshipLines 
                schema={store.schema} 
                onDeleteRelation={store.deleteRelation}
                scale={scale}
              />

              {store.schema.tables.map(table => (
                <TableNode
                  key={table.id}
                  table={table}
                  onUpdatePosition={store.updateTablePosition}
                  onDragEnd={store.commitTablePosition}
                  onEdit={handleOpenEditTable}
                  onDelete={store.deleteTable}
                  onStartConnect={store.startConnecting}
                  onFinishConnect={store.finishConnecting}
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
    </div>
  );
}
