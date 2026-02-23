import React, { useRef, useState, useEffect } from 'react';
import { Table, Column } from '@/lib/schema-types';
import { Key, Link as LinkIcon, Edit2, Plus, GripHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TableNodeProps {
  table: Table;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
  onEdit: (table: Table) => void;
  onDelete: (id: string) => void;
  onStartConnect: (tableId: string, columnId: string) => void;
  onFinishConnect: (tableId: string, columnId: string) => void;
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
  connectingFrom,
  scale
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from the header
    if (!(e.target as HTMLElement).closest('.drag-handle')) return;
    
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

  const isConnecting = connectingFrom !== null;

  return (
    <div
      ref={nodeRef}
      className={`absolute w-72 canvas-node ${isDragging ? 'z-50 canvas-node-active shadow-2xl scale-[1.02]' : 'z-10'} transition-transform duration-100`}
      style={{
        transform: `translate(${table.position.x}px, ${table.position.y}px)`,
        // Disable touch actions on the node to prevent interference with custom dragging
        touchAction: 'none' 
      }}
      onPointerDown={handlePointerDown}
    >
      {/* Header */}
      <div className="drag-handle bg-gradient-to-r from-slate-800 to-slate-900 border-b border-white/5 p-3 flex items-center justify-between cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 overflow-hidden">
          <GripHorizontal size={14} className="text-slate-500 flex-shrink-0" />
          <h3 className="font-mono font-semibold text-sm text-slate-200 truncate" title={table.name}>
            {table.name}
          </h3>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-700"
            onClick={(e) => { e.stopPropagation(); onEdit(table); }}
          >
            <Edit2 size={12} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-slate-400 hover:text-red-400 hover:bg-red-950/30"
            onClick={(e) => { e.stopPropagation(); onDelete(table.id); }}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      {/* Columns */}
      <div className="bg-slate-950/80 p-1 flex flex-col gap-[2px]">
        {table.columns.length === 0 && (
          <div className="py-4 text-center text-xs text-slate-500 italic">No columns</div>
        )}
        {table.columns.map(col => {
          const isTarget = isConnecting && connectingFrom?.tableId !== table.id;
          
          return (
            <div 
              key={col.id} 
              className={`flex items-center justify-between py-2 px-2 rounded-md transition-colors ${
                isTarget 
                  ? 'hover:bg-cyan-900/30 cursor-crosshair border border-cyan-500/30' 
                  : 'hover:bg-slate-800/50 border border-transparent'
              }`}
              onClick={(e) => {
                if (isTarget) {
                  e.stopPropagation();
                  onFinishConnect(table.id, col.id);
                }
              }}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <button 
                  className={`flex-shrink-0 p-1 rounded transition-colors ${
                    isConnecting 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-cyan-900/50 text-slate-500 hover:text-cyan-400'
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
                  <Key size={12} className="text-amber-400 flex-shrink-0" />
                ) : (
                  <div className="w-3" /> // spacer
                )}
                <span className="font-mono text-xs text-slate-300 truncate">{col.name}</span>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-[10px] text-slate-500 uppercase">{col.type}</span>
                {col.isNotNull && <span className="text-[9px] font-bold text-slate-600" title="Not Null">NN</span>}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Add Column Button (Quick Access) */}
      <button 
        className="bg-slate-900 border-t border-white/5 py-1.5 flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        onClick={(e) => { e.stopPropagation(); onEdit(table); }}
      >
        <Plus size={12} /> Add Column
      </button>
    </div>
  );
};
