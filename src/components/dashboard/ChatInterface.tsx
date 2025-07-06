'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Send, User, Loader2, Plus, MessageSquare, Settings, Upload, File, X, Zap, Brain, Sparkles, History, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  model?: string;
  tokens?: number;
  cost?: number;
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

interface ChatInterfaceProps {
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

export function ChatInterface({ 
  isGuest = false, 
  canUseChat = true, 
  onMessageSent,
  guestMessageCount = 0,
  maxGuestMessages = 5 
}: ChatInterfaceProps = {}) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [promptMode, setPromptMode] = useState('think');
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const selectedModelInfo = availableModels.find(m => m.id === selectedModel);
  const supportsFileUpload = selectedModelInfo?.capabilities?.some(
    (cap: any) => cap.type === 'image-analysis' && cap.supported
  ) || false;

  // Load available models on mount
  useEffect(() => {
    console.log('🚀 ChatInterface mounted, loading data...');
    fetchAvailableModels();
    loadChatHistory();
    
    // Load preferences from localStorage after hydration
    const savedModel = localStorage.getItem('omnix-selected-model');
    const savedPromptMode = localStorage.getItem('omnix-thinking-mode');
    const savedWebSearch = localStorage.getItem('omnix-web-search-enabled');
    
    if (savedModel) {
      setSelectedModel(savedModel);
    }
    if (savedPromptMode) {
      setPromptMode(savedPromptMode);
    }
    if (savedWebSearch) {
      setWebSearchEnabled(savedWebSearch === 'true');
    }
  }, []);

  // Persist selectedModel to localStorage
  useEffect(() => {
    localStorage.setItem('omnix-selected-model', selectedModel);
  }, [selectedModel]);

  // Persist promptMode to localStorage
  useEffect(() => {
    localStorage.setItem('omnix-thinking-mode', promptMode);
  }, [promptMode]);

  // Persist webSearchEnabled to localStorage
  useEffect(() => {
    localStorage.setItem('omnix-web-search-enabled', webSearchEnabled.toString());
  }, [webSearchEnabled]);

  // Debug sessions changes
  useEffect(() => {
    console.log('📊 Sessions state changed:', {
      count: sessions.length,
      currentSessionId,
      sessions: sessions.map(s => ({ id: s.id, title: s.title, msgCount: s.messages.length }))
    });
  }, [sessions, currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

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
        console.log('🔍 Claude models found:', allModels.filter((m: any) => m.id.includes('claude')));
        console.log('🔍 Claude Sonnet 4 specifically:', allModels.find((m: any) => m.id === 'claude-sonnet-4-20250514'));
        
        // Debug: Ensure Claude Sonnet 4 is included
        const claudeSonnet4Exists = allModels.find((m: any) => m.id === 'claude-sonnet-4-20250514');
        if (!claudeSonnet4Exists) {
          console.log('⚠️ Claude Sonnet 4 missing, adding manually for debug');
          allModels.push({
            id: 'claude-sonnet-4-20250514',
            name: 'Claude 4 Sonnet',
            provider: 'vertex',
            type: 'text',
            available: true
          });
        }
        
        setAvailableModels(allModels);
        
        // Set default model if none selected
        if (allModels.length > 0 && !selectedModel) {
          console.log('⚙️ Setting default model to:', allModels[0].id);
          setSelectedModel(allModels[0].id);
        }
      } else if (data.error) {
        console.error('❌ API returned error:', data.error);
        throw new Error(data.error);
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
      console.log('🔄 Using fallback models due to error:', fallbackModels);
      setAvailableModels(fallbackModels);
      setSelectedModel('gpt-4o-mini');
    }
  };

  const loadChatHistory = async () => {
    // Load from database instead of localStorage for consistency
    try {
      console.log('Loading chat history from database...');
      
      if (!user?.id) {
        console.log('No user ID available, skipping chat history load');
        return;
      }

      // For now, keep localStorage as fallback while we migrate to proper database integration
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
          
          console.log('Loaded sessions:', parsed.length, parsed.map((s: ChatSession) => ({ id: s.id, title: s.title, msgCount: s.messages.length })));
          setSessions(parsed);
          
          // Set current session to the most recent one
          if (parsed.length > 0) {
            setCurrentSessionId(parsed[0].id);
            console.log('Set current session to:', parsed[0].id);
          }
        } catch (error) {
          console.error('Error parsing saved sessions:', error);
          localStorage.removeItem('omnix-chat-sessions'); // Clear corrupted data
        }
      } else {
        console.log('No saved sessions found');
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const saveChatHistory = async (updatedSessions: ChatSession[]) => {
    console.log('Saving chat history:', updatedSessions.length, 'sessions');
    console.log('Sessions:', updatedSessions.map((s: ChatSession) => ({ id: s.id, title: s.title, msgCount: s.messages.length })));
    
    // Save to localStorage for immediate access
    localStorage.setItem('omnix-chat-sessions', JSON.stringify(updatedSessions));
    
    // Also sync to database for persistence across devices
    try {
      if (user?.id) {
        console.log('💾 Syncing chat sessions to database...');
        // TODO: Implement proper database sync when we have the API endpoint
        // For now, just localStorage is used
      }
    } catch (error) {
      console.warn('Failed to sync to database:', error);
    }
  };

  const createNewSession = async () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique ID
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('🆕 Creating new session:', newSession.id);
    
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    setCurrentSessionId(newSession.id);
    await saveChatHistory(updatedSessions);
  };

  const deleteSession = async (sessionId: string) => {
    console.log('🗑️ Deleting session:', sessionId);
    
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    
    if (currentSessionId === sessionId) {
      setCurrentSessionId(updatedSessions.length > 0 ? updatedSessions[0].id : null);
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
    // Clean and truncate message for title
    const cleanMessage = message.trim().replace(/\n+/g, ' ');
    
    // Extract key topics/subjects
    const words = cleanMessage.split(' ');
    
    // If message is short, use it directly
    if (cleanMessage.length <= 30) {
      return cleanMessage;
    }
    
    // For longer messages, create a smart title
    const keyWords = words.slice(0, 5).join(' '); // First 5 words
    
    // Look for question patterns
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
    
    // Default: use first few words with proper capitalization
    return keyWords.charAt(0).toUpperCase() + keyWords.slice(1) + '...';
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      // In production, upload to your storage service
      const newFile: UploadedFile = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file) // Temporary URL for preview
      };
      
      setUploadedFiles(prev => [...prev, newFile]);
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && uploadedFiles.length === 0) || loading) return;

    // Check if guest user can still send messages
    if (isGuest && !canUseChat) {
      return; // Guest has exceeded their limit
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
    await saveChatHistory(updatedSessions); // Save immediately after user message

    setInputMessage('');
    setUploadedFiles([]);
    setLoading(true);

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
          files: uploadedFiles.map(f => ({ name: f.name, type: f.type, url: f.url })),
          enableWebSearch: webSearchEnabled
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to get response';
        
        try {
          const errorData = await response.json();
          
          // Handle specific error cases
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
          // If we can't parse the error response, use the status code
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
      
      // Extract meaningful error message
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      if (error instanceof Error) {
        // Use the specific error message we set above
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
    } finally {
      setLoading(false);
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

  return (
    <div className="flex h-full cultural-bg">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-96' : 'w-16'} transition-all duration-300 cultural-card backdrop-blur-xl border-r cultural-border flex flex-col h-full`}>
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
                        availableModels.map((model) => (
                        <SelectItem 
                          key={model.id} 
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
                    {/* Debug button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const testSession: ChatSession = {
                          id: `test-${Date.now()}`,
                          title: 'Test Chat Session',
                          messages: [
                            {
                              id: 'test-msg-1',
                              role: 'user',
                              content: 'Hello test',
                              timestamp: new Date()
                            }
                          ],
                          createdAt: new Date(),
                          updatedAt: new Date()
                        };
                        setSessions(prev => [testSession, ...prev]);
                        console.log('🔧 Added test session');
                      }}
                      className="ml-auto h-5 w-5 p-0 text-xs text-slate-500 hover:text-white"
                      title="Add test session (debug)"
                    >
                      +
                    </Button>
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
                          onClick={() => setCurrentSessionId(session.id)}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSession(session.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                              title="Delete chat"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
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
                  {currentSession && currentSession.messages && currentSession.messages.length > 0 && (
                    <span className="ml-2">• {currentSession.messages.length} messages</span>
                  )}
                  {!supportsFileUpload && (
                    <span className="ml-2 text-orange-400">• File upload disabled</span>
                  )}
                        </p>
                      </div>
            </div>
            
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentSession || currentSession.messages.length === 0 ? (
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
            currentSession.messages.map((message) => (
                    <div
                      key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`p-4 rounded-2xl ${
                          message.role === 'user' 
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                        : 'bg-slate-800/50 border border-slate-700/50 text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Web Search Results */}
                    {message.role === 'assistant' && message.webSearchResults && message.webSearchResults.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-600/30">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center">
                            <span className="text-emerald-400 text-sm">🌐</span>
                            <Search className="w-2 h-2 text-emerald-400 ml-1" />
                          </div>
                          <span className="text-xs text-emerald-400 font-medium">
                            Web Sources ({message.webSearchResults.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {message.webSearchResults.map((result, index) => (
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
                        {message.role === 'assistant' && message.webSearchResults && message.webSearchResults.length > 0 && (
                          <div className="flex items-center gap-1 text-emerald-400">
                            <span className="text-xs">🌐</span>
                            <span>Web enhanced</span>
                          </div>
                        )}
                      </div>
                      {message.role === 'assistant' && message.tokens && (
                        <span>{message.tokens} tokens</span>
                      )}
                          </div>
                        </div>
                      </div>
                <Avatar className={`${message.role === 'user' ? 'order-1 ml-2' : 'order-2 mr-2'} w-8 h-8`}>
                  <AvatarFallback className={message.role === 'user' ? 'bg-purple-500' : 'bg-slate-700'}>
                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </AvatarFallback>
                          </Avatar>
                    </div>
                  ))
                )}
                {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
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
              <Textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={webSearchEnabled ? "Ask a question and I'll search the web for current information..." : "Type your message..."}
                className="min-h-[60px] max-h-32 bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-400 resize-none"
                        disabled={loading || (isGuest && !canUseChat)}
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
                disabled={loading}
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
                  disabled={loading || !supportsFileUpload}
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
                disabled={(!inputMessage.trim() && uploadedFiles.length === 0) || loading || (isGuest && !canUseChat)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0"
                title={isGuest && !canUseChat ? 'Sign up to continue chatting' : 'Send message'}
                      >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 