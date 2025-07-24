import { useState, useCallback, useRef, useEffect } from 'react';
import { EnhancedStreamProcessor, CodeBlock } from '@/lib/streaming/EnhancedStreamProcessor';
import { CodePreviewService, PreviewResult } from '@/lib/services/CodePreviewService';
import { SSEFormatter } from '@/lib/streaming/SSEFormatter';

export interface EnhancedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streaming?: boolean;
  error?: string;
  metadata?: {
    model?: string;
    tokens?: number;
    cost?: number;
    retrievalTime?: number;
    cacheHit?: boolean;
  };
  codeBlocks?: Map<string, CodeBlock>;
  previews?: Map<string, PreviewResult>;
  processedContent?: string;
}

export interface EnhancedStreamingOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useWebSearch?: boolean;
  memoryBudget?: number;
  onChunk?: (chunk: any) => void;
  onError?: (error: string) => void;
  onComplete?: (message: EnhancedMessage) => void;
}

export interface EnhancedStreamingState {
  messages: EnhancedMessage[];
  isStreaming: boolean;
  error: string | null;
  currentStreamingId: string | null;
}

export function useEnhancedStreaming(chatId: string) {
  const [state, setState] = useState<EnhancedStreamingState>({
    messages: [],
    isStreaming: false,
    error: null,
    currentStreamingId: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageRef = useRef<EnhancedMessage | null>(null);
  const accumulatedContentRef = useRef<string>('');
  
  const streamProcessor = useRef(new EnhancedStreamProcessor());
  const codePreview = useRef(new CodePreviewService());

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Add message to state
  const addMessage = useCallback((message: EnhancedMessage) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message]
    }));
  }, []);

  // Update streaming message
  const updateStreamingMessage = useCallback((id: string, updates: Partial<EnhancedMessage>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      )
    }));
  }, []);

  const handleStreamChunk = useCallback(async (chunk: string) => {
    const processed = streamProcessor.current.processChunk(chunk);
    
    if (!currentMessageRef.current) return;

    const currentMessage = currentMessageRef.current;
    let updates: Partial<EnhancedMessage> = {};

    if (processed.type === 'code-complete') {
      // Handle complete code blocks
      const codeBlocks = currentMessage.codeBlocks || new Map();
      const codeId = `code-${Date.now()}`;
      
      codeBlocks.set(codeId, {
        language: processed.language || 'plaintext',
        content: processed.content || ''
      });

      // Generate preview for complete code blocks
      if (processed.content && processed.language) {
        const preview = await codePreview.current.generatePreview(
          processed.content,
          processed.language
        );
        
        const previews = currentMessage.previews || new Map();
        previews.set(codeId, preview);
        
        updates.previews = previews;
      }

      updates.codeBlocks = codeBlocks;
      updates.content = (currentMessage.content || '') + `\n%%CODE_BLOCK_${codeId}%%\n`;
      updates.processedContent = (currentMessage.processedContent || '') + (processed.raw || '');
    } else if (processed.type === 'markdown' && processed.content) {
      updates.content = (currentMessage.content || '') + processed.content;
      updates.processedContent = (currentMessage.processedContent || '') + processed.content;
    }

    // Update the current message
    Object.assign(currentMessageRef.current, updates);
    
    // Update state
    updateStreamingMessage(currentMessage.id, {
      ...updates,
      streaming: true
    });

    // Track total content
    accumulatedContentRef.current += chunk;
  }, [updateStreamingMessage]);

  const finalizeMessage = useCallback(() => {
    if (!currentMessageRef.current) return;

    const finalized: EnhancedMessage = {
      ...currentMessageRef.current,
      content: streamProcessor.current.finalize(currentMessageRef.current.content || ''),
      streaming: false
    };
    
    updateStreamingMessage(finalized.id, {
      content: finalized.content,
      streaming: false
    });

    setState(prev => ({
      ...prev,
      isStreaming: false,
      currentStreamingId: null
    }));

    currentMessageRef.current = null;
    accumulatedContentRef.current = '';
  }, [updateStreamingMessage]);

  // Send message with enhanced streaming
  const sendMessage = useCallback(async (
    content: string, 
    options: EnhancedStreamingOptions = {}
  ): Promise<EnhancedMessage | null> => {
    try {
      // Cleanup any existing stream
      cleanup();

      const {
        model = 'gpt-4',
        temperature = 0.7,
        maxTokens = 2000,
        useWebSearch = false,
        memoryBudget = 2500,
        onChunk,
        onError,
        onComplete
      } = options;

      // Add user message
      const userMessage: EnhancedMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date()
      };
      addMessage(userMessage);

      // Create assistant message placeholder
      const assistantMessage: EnhancedMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        streaming: true,
        codeBlocks: new Map(),
        previews: new Map(),
        processedContent: ''
      };
      addMessage(assistantMessage);
      currentMessageRef.current = assistantMessage;
      accumulatedContentRef.current = '';

      setState(prev => ({
        ...prev,
        isStreaming: true,
        error: null,
        currentStreamingId: assistantMessage.id
      }));

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Send POST request to initiate streaming
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          model,
          chatId,
          temperature,
          maxTokens,
          useWebSearch,
          memoryBudget
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              // Streaming complete
              finalizeMessage();
              
              if (currentMessageRef.current) {
                const finalMessage = currentMessageRef.current;
                onComplete?.(finalMessage);
                return finalMessage;
              }
              break;
            }

            try {
              const events = SSEFormatter.parseSSE(line);
              
              for (const event of events) {
                // Handle different event types
                if (event.type === 'error') {
                  const errorMsg = event.content;
                  setState(prev => ({
                    ...prev,
                    error: errorMsg,
                    isStreaming: false,
                    currentStreamingId: null
                  }));
                  
                  updateStreamingMessage(assistantMessage.id, {
                    error: errorMsg,
                    streaming: false
                  });
                  
                  onError?.(errorMsg);
                  return null;
                }

                if (event.type === 'done') {
                  finalizeMessage();
                  
                  if (currentMessageRef.current) {
                    const finalMessage = currentMessageRef.current;
                    onComplete?.(finalMessage);
                    return finalMessage;
                  }
                  break;
                }

                // Handle memory context chunks (don't add to message content)
                if (event.type === 'memory_context') {
                  console.log('📝 Memory context:', event.content, event.metadata);
                  // Memory context is handled by the UI components
                }
                // Handle text content with enhanced processing
                else if (event.type === 'text') {
                  await handleStreamChunk(event.content);
                }

                // Call chunk handler
                onChunk?.(event);
              }

            } catch (parseError) {
              console.warn('Failed to parse chunk:', data, parseError);
            }
          }
        }
      }

      return null;

    } catch (error: any) {
      console.error('Enhanced streaming error:', error);
      
      const errorMessage = error.name === 'AbortError' 
        ? 'Request cancelled' 
        : error.message || 'An unexpected error occurred';

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isStreaming: false,
        currentStreamingId: null
      }));

      if (currentMessageRef.current) {
        updateStreamingMessage(currentMessageRef.current.id, {
          error: errorMessage,
          streaming: false
        });
      }

      onError?.(errorMessage);
      return null;
    }
  }, [chatId, cleanup, addMessage, updateStreamingMessage, handleStreamChunk, finalizeMessage]);

  // Stop current streaming
  const stopStreaming = useCallback(() => {
    cleanup();
    finalizeMessage();
  }, [cleanup, finalizeMessage]);

  // Clear messages
  const clearMessages = useCallback(() => {
    cleanup();
    setState({
      messages: [],
      isStreaming: false,
      error: null,
      currentStreamingId: null
    });
    
    // Clear preview cache
    codePreview.current.clearCache();
  }, [cleanup]);

  // Load existing messages
  const loadMessages = useCallback((messages: EnhancedMessage[]) => {
    setState(prev => ({
      ...prev,
      messages: messages.map(msg => ({ ...msg, streaming: false }))
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    messages: state.messages,
    isStreaming: state.isStreaming,
    error: state.error,
    currentStreamingId: state.currentStreamingId,
    
    // Actions
    sendMessage,
    stopStreaming,
    clearMessages,
    loadMessages,
    
    // Utils
    cleanup
  };
}

export default useEnhancedStreaming;