import React, { useMemo } from 'react';
import { DatabaseSchema, Table, RelationType } from '@/lib/schema-types';
import { ArrowRightLeft, XCircle } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

interface RelationshipLinesProps {
  schema: DatabaseSchema;
  onDeleteRelation: (id: string) => void;
  onSwapRelation: (id: string) => void;
  onUpdateRelationType: (id: string, type: RelationType) => void;
  scale: number;
}

// Fixed dimensions based on our CSS classes to enable pure math calculations
const TABLE_WIDTH = 288; // w-72 = 18rem = 288px
const HEADER_HEIGHT = 48; // Estimate based on py-3 and text size
const ROW_HEIGHT = 40; // Estimate based on py-2 and text size

export const RelationshipLines: React.FC<RelationshipLinesProps> = ({ schema, onDeleteRelation, onSwapRelation, onUpdateRelationType, scale }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const lineColor = isDark ? '#a1a1aa' : '#71717a';
  const chipFill = isDark ? '#09090b' : '#ffffff';
  const chipStroke = isDark ? '#52525b' : '#a1a1aa';
  
  const getPortPosition = (table: Table, columnId: string, side: 'left' | 'right') => {
    const colIndex = table.columns.findIndex(c => c.id === columnId);
    if (colIndex === -1) return { x: 0, y: 0 };

    const y = table.position.y + HEADER_HEIGHT + (colIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);
    const x = side === 'left' ? table.position.x : table.position.x + TABLE_WIDTH;
    
    return { x, y };
  };

  const lines = useMemo(() => {
    return schema.relations.map(rel => {
      const fromTable = schema.tables.find(t => t.id === rel.fromTableId);
      const toTable = schema.tables.find(t => t.id === rel.toTableId);
      
      if (!fromTable || !toTable) return null;

      // Determine which sides to connect based on relative X positions
      const fromIsLeft = fromTable.position.x < toTable.position.x;
      
      const start = getPortPosition(fromTable, rel.fromColumnId, fromIsLeft ? 'right' : 'left');
      const end = getPortPosition(toTable, rel.toColumnId, fromIsLeft ? 'left' : 'right');

      // Bezier curve control points for a smooth s-curve
      const controlOffset = Math.max(Math.abs(end.x - start.x) / 2, 50);
      const cp1 = { x: start.x + (fromIsLeft ? controlOffset : -controlOffset), y: start.y };
      const cp2 = { x: end.x + (fromIsLeft ? -controlOffset : controlOffset), y: end.y };

      const pathData = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;

      return {
        id: rel.id,
        path: pathData,
        type: rel.type,
        midX,
        midY,
        start,
        end,
        fromIsLeft
      };
    }).filter(Boolean);
  }, [schema]);

  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ overflow: 'visible', zIndex: 0 }}>
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="5" refX="7" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill={lineColor} />
        </marker>
      </defs>
      
      {lines.map((line) => line && (
        <g key={line.id} className="pointer-events-auto group">
          {/* Invisible thick path for easier hovering/clicking */}
          <path 
            d={line.path} 
            fill="none" 
            stroke="transparent" 
            strokeWidth="20" 
            className="cursor-pointer"
          />
          
          {/* Visible line */}
          <path 
            d={line.path} 
            fill="none" 
            stroke={lineColor}
            strokeWidth="2"
            strokeOpacity="0.6"
            markerEnd="url(#arrowhead)"
            className="transition-all group-hover:strokeOpacity-100 group-hover:strokeWidth-3"
          />
          
          {/* Relation Type Labels */}
          <g transform={`translate(${line.start.x + (line.fromIsLeft ? 15 : -30)}, ${line.start.y - 8})`}>
            <rect width="20" height="16" rx="8" fill={chipFill} stroke={chipStroke} strokeWidth="1" />
             <text textAnchor="" x="6" y="12" fontSize="10" fill={lineColor} fontWeight="bold">1</text>
          </g>

          <g 
            transform={`translate(${line.end.x + (line.fromIsLeft ? -45 : 28)}, ${line.end.y - 9})`}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateRelationType(line.id, line.type === '1:N' ? '1:1' : '1:N');
            }}
          >
            <rect width="20" height="16" rx="8" fill={chipFill} stroke={chipStroke} strokeWidth="1" />
            <text textAnchor="" x="6" y="12" fontSize="10" fill={lineColor} fontWeight="bold">
              {line.type === '1:N' ? 'N' : '1'}
            </text>
          </g>
          
          {/* Swap and delete buttons that appear on hover */}
          <g
            transform={`translate(${line.midX - 14}, ${line.midY}) scale(${1/scale})`}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSwapRelation(line.id);
            }}
          >
            <circle cx="0" cy="0" r="12" fill={chipFill} stroke={chipStroke} />
            <ArrowRightLeft x="-8" y="-8" size={16} className="text-muted-foreground hover:text-foreground" />
          </g>

          <g
            transform={`translate(${line.midX + 14}, ${line.midY}) scale(${1/scale})`}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRelation(line.id);
            }}
          >
            <circle cx="0" cy="0" r="12" fill={chipFill} stroke={chipStroke} />
            <XCircle x="-8" y="-8" size={16} className="text-muted-foreground hover:text-foreground" />
          </g>
        </g>
      ))}
    </svg>
  );
};
