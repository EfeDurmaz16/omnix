"use client";

import { useState } from 'react';
import { Database, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImportExportModal } from './ImportExportModal';

interface ImportExportButtonProps {
  userId: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function ImportExportButton({ 
  userId, 
  variant = 'ghost', 
  size = 'sm',
  className = '' 
}: ImportExportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState<'import' | 'export'>('export');

  const handleQuickExport = async (format: 'json' | 'markdown' | 'csv') => {
    try {
      const params = new URLSearchParams({
        format,
        includeMetadata: 'true',
        includeSystemMessages: 'false'
      });

      const response = await fetch(`/api/conversations/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
        `aspendos-export-${format}-${new Date().toISOString().split('T')[0]}.${format}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Quick export failed:', error);
      // Fallback to full modal
      setModalDefaultTab('export');
      setIsModalOpen(true);
    }
  };

  const openModal = (tab: 'import' | 'export') => {
    setModalDefaultTab(tab);
    setIsModalOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={variant} 
            size={size} 
            className={`relative ${className}`}
            title="Import/Export Conversations"
          >
            <Database className="w-4 h-4" />
            <span className="sr-only">Import/Export</span>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => openModal('export')}>
            <Download className="w-4 h-4 mr-2" />
            Export All Conversations
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleQuickExport('json')}>
            <Download className="w-4 h-4 mr-2 opacity-60" />
            Quick Export (JSON)
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleQuickExport('markdown')}>
            <Download className="w-4 h-4 mr-2 opacity-60" />
            Quick Export (Markdown)
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleQuickExport('csv')}>
            <Download className="w-4 h-4 mr-2 opacity-60" />
            Quick Export (CSV)
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => openModal('import')}>
            <Upload className="w-4 h-4 mr-2" />
            Import Conversations
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
      />
    </>
  );
}