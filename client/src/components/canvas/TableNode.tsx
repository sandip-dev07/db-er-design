import React, { useRef, useState } from 'react';
import { Table } from '@/lib/schema-types';
import { Key, Link as LinkIcon, Edit2, Plus, GripHorizontal, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TableNodeProps {
  table: Table;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
  onEdit: (table: Table) => void;
  onDelete: (id: string) => void;
  onStartConnect: (tableId: string, columnId: string) => void;
  onFinishConnect: (tableId: string, columnId: string) => void;
  onReorderColumns: (tableId: string, startIndex: number, endIndex: number) => void;
  connectingFrom: { tableId: string, columnId: string } | null;
  scale: number;
}

export const TableNode: React.FC<TableNodeProps> = ({ 
  table, 
  onUpdatePosition, 
  onDragEnd,
  onEdit,
  onDelete,
  onStartConnect,
  onFinishConnect,
  onReorderColumns,
  connectingFrom,
  scale
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Only drag from the header
    if (!target.closest('.drag-handle')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startTableX = table.position.x;
    const startTableY = table.position.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      // Adjust movement by current canvas scale
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      
      onUpdatePosition(table.id, startTableX + dx, startTableY + dy);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      onDragEnd();
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleColumnDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColumnIndex(index);
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleColumnDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColumnIndex === null) return;
    if (draggedColumnIndex !== index) {
      onReorderColumns(table.id, draggedColumnIndex, index);
    }
    setDraggedColumnIndex(null);
  };

  const isConnecting = connectingFrom !== null;

  return (
    <div
      className={`absolute w-72 canvas-node ${isDragging ? 'z-50 canvas-node-active shadow-lg scale-[1.02]' : 'z-10'} transition-transform duration-100`}
      style={{
        transform: `translate(${table.position.x}px, ${table.position.y}px)`,
        // Disable touch actions on the node to prevent interference with custom dragging
        touchAction: 'none' 
      }}
      onPointerDown={handlePointerDown}
    >
      {/* Header */}
      <div className="drag-handle bg-gradient-to-r from-zinc-100 to-zinc-200 border-b border-border dark:from-zinc-900 dark:to-black p-3 flex items-center justify-between cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 overflow-hidden">
          <GripHorizontal size={14} className="text-muted-foreground flex-shrink-0" />
          <h3 className="font-mono font-semibold text-sm text-foreground truncate" title={table.name}>
            {table.name}
          </h3>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={(e) => { e.stopPropagation(); onEdit(table); }}
          >
            <Edit2 size={12} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={(e) => { e.stopPropagation(); onDelete(table.id); }}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      {/* Columns */}
      <div className="bg-card p-1 flex flex-col gap-[2px]">
        {table.columns.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground italic">No columns</div>
        )}
        {table.columns.map((col, index) => {
          const isTarget = isConnecting && connectingFrom?.tableId !== table.id;
          
          return (
            <div 
              key={col.id} 
              draggable={!isConnecting}
              onDragStart={(e) => handleColumnDragStart(e, index)}
              onDragOver={(e) => handleColumnDragOver(e, index)}
              onDrop={(e) => handleColumnDrop(e, index)}
              className={`flex items-center justify-between py-2 px-2 rounded-md transition-colors ${
                isTarget 
                  ? 'hover:bg-accent/70 cursor-crosshair border border-border' 
                  : 'hover:bg-accent/70 border border-transparent'
              } ${draggedColumnIndex === index ? 'opacity-50' : ''}`}
              onClick={(e) => {
                if (isTarget) {
                  e.stopPropagation();
                  onFinishConnect(table.id, col.id);
                }
              }}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {!isConnecting && (
                  <GripVertical size={12} className="text-muted-foreground flex-shrink-0 cursor-grab active:cursor-grabbing" />
                )}
                <button 
                  className={`flex-shrink-0 p-1 rounded transition-colors ${
                    isConnecting 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isConnecting) onStartConnect(table.id, col.id);
                  }}
                  title="Drag to create relation"
                >
                  <LinkIcon size={12} />
                </button>
                {col.isPrimaryKey ? (
                  <Key size={12} className="text-foreground flex-shrink-0" />
                ) : (
                  <div className="w-3" /> // spacer
                )}
                <span className="font-mono text-xs text-foreground truncate">{col.name}</span>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-[10px] text-muted-foreground uppercase">{col.type}</span>
                {col.isNotNull && <span className="text-[9px] font-bold text-muted-foreground" title="Not Null">NN</span>}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Add Column Button (Quick Access) */}
      <button 
        className="bg-card border-t border-border py-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        onClick={(e) => { e.stopPropagation(); onEdit(table); }}
      >
        <Plus size={12} /> Add Column
      </button>
    </div>
  );
};
