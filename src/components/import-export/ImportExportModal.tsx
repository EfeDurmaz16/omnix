"use client";

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  Download, 
  FileText, 
  Database, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  FileJson,
  File,
  FileSpreadsheet,
  Globe,
  Settings,
  Clock,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ExportFormat,
  SupportedPlatform,
  ImportResult,
  ExportResult,
  ProgressUpdate
} from '@/types/import-export';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

type OperationType = 'import' | 'export';

interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includeSystemMessages: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  conversationIds?: string[];
}

interface ImportOptions {
  platform: SupportedPlatform;
  mergeStrategy: 'replace' | 'merge' | 'skip_existing';
  preserveIds: boolean;
  validateContent: boolean;
  includeMetadata: boolean;
}

interface PrivacySettings {
  includePersonalInfo: boolean;
  anonymizeUserData: boolean;
  excludeSensitiveContent: boolean;
  encryptExport: boolean;
}

export function ImportExportModal({ isOpen, onClose, userId }: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<OperationType>('export');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<ImportResult | ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Export state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeMetadata: true,
    includeSystemMessages: false
  });
  
  // Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    platform: 'aspendos',
    mergeStrategy: 'merge',
    preserveIds: false,
    validateContent: true,
    includeMetadata: true
  });
  
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    includePersonalInfo: true,
    anonymizeUserData: false,
    excludeSensitiveContent: false,
    encryptExport: false
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatIcons: Record<ExportFormat, React.ElementType> = {
    json: FileJson,
    markdown: FileText,
    csv: FileSpreadsheet,
    html: Globe,
    txt: FileText,
    pdf: FileText
  };

  const platformNames: Record<SupportedPlatform, string> = {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    gemini: 'Google Gemini',
    copilot: 'Microsoft Copilot',
    aspendos: 'Aspendos'
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      
      // Auto-detect platform from filename
      const filename = file.name.toLowerCase();
      if (filename.includes('chatgpt') || filename.includes('openai')) {
        setImportOptions(prev => ({ ...prev, platform: 'chatgpt' }));
      } else if (filename.includes('claude') || filename.includes('anthropic')) {
        setImportOptions(prev => ({ ...prev, platform: 'claude' }));
      } else if (filename.includes('gemini') || filename.includes('bard')) {
        setImportOptions(prev => ({ ...prev, platform: 'gemini' }));
      } else if (filename.includes('copilot') || filename.includes('microsoft')) {
        setImportOptions(prev => ({ ...prev, platform: 'copilot' }));
      }
    }
  }, []);

  const handleExport = async () => {
    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Preparing export...');
    setError(null);
    setResult(null);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        format: exportOptions.format,
        includeMetadata: exportOptions.includeMetadata.toString(),
        includeSystemMessages: exportOptions.includeSystemMessages.toString()
      });

      if (exportOptions.dateRange) {
        params.set('startDate', exportOptions.dateRange.start);
        params.set('endDate', exportOptions.dateRange.end);
      }

      if (exportOptions.conversationIds && exportOptions.conversationIds.length > 0) {
        params.set('conversationIds', exportOptions.conversationIds.join(','));
      }

      setCurrentStep('Fetching conversations...');
      setProgress(25);

      const response = await fetch(`/api/conversations/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      setCurrentStep('Generating file...');
      setProgress(75);

      // Get the blob and trigger download
      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 
        `aspendos-export-${exportOptions.format}-${new Date().toISOString().split('T')[0]}.${exportOptions.format}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setCurrentStep('Export completed!');
      setProgress(100);

      // Get export stats from headers
      const exportStats = response.headers.get('X-Export-Stats');
      const stats = exportStats ? JSON.parse(exportStats) : {};

      setResult({
        success: true,
        fileName: filename,
        fileSize: blob.size,
        conversationCount: stats.conversationCount || 0,
        format: exportOptions.format,
        metadata: {
          exportedAt: new Date().toISOString(),
          processingTime: stats.processingTime || 0
        }
      } as ExportResult);

    } catch (error) {
      console.error('Export error:', error);
      setError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file to import');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Validating file...');
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('options', JSON.stringify(importOptions));
      formData.append('privacySettings', JSON.stringify(privacySettings));

      setCurrentStep('Uploading and parsing...');
      setProgress(25);

      const response = await fetch('/api/conversations/import', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Import failed');
      }

      setCurrentStep('Processing conversations...');
      setProgress(75);

      setCurrentStep('Import completed!');
      setProgress(100);

      setResult(data.result);

    } catch (error) {
      console.error('Import error:', error);
      setError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setIsProcessing(false);
    setProgress(0);
    setCurrentStep('');
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Import/Export Conversations</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your conversation data across platforms
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isProcessing}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value as OperationType);
              resetModal();
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="export" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </TabsTrigger>
                <TabsTrigger value="import" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Import
                </TabsTrigger>
              </TabsList>

              {/* Export Tab */}
              <TabsContent value="export" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Format */}
                  <div className="space-y-3">
                    <Label>Export Format</Label>
                    <Select
                      value={exportOptions.format}
                      onValueChange={(value: ExportFormat) =>
                        setExportOptions(prev => ({ ...prev, format: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['json', 'markdown', 'csv', 'html', 'txt'] as ExportFormat[]).map((format) => {
                          const Icon = formatIcons[format];
                          return (
                            <SelectItem key={format} value={format}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {format.toUpperCase()}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-3">
                    <Label>Date Range (Optional)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        placeholder="Start date"
                        value={exportOptions.dateRange?.start || ''}
                        onChange={(e) =>
                          setExportOptions(prev => ({
                            ...prev,
                            dateRange: {
                              start: e.target.value,
                              end: prev.dateRange?.end || ''
                            }
                          }))
                        }
                      />
                      <Input
                        type="date"
                        placeholder="End date"
                        value={exportOptions.dateRange?.end || ''}
                        onChange={(e) =>
                          setExportOptions(prev => ({
                            ...prev,
                            dateRange: {
                              start: prev.dateRange?.start || '',
                              end: e.target.value
                            }
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Export Options */}
                <div className="space-y-4">
                  <Label>Export Options</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeMetadata"
                        checked={exportOptions.includeMetadata}
                        onCheckedChange={(checked) =>
                          setExportOptions(prev => ({ ...prev, includeMetadata: checked as boolean }))
                        }
                      />
                      <Label htmlFor="includeMetadata" className="text-sm">
                        Include metadata
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeSystemMessages"
                        checked={exportOptions.includeSystemMessages}
                        onCheckedChange={(checked) =>
                          setExportOptions(prev => ({ ...prev, includeSystemMessages: checked as boolean }))
                        }
                      />
                      <Label htmlFor="includeSystemMessages" className="text-sm">
                        Include system messages
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <Label>Privacy Settings</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="anonymizeUserData"
                        checked={privacySettings.anonymizeUserData}
                        onCheckedChange={(checked) =>
                          setPrivacySettings(prev => ({ ...prev, anonymizeUserData: checked as boolean }))
                        }
                      />
                      <Label htmlFor="anonymizeUserData" className="text-sm">
                        Anonymize user data
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="excludeSensitiveContent"
                        checked={privacySettings.excludeSensitiveContent}
                        onCheckedChange={(checked) =>
                          setPrivacySettings(prev => ({ ...prev, excludeSensitiveContent: checked as boolean }))
                        }
                      />
                      <Label htmlFor="excludeSensitiveContent" className="text-sm">
                        Exclude sensitive content
                      </Label>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Import Tab */}
              <TabsContent value="import" className="space-y-6">
                {/* File Upload */}
                <div className="space-y-3">
                  <Label>Select File to Import</Label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      selectedFile
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.txt,.zip"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="space-y-2">
                        <CheckCircle className="w-8 h-8 text-primary mx-auto" />
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Choose Different File
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="font-medium">Click to select a file</p>
                        <p className="text-sm text-muted-foreground">
                          Supports JSON files from ChatGPT, Claude, Gemini, Copilot, or Aspendos
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Browse Files
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Import Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>Source Platform</Label>
                    <Select
                      value={importOptions.platform}
                      onValueChange={(value: SupportedPlatform) =>
                        setImportOptions(prev => ({ ...prev, platform: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(platformNames) as SupportedPlatform[]).map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {platformNames[platform]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>Merge Strategy</Label>
                    <Select
                      value={importOptions.mergeStrategy}
                      onValueChange={(value: 'replace' | 'merge' | 'skip_existing') =>
                        setImportOptions(prev => ({ ...prev, mergeStrategy: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="merge">Merge (create duplicates)</SelectItem>
                        <SelectItem value="skip_existing">Skip existing</SelectItem>
                        <SelectItem value="replace">Replace existing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Import Settings</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="validateContent"
                        checked={importOptions.validateContent}
                        onCheckedChange={(checked) =>
                          setImportOptions(prev => ({ ...prev, validateContent: checked as boolean }))
                        }
                      />
                      <Label htmlFor="validateContent" className="text-sm">
                        Validate content
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="preserveIds"
                        checked={importOptions.preserveIds}
                        onCheckedChange={(checked) =>
                          setImportOptions(prev => ({ ...prev, preserveIds: checked as boolean }))
                        }
                      />
                      <Label htmlFor="preserveIds" className="text-sm">
                        Preserve original IDs
                      </Label>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">{currentStep}</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg mt-6">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center gap-2 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {activeTab === 'export' ? 'Export' : 'Import'} completed successfully!
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {'conversationCount' in result && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {result.conversationCount}
                      </div>
                      <div className="text-xs text-muted-foreground">Conversations</div>
                    </div>
                  )}
                  
                  {'importedConversations' in result && (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {result.importedConversations}
                        </div>
                        <div className="text-xs text-muted-foreground">Imported</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {result.skippedConversations}
                        </div>
                        <div className="text-xs text-muted-foreground">Skipped</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {result.errors.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Errors</div>
                      </div>
                    </>
                  )}
                  
                  {'fileSize' in result && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {(result.fileSize / 1024 / 1024).toFixed(1)}MB
                      </div>
                      <div className="text-xs text-muted-foreground">File Size</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-border">
            <div className="text-sm text-muted-foreground">
              {activeTab === 'export' ? 'Export your conversations' : 'Import from other platforms'}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                {result ? 'Close' : 'Cancel'}
              </Button>
              <Button
                onClick={activeTab === 'export' ? handleExport : handleImport}
                disabled={isProcessing || (activeTab === 'import' && !selectedFile)}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {activeTab === 'export' ? 'Exporting...' : 'Importing...'}
                  </>
                ) : (
                  <>
                    {activeTab === 'export' ? (
                      <Download className="w-4 h-4 mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {activeTab === 'export' ? 'Export' : 'Import'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}