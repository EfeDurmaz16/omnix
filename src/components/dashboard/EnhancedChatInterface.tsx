'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownInput } from '@/components/ui/markdown-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Send, User, Loader2, Plus, MessageSquare, Settings, Upload, File, X, Zap, Brain, Sparkles, History, Trash2, Search, Mic, Square, Gauge } from 'lucide-react';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';
import { StreamingMessage, StreamChunk } from '@/components/chat/StreamingMessage';
import { useStreamingChat, ChatMessage } from '@/hooks/useStreamingChat';
import { useCodeDetection } from '@/hooks/useCodeDetection';
import { MathRenderer } from '@/components/chat/MathRenderer';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  tokens?: number;
  cost?: number;
  streaming?: boolean;
  error?: string;
  webSearchResults?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

interface EnhancedChatInterfaceProps {
  isGuest?: boolean;
  canUseChat?: boolean;
  onMessageSent?: () => void;
  guestMessageCount?: number;
  maxGuestMessages?: number;
}

const promptModes = [
  {
    id: 'flash',
    name: 'Flash',
    icon: Zap,
    description: 'Quick, concise responses',
    color: 'from-yellow-400 to-orange-500',
    glow: 'glow-orange'
  },
  {
    id: 'think',
    name: 'Think',
    icon: Brain,
    description: 'Detailed reasoning',
    color: 'from-blue-400 to-purple-500',
    glow: 'glow-purple'
  },
  {
    id: 'ultra-think',
    name: 'UltraThink',
    icon: Sparkles,
    description: 'Deep analysis',
    color: 'from-purple-400 to-pink-500',
    glow: 'glow-pink'
  }
];

export function EnhancedChatInterface({ 
  isGuest = false, 
  canUseChat = true, 
  onMessageSent,
  guestMessageCount = 0,
  maxGuestMessages = 5 
}: EnhancedChatInterfaceProps = {}) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [promptMode, setPromptMode] = useState('think');
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamingMessageRef = useRef<any>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const selectedModelInfo = availableModels.find(m => m.id === selectedModel);
  const supportsFileUpload = selectedModelInfo?.capabilities?.some(
    (cap: any) => cap.type === 'image-analysis' && cap.supported
  ) || false;

  // Streaming chat hook
  const {
    messages: streamingMessages,
    isStreaming,
    error: streamingError,
    currentStreamingId,
    sendMessage: sendStreamingMessage,
    stopStreaming,
    clearMessages: clearStreamingMessages,
    loadMessages: loadStreamingMessages,
    retryLastMessage,
    preWarmCache,
    getMemoryStats
  } = useStreamingChat(currentSessionId || 'default');

  // Code detection for messages
  const lastMessage = currentSession?.messages[currentSession.messages.length - 1];
  const { hasRunnableCode, combinedWebCode } = useCodeDetection(lastMessage?.content || '');

  // Load available models on mount
  useEffect(() => {
    console.log('🚀 EnhancedChatInterface mounted, loading data...');
    fetchAvailableModels();
    loadChatHistory();
    
    // Load preferences from localStorage after hydration
    const savedModel = localStorage.getItem('omnix-selected-model');
    const savedPromptMode = localStorage.getItem('omnix-thinking-mode');
    const savedWebSearch = localStorage.getItem('omnix-web-search-enabled');
    const savedUseStreaming = localStorage.getItem('omnix-use-streaming');
    
    if (savedModel) {
      setSelectedModel(savedModel);
    }
    if (savedPromptMode) {
      setPromptMode(savedPromptMode);
    }
    if (savedWebSearch) {
      setWebSearchEnabled(savedWebSearch === 'true');
    }
    if (savedUseStreaming !== null) {
      setUseStreaming(savedUseStreaming !== 'false');
    }
  }, []);

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem('omnix-selected-model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('omnix-thinking-mode', promptMode);
  }, [promptMode]);

  useEffect(() => {
    localStorage.setItem('omnix-web-search-enabled', webSearchEnabled.toString());
  }, [webSearchEnabled]);

  useEffect(() => {
    localStorage.setItem('omnix-use-streaming', useStreaming.toString());
  }, [useStreaming]);

  // Sync streaming messages with session messages - optimized to prevent typing lag
  useEffect(() => {
    if (currentSessionId && streamingMessages.length > 0) {
      // Debounce the expensive sync operation to avoid blocking typing
      const timeoutId = setTimeout(() => {
        const sessionMessages = streamingMessages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          model: msg.metadata?.model,
          tokens: msg.metadata?.tokens,
          cost: msg.metadata?.cost,
          streaming: msg.streaming,
          error: msg.error
        }));

        const updatedSessions = sessions.map(session =>
          session.id === currentSessionId 
            ? { ...session, messages: sessionMessages as Message[], updatedAt: new Date() }
            : session
        );
        
        // Use a lighter comparison instead of expensive JSON.stringify
        const currentSession = sessions.find(s => s.id === currentSessionId);
        const needsUpdate = !currentSession || 
          currentSession.messages.length !== sessionMessages.length ||
          (sessionMessages.length > 0 && 
           currentSession.messages[currentSession.messages.length - 1]?.content !== 
           sessionMessages[sessionMessages.length - 1]?.content);
        
        if (needsUpdate) {
          setSessions(updatedSessions);
          // Debounce the save operation separately to avoid blocking
          setTimeout(() => saveChatHistory(updatedSessions), 1000);
        }
      }, 100); // 100ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [streamingMessages, currentSessionId]);

  // Input change handler for MarkdownInput (takes value directly)
  const handleInputChange = useCallback((value: string) => {
    setInputMessage(value);
  }, []);

  // Pre-warm cache when session changes
  useEffect(() => {
    if (currentSessionId && useStreaming) {
      preWarmCache();
    }
  }, [currentSessionId, useStreaming, preWarmCache]);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, streamingMessages]);

  const fetchAvailableModels = async () => {
    try {
      console.log('🔍 Fetching available models...');
      const response = await fetch('/api/models');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Raw API response:', data);
      
      if (data.success && data.data && data.data.providers) {
        console.log('✅ Valid API response structure detected');
        const allModels = data.data.providers.flatMap((provider: any) => 
          provider.models.map((model: any) => ({
            ...model,
            provider: provider.name,
            available: provider.status === 'healthy'
          }))
        );
        console.log('🎯 Processed models:', allModels.length, allModels);
        
        setAvailableModels(allModels);
        
        // Set default model if none selected
        if (allModels.length > 0 && !selectedModel) {
          console.log('⚙️ Setting default model to:', allModels[0].id);
          setSelectedModel(allModels[0].id);
        }
      } else {
        console.log('⚠️ Unexpected response structure, using fallback models');
        
        // Ultimate fallback to hardcoded models for development
        const fallbackModels = [
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', available: true },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', available: true },
          { id: 'gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'vertex', available: true }
        ];
        console.log('🔄 Using fallback models:', fallbackModels);
        setAvailableModels(fallbackModels);
        setSelectedModel('gpt-4o-mini');
      }
    } catch (error) {
      console.error('💥 Failed to fetch models:', error);
      // Fallback to hardcoded models for development
      const fallbackModels = [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', available: true },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', available: true },
        { id: 'gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'vertex', available: true }
      ];
      setAvailableModels(fallbackModels);
      setSelectedModel('gpt-4o-mini');
    }
  };

  const loadChatHistory = async () => {
    try {
      console.log('Loading chat history from database...');
      
      if (!user?.id) {
        console.log('No user ID available, skipping chat history load');
        return;
      }

      const savedSessions = localStorage.getItem('omnix-chat-sessions');
      console.log('Loading chat history from localStorage:', savedSessions ? 'found' : 'not found');
      
      if (savedSessions) {
        try {
          const parsed = JSON.parse(savedSessions).map((session: any) => ({
            ...session,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
            messages: session.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }));
          
          setSessions(parsed);
          
          // Set current session to the most recent one
          if (parsed.length > 0) {
            setCurrentSessionId(parsed[0].id);
            
            // Load messages into streaming chat
            if (useStreaming) {
              const sessionMessages = parsed[0].messages.map((msg: Message) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
                streaming: false,
                metadata: {
                  model: msg.model,
                  tokens: msg.tokens,
                  cost: msg.cost
                }
              }));
              loadStreamingMessages(sessionMessages as ChatMessage[]);
            }
          }
        } catch (error) {
          console.error('Error parsing saved sessions:', error);
          localStorage.removeItem('omnix-chat-sessions');
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const saveChatHistory = async (updatedSessions: ChatSession[]) => {
    console.log('Saving chat history:', updatedSessions.length, 'sessions');
    
    localStorage.setItem('omnix-chat-sessions', JSON.stringify(updatedSessions));
    
    try {
      if (user?.id) {
        console.log('💾 Syncing chat sessions to database...');
        // TODO: Implement proper database sync when we have the API endpoint
      }
    } catch (error) {
      console.warn('Failed to sync to database:', error);
    }
  };

  const createNewSession = async () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('🆕 Creating new session:', newSession.id);
    
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    
    // Clear streaming messages for new session
    if (useStreaming) {
      clearStreamingMessages();
    }
    
    await saveChatHistory(updatedSessions);
  };

  const deleteSession = async (sessionId: string) => {
    console.log('🗑️ Deleting session:', sessionId);
    
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    
    if (currentSessionId === sessionId) {
      const newSessionId = updatedSessions.length > 0 ? updatedSessions[0].id : null;
      setCurrentSessionId(newSessionId);
      
      if (newSessionId && useStreaming) {
        const newSession = updatedSessions.find(s => s.id === newSessionId);
        if (newSession) {
          const sessionMessages = newSession.messages.map((msg: Message) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            streaming: false,
            metadata: { model: msg.model, tokens: msg.tokens, cost: msg.cost }
          }));
          loadStreamingMessages(sessionMessages as ChatMessage[]);
        }
      } else if (useStreaming) {
        clearStreamingMessages();
      }
    }
    
    await saveChatHistory(updatedSessions);
  };

  const updateSessionTitle = async (sessionId: string, newTitle: string) => {
    console.log('✏️ Updating session title:', sessionId, 'to:', newTitle);
    
    const updatedSessions = sessions.map(session =>
      session.id === sessionId 
        ? { ...session, title: newTitle, updatedAt: new Date() }
        : session
    );
    setSessions(updatedSessions);
    await saveChatHistory(updatedSessions);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateChatTitle = (message: string): string => {
    const cleanMessage = message.trim().replace(/\n+/g, ' ');
    
    const words = cleanMessage.split(' ');
    
    if (cleanMessage.length <= 30) {
      return cleanMessage;
    }
    
    const keyWords = words.slice(0, 5).join(' ');
    
    if (cleanMessage.toLowerCase().startsWith('how ')) {
      return 'How to ' + words.slice(1, 4).join(' ') + '...';
    } else if (cleanMessage.toLowerCase().startsWith('what ')) {
      return 'About ' + words.slice(1, 4).join(' ') + '...';
    } else if (cleanMessage.toLowerCase().startsWith('why ')) {
      return 'Why ' + words.slice(1, 4).join(' ') + '...';
    } else if (cleanMessage.toLowerCase().startsWith('can you ')) {
      return words.slice(2, 6).join(' ') + '...';
    } else if (cleanMessage.toLowerCase().startsWith('explain ')) {
      return 'Explaining ' + words.slice(1, 4).join(' ') + '...';
    }
    
    return keyWords.charAt(0).toUpperCase() + keyWords.slice(1) + '...';
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const newFile: UploadedFile = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file)
      };
      
      setUploadedFiles(prev => [...prev, newFile]);
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleVoiceRecording = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // TODO: Implement speech-to-text transcription
      console.log('🎤 Stopping voice recording...');
    } else {
      // Start recording
      setIsRecording(true);
      console.log('🎤 Starting voice recording...');
      // TODO: Implement speech recognition
    }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && uploadedFiles.length === 0) || (isStreaming && useStreaming)) return;

    // Check if guest user can still send messages
    if (isGuest && !canUseChat) {
      return;
    }

    // Call the onMessageSent callback for guest users
    if (isGuest && onMessageSent) {
      onMessageSent();
    }

    // Create session if none exists
    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSessionId = `session-${Date.now()}`;
      const newSession: ChatSession = {
        id: newSessionId,
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const newSessions = [newSession, ...sessions];
      setSessions(newSessions);
      setCurrentSessionId(newSessionId);
      sessionId = newSessionId;
    }

    // Clear uploaded files
    const messageFiles = [...uploadedFiles];
    setUploadedFiles([]);

    // Always use streaming chat for proper memory system integration
    try {
      await sendStreamingMessage(inputMessage, {
        model: selectedModel,
        temperature: promptMode === 'flash' ? 0.3 : promptMode === 'think' ? 0.7 : 1.0,
        maxTokens: 2000,
        useWebSearch: webSearchEnabled,
        memoryBudget: 2500,
        onChunk: (chunk: StreamChunk) => {
          console.log('📊 Streaming chunk:', chunk.type, chunk.content?.length);
          
          // Filter out memory_context and other system chunks from being displayed as content
          if (chunk.type === 'memory_context') {
            console.log('🧠 Memory context chunk filtered out:', chunk.content);
            return; // Don't process memory context chunks as regular content
          }
        },
        onError: (error: string) => {
          console.error('❌ Streaming error:', error);
        },
        onComplete: (message: ChatMessage) => {
          console.log('✅ Streaming complete:', message.content.length, 'chars');
        }
      });

      // Update session title if this is the first message
      if (currentSession?.messages.length === 0) {
        updateSessionTitle(sessionId, generateChatTitle(inputMessage));
      }
    } catch (error) {
      console.error('Failed to send streaming message:', error);
      // Show error to user instead of falling back to legacy API
      alert('Failed to send message. Please try again.');
    }

    setInputMessage('');
  };

  const handleLegacySendMessage = async (sessionId: string, files: UploadedFile[]) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    // Update session with user message and generate smart title
    const updatedSessions = sessions.map(session =>
      session.id === sessionId 
        ? { 
            ...session, 
            messages: [...session.messages, userMessage],
            title: session.messages.length === 0 ? generateChatTitle(inputMessage) : session.title,
            updatedAt: new Date()
          }
        : session
    );
    setSessions(updatedSessions);
    await saveChatHistory(updatedSessions);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...(sessions.find(s => s.id === sessionId)?.messages || []), userMessage].map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          model: selectedModel,
          mode: promptMode,
          sessionId: sessionId,
          files: files.map(f => ({ name: f.name, type: f.type, url: f.url })),
          enableWebSearch: webSearchEnabled
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to get response';
        
        try {
          const errorData = await response.json();
          
          if (response.status === 429) {
            errorMessage = 'Model quota exceeded. Please try a different model or wait before retrying.';
          } else if (response.status === 401) {
            errorMessage = 'Authentication failed. Please check your credentials.';
          } else if (response.status === 403) {
            errorMessage = 'Access denied. You may not have permission to use this model.';
          } else if (response.status >= 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          if (response.status === 429) {
            errorMessage = 'Model quota exceeded. Please try a different model or wait before retrying.';
          } else {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.message || data.content || 'Sorry, I encountered an error.',
        timestamp: new Date(),
        model: data.model,
        tokens: data.tokens,
        cost: data.cost,
        webSearchResults: data.webSearchResults
      };

      // Update session with assistant message
      const finalSessions = updatedSessions.map(session =>
        session.id === sessionId 
          ? { 
              ...session, 
              messages: [...session.messages, assistantMessage],
              updatedAt: new Date()
            }
          : session
      );
      setSessions(finalSessions);
      await saveChatHistory(finalSessions);

    } catch (error) {
      console.error('Error:', error);
      
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('quota exceeded')) {
          errorContent = `⚠️ ${error.message}`;
        } else if (error.message.includes('Authentication failed')) {
          errorContent = `🔒 ${error.message}`;
        } else if (error.message.includes('Access denied')) {
          errorContent = `🚫 ${error.message}`;
        } else if (error.message.includes('Server error')) {
          errorContent = `🔧 ${error.message}`;
        } else if (error.message !== 'Failed to get response') {
          errorContent = `❌ ${error.message}`;
        }
      }
      
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };

      const errorSessions = updatedSessions.map(session =>
        session.id === sessionId 
          ? { 
              ...session, 
              messages: [...session.messages, errorMessage],
              updatedAt: new Date()
            }
          : session
      );
      setSessions(errorSessions);
      await saveChatHistory(errorSessions);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const messagesToDisplay = useStreaming ? streamingMessages : (currentSession?.messages || []);

  return (
    <div className="flex h-full cultural-bg">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-full md:w-96' : 'w-16'} transition-all duration-300 cultural-card backdrop-blur-xl border-r cultural-border flex flex-col h-full`}>
        <div className="p-4 space-y-4 flex-1 min-h-0 flex flex-col">
          {/* New Chat Button */}
          <Button 
            onClick={createNewSession}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            {sidebarOpen && 'New Chat'}
          </Button>

          {sidebarOpen && (
            <>
              {/* Performance Toggle */}
              <Card className="cultural-card flex-shrink-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm cultural-text-muted flex items-center">
                    <Gauge className="w-4 h-4 mr-2" />
                    Performance Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm cultural-text-primary">Streaming</p>
                      <p className="text-xs cultural-text-muted">Real-time responses</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUseStreaming(!useStreaming)}
                      className={`${
                        useStreaming 
                          ? 'bg-green-500/20 border-green-400/50 text-green-300' 
                          : 'cultural-border cultural-text-muted'
                      }`}
                    >
                      {useStreaming ? 'ON' : 'OFF'}
                    </Button>
                  </div>
                  {showPerformanceStats && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-2 bg-slate-800/30 rounded-lg text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Cache Hit Rate:</span>
                          <span className="text-green-400">85%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Response:</span>
                          <span className="text-blue-400">1.2s</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPerformanceStats(!showPerformanceStats)}
                    className="w-full mt-2 text-xs cultural-text-muted"
                  >
                    {showPerformanceStats ? 'Hide' : 'Show'} Stats
                  </Button>
                </CardContent>
              </Card>

              {/* Prompt Mode Selector - Only show for authenticated users */}
              {!isGuest && (
                <Card className="cultural-card flex-shrink-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm cultural-text-muted">Prompt Mode</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {promptModes.map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <button
                          key={mode.id}
                          onClick={() => setPromptMode(mode.id)}
                          className={`thinking-mode-original w-full p-3 rounded-lg border transition-all duration-200 text-left ${
                            promptMode === mode.id
                              ? 'cultural-card cultural-border ring-1 ring-purple-400/30'
                              : 'cultural-card cultural-border hover:opacity-80'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-r ${mode.color}`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium cultural-text-primary text-sm">{mode.name}</h4>
                              <p className="text-xs cultural-text-muted mt-0.5">{mode.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Model Selector - Only show for authenticated users */}
              {!isGuest && (
                <Card className="cultural-card flex-shrink-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm cultural-text-muted">AI Model</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="cultural-card cultural-border cultural-text-primary h-12">
                      <SelectValue placeholder="Select a model..." />
                    </SelectTrigger>
                    <SelectContent className="cultural-card cultural-border max-h-80 w-full">
                      {availableModels.length === 0 ? (
                        <SelectItem value="loading" disabled className="cultural-text-muted">
                          Loading models...
                        </SelectItem>
                      ) : (
                        availableModels.map((model, index) => (
                        <SelectItem 
                          key={`${model.id}-${model.provider}-${index}`} 
                          value={model.id}
                            className="text-white hover:bg-slate-700 min-h-[50px] cursor-pointer"
                        >
                            <div className="flex items-center justify-between w-full min-w-[250px] py-1">
                              <div className="flex flex-col items-start">
                                <span className="text-sm font-medium">{model.name}</span>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs text-slate-400">{model.provider}</span>
                                  {model.available && (
                                    <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/30 px-1 py-0">
                                      ●
                            </Badge>
                                  )}
                                </div>
                              </div>
                          </div>
                        </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              )}

              {/* Chat History */}
              <Card className="bg-slate-800/50 border-slate-700/50 flex-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-300 flex items-center">
                    <History className="w-4 h-4 mr-2" />
                    Chat History ({sessions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 max-h-80 overflow-y-auto">
                  <div className="space-y-2">
                    {sessions.length === 0 ? (
                      <div className="text-center text-slate-400 text-sm py-8">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No chat history yet</p>
                        <p className="text-xs mt-1">Start a conversation to see it here</p>
                      </div>
                    ) : (
                      sessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => {
                            setCurrentSessionId(session.id);
                            // Load session messages into streaming chat
                            if (useStreaming) {
                              const sessionMessages = session.messages.map((msg: Message) => ({
                                id: msg.id,
                                role: msg.role,
                                content: msg.content,
                                timestamp: msg.timestamp,
                                streaming: false,
                                metadata: { model: msg.model, tokens: msg.tokens, cost: msg.cost }
                              }));
                              loadStreamingMessages(sessionMessages as ChatMessage[]);
                            }
                          }}
                          className={`p-3 rounded-xl cursor-pointer transition-all duration-200 group border ${
                            session.id === currentSessionId 
                              ? 'bg-slate-700/70 border-slate-500/50 ring-1 ring-purple-400/30 shadow-md' 
                              : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-700/40 hover:border-slate-600/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0 mr-2">
                              <p className="text-sm text-white font-medium leading-tight mb-1" title={session.title}>
                                {session.title.length > 40 ? `${session.title.slice(0, 40)}...` : session.title}
                              </p>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-400">
                                  {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
                                    Math.floor((session.updatedAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 
                                    'day'
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newTitle = prompt('Enter new title:', session.title);
                                  if (newTitle) {
                                    updateSessionTitle(session.id, newTitle);
                                  }
                                }}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 flex-shrink-0"
                                title="Edit title"
                              >
                                <Settings className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSession(session.id);
                                }}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                                title="Delete chat"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-slate-400 hover:text-white"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {currentSession && currentSession.messages && currentSession.messages.length > 0 
                    ? currentSession.title 
                    : currentSession 
                      ? 'New Chat' 
                      : 'Omnix AI Chat'
                  }
                </h2>
                <p className="text-sm text-slate-400">
                  {availableModels.find(m => m.id === selectedModel)?.name || selectedModel} • {promptMode} mode
                  {useStreaming && <span className="ml-2 text-green-400">• Streaming</span>}
                  {currentSession && currentSession.messages && currentSession.messages.length > 0 && (
                    <span className="ml-2">• {currentSession.messages.length} messages</span>
                  )}
                  {!supportsFileUpload && (
                    <span className="ml-2 text-orange-400">• File upload disabled</span>
                  )}
                        </p>
                      </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Stop Streaming Button */}
              {isStreaming && useStreaming && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopStreaming}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              )}
              
              {/* User Plan Badge */}
              {user && (
                <Badge 
                  variant="outline" 
                  className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-400/30 text-purple-300"
                >
                  {user.plan?.toUpperCase() || 'FREE'} Plan
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentSession || messagesToDisplay.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Start a Conversation</h3>
                <p className="text-slate-400">Choose your AI model and prompt mode, then begin chatting</p>
                    </div>
                  </div>
                ) : (
            messagesToDisplay.map((message) => (
                    <div
                      key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  {message.role === 'assistant' && message.streaming && useStreaming ? (
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                      {/* Use MathRenderer for proper markdown and math rendering during streaming */}
                      <div className="text-white">
                        <MathRenderer content={message.content} isStreaming={true} />
                        {isStreaming && (
                          <span className="animate-pulse ml-1">|</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-4 rounded-2xl ${
                            message.role === 'user' 
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                          : 'bg-slate-800/50 border border-slate-700/50 text-white'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <MathRenderer content={message.content} />
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      
                      {/* Web Search Results */}
                      {message.role === 'assistant' && (message as any).webSearchResults && (message as any).webSearchResults.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-600/30">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center">
                              <span className="text-emerald-400 text-sm">🌐</span>
                              <Search className="w-2 h-2 text-emerald-400 ml-1" />
                            </div>
                            <span className="text-xs text-emerald-400 font-medium">
                              Web Sources ({(message as any).webSearchResults.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {(message as any).webSearchResults.map((result: any, index: number) => (
                              <a
                                key={index}
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-600/30 hover:border-emerald-400/30"
                              >
                                <div className="text-xs font-medium text-emerald-300 mb-1 line-clamp-1">
                                  {result.title}
                                </div>
                                <div className="text-xs text-slate-400 line-clamp-2">
                                  {result.snippet}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 truncate">
                                  {result.url}
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2 flex items-center justify-between text-xs opacity-70">
                        <div className="flex items-center gap-3">
                          <span>{formatTimestamp(message.timestamp)}</span>
                          {message.role === 'assistant' && (message as any).webSearchResults && (message as any).webSearchResults.length > 0 && (
                            <div className="flex items-center gap-1 text-emerald-400">
                              <span className="text-xs">🌐</span>
                              <span>Web enhanced</span>
                            </div>
                          )}
                          {message.error && (
                            <span className="text-red-400">Error</span>
                          )}
                        </div>
                        {message.role === 'assistant' && (message as any).tokens && (
                          <span>{(message as any).tokens} tokens</span>
                        )}
                            </div>
                          </div>
                  )}
                      </div>
                <Avatar className={`${message.role === 'user' ? 'order-1 ml-2' : 'order-2 mr-2'} w-8 h-8`}>
                  <AvatarFallback className={message.role === 'user' ? 'bg-purple-500' : 'bg-slate-700'}>
                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </AvatarFallback>
                          </Avatar>
                    </div>
                  ))
                )}
          
          {/* Streaming Error Display */}
          {streamingError && useStreaming && (
            <div className="flex justify-start">
              <div className="bg-red-900/20 border border-red-800 p-4 rounded-2xl max-w-[80%]">
                <p className="text-red-400">{streamingError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => retryLastMessage()}
                  className="mt-2 border-red-500/50 text-red-400 hover:bg-red-500/20"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
          
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-xl">
          {/* File Upload Area */}
          {uploadedFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center space-x-2 bg-slate-800/50 p-2 rounded-lg">
                  <File className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-white flex-1">{file.name}</span>
                  <span className="text-xs text-slate-400">{formatFileSize(file.size)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <MarkdownInput
                        value={inputMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        placeholder={webSearchEnabled ? "Ask a question and I'll search the web for current information..." : "Type your message..."}
                className="min-h-[60px] max-h-32 bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-400 resize-none"
                        disabled={isStreaming || (isGuest && !canUseChat)}
                      />
                    </div>
            
            <div className="flex flex-col space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {/* Web Search Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                className={`border-slate-700/50 transition-all relative ${
                  webSearchEnabled 
                    ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30 shadow-lg shadow-emerald-500/20' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/30'
                }`}
                disabled={isStreaming}
                title={webSearchEnabled ? "Web search enabled - will search for current information" : "Enable web search for real-time information"}
              >
                <div className="relative flex items-center">
                  <Search className="w-4 h-4" />
                  <span className={`text-xs absolute -top-1 -right-2 transition-all ${
                    webSearchEnabled ? 'text-emerald-200' : 'text-slate-400'
                  }`}>🌐</span>
                </div>
                {webSearchEnabled && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                )}
              </Button>

              {/* Voice Recording */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleVoiceRecording}
                className={`border-slate-700/50 transition-all ${
                  isRecording 
                    ? 'bg-red-500/20 border-red-400/50 text-red-300 animate-pulse' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/30'
                }`}
                disabled={isStreaming}
                title={isRecording ? "Recording... Click to stop" : "Start voice recording"}
              >
                <Mic className="w-4 h-4" />
              </Button>
              
              {!isGuest && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                                  className={`border-slate-700/50 transition-all ${
                    supportsFileUpload 
                      ? 'text-slate-300 hover:text-white hover:bg-slate-700/30' 
                      : 'text-slate-500 cursor-not-allowed opacity-50'
                  }`}
                  disabled={isStreaming || !supportsFileUpload}
                  title={
                    supportsFileUpload 
                      ? 'Upload files (images, PDFs, documents)' 
                      : `File upload not supported by ${selectedModelInfo?.name || 'this model'}`
                  }
                >
                  <Upload className="w-4 h-4" />
                </Button>
              )}
              
                      <Button 
                        onClick={handleSendMessage} 
                disabled={(!inputMessage.trim() && uploadedFiles.length === 0) || isStreaming || (isGuest && !canUseChat)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0"
                title={isGuest && !canUseChat ? 'Sign up to continue chatting' : 'Send message'}
                      >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}