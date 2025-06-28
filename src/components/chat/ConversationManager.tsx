'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Upload, 
  FileText, 
  MessageSquare,
  Trash2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

export function ConversationManager() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string>('');

  const handleExport = async (format: string) => {
    setIsExporting(true);
    setExportStatus('');
    
    try {
      console.log('📤 Starting export in format:', format);
      
      const response = await fetch(`/api/conversations/export?format=${format}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnix-conversations-${format}-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportStatus('✅ Export completed successfully!');
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      setExportStatus('❌ Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    if (!file) return;

    setIsImporting(true);
    setImportStatus('');

    try {
      console.log('📥 Importing conversations from:', file.name);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/conversations/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();
      setImportStatus(`✅ Successfully imported ${result.count || 0} conversations!`);
      
    } catch (error) {
      console.error('❌ Import failed:', error);
      setImportStatus(`❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const exportFormats = [
    {
      id: 'omnix',
      name: 'OmniX Format',
      description: 'Native format with full metadata and model information',
      icon: MessageSquare,
      recommended: true
    },
    {
      id: 'chatgpt',
      name: 'ChatGPT Format',
      description: 'Compatible with OpenAI ChatGPT export format',
      icon: FileText,
      recommended: false
    },
    {
      id: 'claude',
      name: 'Claude Format',
      description: 'Compatible with Anthropic Claude conversation format',
      icon: FileText,
      recommended: false
    },
    {
      id: 'csv',
      name: 'CSV Spreadsheet',
      description: 'Simple spreadsheet format for analysis',
      icon: FileText,
      recommended: false
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Export Section */}
      <Card className="glass-morphism border-purple-400/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Download className="w-5 h-5" />
            Export Conversations
          </CardTitle>
          <p className="text-slate-400 text-sm">
            Download your conversation history in various formats for backup or migration.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportFormats.map((format) => (
              <div key={format.id} className="relative">
                {format.recommended && (
                  <Badge className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs z-10">
                    Recommended
                  </Badge>
                )}
                <div className="glass-morphism-light rounded-lg p-4 border border-slate-400/20 hover:border-purple-400/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <format.icon className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-white">{format.name}</h3>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    {format.description}
                  </p>
                  <Button
                    onClick={() => handleExport(format.id)}
                    disabled={isExporting}
                    size="sm"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Export {format.name}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {exportStatus && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              exportStatus.includes('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {exportStatus.includes('✅') ? 
                <CheckCircle className="w-4 h-4" /> : 
                <AlertCircle className="w-4 h-4" />
              }
              {exportStatus}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card className="glass-morphism border-blue-400/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Upload className="w-5 h-5" />
            Import Conversations
          </CardTitle>
          <p className="text-slate-400 text-sm">
            Import conversation history from other AI platforms or previous OmniX exports.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-400/30 rounded-lg p-8 text-center hover:border-blue-400/50 transition-colors">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Drop files here or click to browse</h3>
            <p className="text-slate-400 text-sm mb-4">
              Supported formats: OmniX JSON, ChatGPT JSON, Claude JSON, CSV
            </p>
            <input
              type="file"
              accept=".json,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
              }}
              className="hidden"
              id="import-file"
            />
            <Button
              asChild
              disabled={isImporting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <label htmlFor="import-file" className="cursor-pointer">
                {isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Select File to Import
              </label>
            </Button>
          </div>

          {importStatus && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              importStatus.includes('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {importStatus.includes('✅') ? 
                <CheckCircle className="w-4 h-4" /> : 
                <AlertCircle className="w-4 h-4" />
              }
              {importStatus}
            </div>
          )}

          {/* Import Guidelines */}
          <div className="glass-morphism-light rounded-lg p-4 border border-slate-400/20">
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              Import Guidelines
            </h4>
            <ul className="text-slate-400 text-sm space-y-1">
              <li>• OmniX format preserves all metadata and model information</li>
              <li>• ChatGPT exports should be in JSON format from OpenAI export</li>
              <li>• Claude exports should be in conversation JSON format</li>
              <li>• CSV files should have columns: conversation_id, role, content, timestamp</li>
              <li>• Large files may take a few moments to process</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="glass-morphism border-green-400/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white mb-1">Privacy & Security</h4>
              <p className="text-slate-400 text-sm">
                All conversations are encrypted and stored securely. Exports are generated on-demand and not stored on our servers. 
                You maintain full control over your data with the ability to export or delete at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 