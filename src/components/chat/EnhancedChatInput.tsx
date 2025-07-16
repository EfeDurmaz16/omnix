"use client";

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  Paperclip, 
  Mic, 
  MicOff, 
  Image, 
  FileText,
  X,
  Smile,
  AtSign,
  Hash,
  Loader2,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownInput } from '@/components/ui/markdown-input';
import { Badge } from '@/components/ui/badge';
import { useModelInfo } from '@/hooks/useModelInfo';

interface EnhancedChatInputProps {
  onSend: (message: string, files?: any[]) => void;
  selectedModel: string;
  disabled?: boolean;
  placeholder?: string;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
}

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  processed?: boolean;
  content?: string;
}

export function EnhancedChatInput({
  onSend,
  selectedModel,
  disabled = false,
  placeholder = "Type a message...",
  webSearchEnabled = false,
  onWebSearchToggle
}: EnhancedChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [rows, setRows] = useState(1);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [transcriptionPreview, setTranscriptionPreview] = useState('');
  const modelInfo = useModelInfo(selectedModel);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize logic for markdown input
  useEffect(() => {
    // Simply count actual newlines for a more accurate row count
    const lines = message.split('\n');
    const newRows = Math.min(Math.max(lines.length, 1), 10); // Allow up to 10 rows for code blocks
    setRows(newRows);
  }, [message]);

  const handleSend = () => {
    if (!message.trim() && attachedFiles.length === 0) return;
    
    let finalMessage = message.trim();
    
    // Process attached files for display in chat
    if (attachedFiles.length > 0) {
      const fileContents: string[] = [];
      
      attachedFiles.forEach(file => {
        if (file.type === 'image' && file.content) {
          // For images, just show file name in chat (actual processing happens in API)
          fileContents.push(`📷 Image: ${file.name}`);
        } else if (file.type === 'text' && file.content) {
          // For text files, show preview
          const preview = file.content.length > 200 ? 
            file.content.substring(0, 200) + '...' : 
            file.content;
          fileContents.push(`📄 Text File: ${file.name}\n${preview}`);
        } else if (file.type === 'pdf' && file.content) {
          // For PDFs, show different messages based on extraction success
          if (file.content.includes('Text Content (') && file.content.includes('characters):')) {
            // Successfully extracted text
            const lines = file.content.split('\n');
            const header = lines[0] || `📑 PDF: ${file.name}`;
            const summary = lines[1] || 'Text extracted';
            fileContents.push(`${header}\n${summary}\n✅ Text extracted and ready for analysis!`);
          } else if (file.content.includes('Automatic text extraction failed')) {
            // Extraction failed - show concise message
            const lines = file.content.split('\n');
            const fileName = lines[0] || `📑 PDF: ${file.name}`;
            const sizeInfo = lines[1] || '';
            fileContents.push(`${fileName}\n${sizeInfo}\n⚠️ Text extraction failed - Please copy/paste text manually`);
          } else {
            // Other PDF content
            fileContents.push(`📑 PDF: ${file.name}\n${file.content}`);
          }
        } else if (file.type === 'document' && file.content) {
          // For documents
          fileContents.push(`📋 Document: ${file.name}\n${file.content}`);
        } else {
          // For other files
          fileContents.push(`📎 File: ${file.name} (${file.type})`);
        }
      });

      if (fileContents.length > 0) {
        finalMessage = fileContents.join('\n\n') + (finalMessage ? '\n\n' + finalMessage : '');
      }
    }

    // Include file data for API processing with full content
    const fileData = attachedFiles.map(file => ({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      mimeType: file.url && file.url.startsWith('data:') ? 
        file.url.split(';')[0].replace('data:', '') : 
        (file.type === 'image' ? 'image/jpeg' : undefined),
      content: file.content
    }));

    onSend(finalMessage, fileData);
    setMessage('');
    setAttachedFiles([]);
    setRows(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    console.log('📎 Starting file upload process...');
    setIsUploadingFiles(true);

    // Process each file
    for (const file of Array.from(files)) {
      try {
        console.log('📤 Uploading file:', file.name);

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload and process file
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();

        if (result.success) {
          const processedFile: AttachedFile = {
            id: result.data.id,
            name: result.data.name,
            size: result.data.size,
            type: result.data.type,
            url: result.data.content, // For images, this will be the base64 data URL
            processed: true,
            content: result.data.content
          };

          setAttachedFiles(prev => [...prev, processedFile]);
          console.log('✅ File processed and added:', processedFile.name);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('❌ File upload failed:', error);
        alert(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setIsUploadingFiles(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleVoiceCommand = async (command: string, originalText: string) => {
    console.log('🎯 Voice command detected:', command);

    switch (command) {
      case 'SEND':
        if (message.trim()) {
          handleSend();
          setTranscriptionPreview('✅ Message sent via voice command');
        } else {
          setTranscriptionPreview('❌ No message to send');
        }
        break;

      case 'CLEAR':
        setMessage('');
        setTranscriptionPreview('✅ Message cleared via voice command');
        break;

      case 'NEW_CHAT':
        // Trigger new chat - you'll need to implement this based on your chat system
        window.location.reload(); // Simple implementation
        setTranscriptionPreview('✅ Starting new chat via voice command');
        break;

      case 'SWITCH_MODEL':
        setTranscriptionPreview('🔄 Use Ctrl+K to switch models');
        // Could trigger model selector here
        break;

      default:
        // If no command recognized, just add the text
        setMessage(prev => prev + (prev ? ' ' : '') + originalText);
        setTranscriptionPreview(`Transcribed: "${originalText}"`);
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        // Start recording
        setIsRecording(true);
        setTranscriptionPreview('');
        console.log('🎤 Starting voice recording...');

        // Import speech recognition dynamically
        const { SpeechRecognition } = await import('@/lib/audio/SpeechRecognition');

        if (!SpeechRecognition.isSupported()) {
          alert('Speech recording is not supported in your browser. Please use Chrome, Firefox, or Safari.');
          setIsRecording(false);
          return;
        }

        const recorder = new SpeechRecognition();
        await recorder.startRecording();

        // Store recorder instance for stopping
        (window as any).__currentRecorder = recorder;

      } catch (error) {
        console.error('❌ Failed to start recording:', error);
        alert('Failed to start recording. Please check microphone permissions.');
        setIsRecording(false);
      }
    } else {
      try {
        // Stop recording and transcribe
        console.log('🛑 Stopping voice recording...');
        setIsTranscribing(true);
        setTranscriptionPreview('Transcribing...');

        const recorder = (window as any).__currentRecorder;
        if (recorder && recorder.recording) {
          const audioBlob = await recorder.stopRecording();
          console.log('📝 Transcribing audio...');

          const transcriptionResult = await recorder.transcribe(audioBlob);

          // Handle voice commands
          if (transcriptionResult.command) {
            await handleVoiceCommand(transcriptionResult.command, transcriptionResult.text);
          } else if (transcriptionResult.text.trim()) {
            // Add transcribed text to the message input
            setMessage(prev => prev + (prev ? ' ' : '') + transcriptionResult.text);
            setTranscriptionPreview(`Transcribed: "${transcriptionResult.text}"`);
            console.log('✅ Transcription completed:', transcriptionResult.text);
          } else {
            setTranscriptionPreview('No speech detected');
          }

          // Clean up
          delete (window as any).__currentRecorder;
        } else {
          setTranscriptionPreview('No active recording found');
          console.warn('⚠️ No active recording to stop');
        }

        setIsRecording(false);
        setIsTranscribing(false);

        // Clear preview after 3 seconds
        setTimeout(() => {
          setTranscriptionPreview('');
        }, 3000);

      } catch (error) {
        console.error('❌ Recording/transcription failed:', error);
        setTranscriptionPreview('Transcription failed. Please try again.');
        setIsRecording(false);
        setIsTranscribing(false);

        // Clean up on error
        const recorder = (window as any).__currentRecorder;
        if (recorder) {
          recorder.cancelRecording();
          delete (window as any).__currentRecorder;
        }

        // Clear error message after 3 seconds
        setTimeout(() => {
          setTranscriptionPreview('');
        }, 3000);
      }
    }
  };

  const getFileIcon = (type: string) => {
    if (type === 'image') return Image;
    return FileText;
  };

  const getFileStatusBadge = (file: AttachedFile) => {
    if (file.processed) {
      return (
        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          ✅ Processed
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        🔄 Processing...
      </Badge>
    );
  };

  const canSend = (message.trim().length > 0 || attachedFiles.length > 0) && !disabled && !isUploadingFiles;

  return (
    <div className="p-4 space-y-3">
      {/* File Upload Loading */}
      {isUploadingFiles && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Processing files...</span>
        </motion.div>
      )}

      {/* Attached Files */}
      {attachedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-2"
        >
          {attachedFiles.map((file) => {
            const FileIcon = getFileIcon(file.type);
            return (
              <div
                key={file.id}
                className="flex items-center gap-2 bg-muted rounded-lg p-3 text-sm border"
              >
                <FileIcon className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate max-w-32">{file.name}</span>
                    {getFileStatusBadge(file)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({formatFileSize(file.size)}) • {file.type}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploadingFiles}
          className="shrink-0"
          title="Upload files (text, images, PDFs)"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,text/*,.pdf,.doc,.docx,.txt"
        />

        {/* Text Input Container */}
        <div className="flex-1 relative">
          <MarkdownInput
            value={message}
            onChange={setMessage}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className="min-h-[40px] resize-none pr-12"
            style={{ height: 'auto' }}
          />

          {/* Character Count */}
          {message.length > 100 && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground z-10">
              {message.length}
            </div>
          )}
        </div>

        {/* Web Search Toggle Button */}
        {onWebSearchToggle && (
          <Button
            variant={webSearchEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => onWebSearchToggle(!webSearchEnabled)}
            disabled={disabled}
            className={`shrink-0 transition-all duration-200 relative ${
              webSearchEnabled 
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                : 'border-gray-300 hover:border-blue-400 hover:text-blue-600'
            }`}
            title={webSearchEnabled ? "Web search enabled - Click to disable" : "Web search disabled - Click to enable"}
          >
            <div className="relative">
              🌐
              {webSearchEnabled && (
                <Search className="w-2 h-2 absolute -top-1 -right-1 bg-blue-600 rounded-full text-white p-0.5" />
              )}
            </div>
          </Button>
        )}

        {/* Voice Recording Button */}
        <Button
          variant={isRecording ? "destructive" : "ghost"}
          size="sm"
          onClick={toggleRecording}
          disabled={disabled}
          className="shrink-0"
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="sm"
          className="shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between text-xs text-muted-foreground cultural-bg rounded-lg p-2">
        <div className="flex items-center gap-4">
          <span className="cultural-text-primary">
            Model: <span className="font-medium cultural-text-accent">{modelInfo.displayName}</span>
          </span>

          {/* Web Search Status Indicator */}
          {onWebSearchToggle && (
            <div className="flex items-center gap-1">
              <span className="cultural-text-primary">Web Search:</span>
              <span className={`font-medium px-1.5 py-0.5 rounded text-xs ${
                webSearchEnabled 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {webSearchEnabled ? '🌐 ON' : 'OFF'}
              </span>
            </div>
          )}
          
          {/* Shortcut hints */}
          <div className="hidden sm:flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 cultural-card rounded text-xs cultural-border">Enter</kbd>
            <span className="cultural-text-primary">to send</span>
            <kbd className="px-1.5 py-0.5 cultural-card rounded text-xs cultural-border">Shift+Enter</kbd>
            <span className="cultural-text-primary">for new line</span>
            <span className="cultural-text-primary">• Use </span>
            <code className="px-1 py-0.5 cultural-card rounded text-xs cultural-border">**bold**</code>
            <span className="cultural-text-primary">, </span>
            <code className="px-1 py-0.5 cultural-card rounded text-xs cultural-border">*italic*</code>
            <span className="cultural-text-primary">, </span>
            <code className="px-1 py-0.5 cultural-card rounded text-xs cultural-border">`code`</code>
            <span className="cultural-text-primary">, </span>
            <code className="px-1 py-0.5 cultural-card rounded text-xs cultural-border">```lang</code>
          </div>
        </div>

        {/* Model Switcher Hint */}
        <div className="hidden md:block">
          <span className="cultural-text-primary">Press </span>
          <kbd className="px-1.5 py-0.5 cultural-card rounded text-xs cultural-border">Ctrl+K</kbd>
          <span className="cultural-text-primary"> to switch models</span>
        </div>
      </div>

      {/* Recording Indicator & Transcription Preview */}
      {(isRecording || transcriptionPreview) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center justify-center gap-2 p-3 rounded-lg border ${
            isRecording 
              ? 'bg-red-500/10 border-red-400/30 text-red-400' 
              : isTranscribing
              ? 'bg-blue-500/10 border-blue-400/30 text-blue-400'
              : transcriptionPreview.includes('failed')
              ? 'bg-red-500/10 border-red-400/30 text-red-400'
              : 'bg-green-500/10 border-green-400/30 text-green-400'
          }`}
        >
          {isRecording ? (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">🎤 Recording... (Click mic to stop)</span>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </>
          ) : isTranscribing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">🧠 Transcribing audio...</span>
            </>
          ) : (
            <span className="text-sm font-medium">{transcriptionPreview}</span>
          )}
        </motion.div>
      )}
    </div>
  );
}