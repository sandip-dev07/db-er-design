import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatabaseSchema } from '@/lib/schema-types';
import { generatePostgreSQL } from '@/lib/sql-generator';
import { Copy, Download, Check } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: DatabaseSchema;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, schema }) => {
  const [sql, setSql] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSql(generatePostgreSQL(schema));
      setCopied(false);
    }
  }, [isOpen, schema]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Export Schema</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Generated PostgreSQL script for your database design.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mt-2 border border-border rounded-md overflow-hidden bg-card">
          <div className="absolute top-2 right-2 flex gap-2">
            <Button 
              size="sm" 
              variant="secondary" 
              className="h-8 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border"
              onClick={handleCopy}
            >
              {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <ScrollArea className="h-[500px] w-full p-4">
            <pre className="font-mono text-sm text-foreground">
              <code>{sql || '-- Schema is empty. Add some tables!'}</code>
            </pre>
          </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} className="hover:bg-accent">Close</Button>
          <Button onClick={handleDownload} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Download size={16} className="mr-2" /> Download .sql
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
