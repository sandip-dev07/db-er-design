import { useState, useCallback, useEffect } from "react";
import { DatabaseSchema, Table, Relation, Column } from "@/lib/schema-types";

const LOCAL_STORAGE_KEY = "schema-designer-state";

const emptySchema: DatabaseSchema = {
  tables: [],
  relations: [],
};

export function useSchemaStore() {
  // --- History State ---
  const [past, setPast] = useState<DatabaseSchema[]>([]);
  const [present, setPresent] = useState<DatabaseSchema>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) return JSON.parse(stored) as DatabaseSchema;
    } catch (e) {
      console.error("Failed to load schema from local storage", e);
    }
    return emptySchema;
  });
  const [future, setFuture] = useState<DatabaseSchema[]>([]);

  // --- Connecting State (UI only, not saved to history) ---
  const [connectingFrom, setConnectingFrom] = useState<{tableId: string, columnId: string} | null>(null);

  // Sync to local storage on change
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(present));
  }, [present]);

  // --- History Actions ---
  const commit = useCallback((newState: DatabaseSchema) => {
    setPast(prev => [...prev, present]);
    setPresent(newState);
    setFuture([]);
  }, [present]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setPast(newPast);
    setFuture([present, ...future]);
    setPresent(previous);
  }, [past, present, future]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    
    setPast([...past, present]);
    setFuture(newFuture);
    setPresent(next);
  }, [past, present, future]);

  const clear = useCallback(() => {
    commit(emptySchema);
  }, [commit]);

  // --- Table Actions ---
  const addTable = useCallback((table: Table) => {
    commit({
      ...present,
      tables: [...present.tables, table]
    });
  }, [present, commit]);

  const updateTable = useCallback((updatedTable: Table) => {
    commit({
      ...present,
      tables: present.tables.map(t => t.id === updatedTable.id ? updatedTable : t)
    });
  }, [present, commit]);

  const deleteTable = useCallback((tableId: string) => {
    commit({
      tables: present.tables.filter(t => t.id !== tableId),
      // Automatically clean up dangling relations
      relations: present.relations.filter(r => r.fromTableId !== tableId && r.toTableId !== tableId)
    });
  }, [present, commit]);

  // Specifically for dragging to avoid spamming history
  const updateTablePosition = useCallback((tableId: string, x: number, y: number) => {
    setPresent(prev => ({
      ...prev,
      tables: prev.tables.map(t => t.id === tableId ? { ...t, position: { x, y } } : t)
    }));
  }, []);

  const commitTablePosition = useCallback(() => {
    // Just force a history save of current state
    if (past.length === 0 || past[past.length - 1] !== present) {
       setPast(prev => [...prev, present]);
       setFuture([]);
    }
  }, [present, past]);


  // --- Relation Actions ---
  const startConnecting = useCallback((tableId: string, columnId: string) => {
    setConnectingFrom({ tableId, columnId });
  }, []);

  const cancelConnecting = useCallback(() => {
    setConnectingFrom(null);
  }, []);

  const finishConnecting = useCallback((toTableId: string, toColumnId: string) => {
    if (!connectingFrom) return;
    
    // Prevent self-connections on the same column
    if (connectingFrom.tableId === toTableId && connectingFrom.columnId === toColumnId) {
      setConnectingFrom(null);
      return;
    }

    const newRelation: Relation = {
      id: crypto.randomUUID(),
      fromTableId: connectingFrom.tableId,
      fromColumnId: connectingFrom.columnId,
      toTableId,
      toColumnId
    };

    commit({
      ...present,
      relations: [...present.relations, newRelation]
    });
    setConnectingFrom(null);
  }, [connectingFrom, present, commit]);

  const deleteRelation = useCallback((relationId: string) => {
    commit({
      ...present,
      relations: present.relations.filter(r => r.id !== relationId)
    });
  }, [present, commit]);

  return {
    schema: present,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    connectingFrom,
    undo,
    redo,
    clear,
    addTable,
    updateTable,
    deleteTable,
    updateTablePosition,
    commitTablePosition,
    startConnecting,
    cancelConnecting,
    finishConnecting,
    deleteRelation
  };
}
