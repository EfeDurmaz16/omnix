import { useState, useCallback, useRef } from 'react';
import { StreamChunk } from '@/components/chat/StreamingMessage';

export interface ChatMessage {
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
}

export interface StreamingChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useWebSearch?: boolean;
  memoryBudget?: number;
  onChunk?: (chunk: StreamChunk) => void;
  onError?: (error: string) => void;
  onComplete?: (message: ChatMessage) => void;
}

export interface StreamingChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  currentStreamingId: string | null;
}

export const useStreamingChat = (chatId: string) => {
  const [state, setState] = useState<StreamingChatState>({
    messages: [],
    isStreaming: false,
    error: null,
    currentStreamingId: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageRef = useRef<ChatMessage | null>(null);
  const accumulatedContentRef = useRef<string>('');

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
  const addMessage = useCallback((message: ChatMessage) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message]
    }));
  }, []);

  // Update streaming message
  const updateStreamingMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      )
    }));
  }, []);

  // Send message with streaming
  const sendMessage = useCallback(async (
    content: string, 
    options: StreamingChatOptions = {}
  ): Promise<ChatMessage | null> => {
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
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date()
      };
      addMessage(userMessage);

      // Create assistant message placeholder
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        streaming: true
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

      // The response should be a streaming response
      // We'll read it as a stream and parse Server-Sent Events manually
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
              setState(prev => ({
                ...prev,
                isStreaming: false,
                currentStreamingId: null
              }));

              if (currentMessageRef.current) {
                const finalMessage = {
                  ...currentMessageRef.current,
                  content: accumulatedContentRef.current,
                  streaming: false
                };
                
                updateStreamingMessage(assistantMessage.id, {
                  content: accumulatedContentRef.current,
                  streaming: false
                });

                onComplete?.(finalMessage);
                return finalMessage;
              }
              break;
            }

            try {
              const chunk: StreamChunk = JSON.parse(data);
              
              // Handle different chunk types
              if (chunk.type === 'error') {
                const errorMsg = chunk.content;
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

              if (chunk.type === 'done') {
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  currentStreamingId: null
                }));

                if (currentMessageRef.current) {
                  const finalMessage = {
                    ...currentMessageRef.current,
                    content: accumulatedContentRef.current,
                    streaming: false
                  };
                  
                  updateStreamingMessage(assistantMessage.id, {
                    content: accumulatedContentRef.current,
                    streaming: false
                  });

                  onComplete?.(finalMessage);
                  return finalMessage;
                }
                break;
              }

              // Handle text content - accumulate properly
              if (chunk.type === 'text') {
                // Add ONLY the new chunk content (not cumulative)
                accumulatedContentRef.current += chunk.content;
                
                // Update the streaming message with accumulated content
                updateStreamingMessage(assistantMessage.id, {
                  content: accumulatedContentRef.current
                });
              }

              // Call chunk handler
              onChunk?.(chunk);

            } catch (parseError) {
              console.warn('Failed to parse chunk:', data, parseError);
            }
          }
        }
      }

      return null;

    } catch (error: any) {
      console.error('Streaming chat error:', error);
      
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
  }, [chatId, cleanup, addMessage, updateStreamingMessage]);

  // Stop current streaming
  const stopStreaming = useCallback(() => {
    cleanup();
    
    setState(prev => ({
      ...prev,
      isStreaming: false,
      currentStreamingId: null
    }));

    if (currentMessageRef.current) {
      updateStreamingMessage(currentMessageRef.current.id, {
        content: accumulatedContentRef.current,
        streaming: false
      });
    }
  }, [cleanup, updateStreamingMessage]);

  // Clear messages
  const clearMessages = useCallback(() => {
    cleanup();
    setState({
      messages: [],
      isStreaming: false,
      error: null,
      currentStreamingId: null
    });
  }, [cleanup]);

  // Load existing messages (for when component mounts)
  const loadMessages = useCallback((messages: ChatMessage[]) => {
    setState(prev => ({
      ...prev,
      messages: messages.map(msg => ({ ...msg, streaming: false }))
    }));
  }, []);

  // Retry last message
  const retryLastMessage = useCallback((options?: StreamingChatOptions) => {
    const lastUserMessage = state.messages
      .filter(msg => msg.role === 'user')
      .pop();

    if (lastUserMessage) {
      // Remove failed assistant message if present
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => 
          !(msg.role === 'assistant' && msg.error)
        ),
        error: null
      }));

      return sendMessage(lastUserMessage.content, options);
    }

    return Promise.resolve(null);
  }, [state.messages, sendMessage]);

  // Pre-warm cache for better performance
  const preWarmCache = useCallback(async () => {
    try {
      await fetch(`/api/chat/stream?action=pre-warm&chatId=${chatId}`, {
        method: 'GET'
      });
    } catch (error) {
      console.warn('Failed to pre-warm cache:', error);
    }
  }, [chatId]);

  // Get memory stats
  const getMemoryStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/stream?action=memory-stats`, {
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    } catch (error) {
      console.warn('Failed to get memory stats:', error);
    }
    return null;
  }, []);

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
    retryLastMessage,
    preWarmCache,
    getMemoryStats,
    
    // Utils
    cleanup
  };
};

export default useStreamingChat;