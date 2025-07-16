"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, Settings, Plus, ChevronDown, Zap, Brain, Sparkles, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatSidebar } from './ChatSidebar';
import { ChatHeader } from './ChatHeader';
import { MessagesContainer } from './MessagesContainer';
import { EnhancedChatInput } from './EnhancedChatInput';
import { RealtimeVoiceChat } from './RealtimeVoiceChat';
import { AdvancedModelSearch } from '../models/AdvancedModelSearch';
import { useAuth } from '@/components/auth/ClerkAuthWrapper';
import { autoRouter } from '@/lib/routing/AutoRouter';
import { useModelInfo } from '@/hooks/useModelInfo';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
  model: string;
}

// Custom icon component for brain explosion emoji  
const BrainBombed = ({ className }: { className?: string }) => (
  <span className={`${className || 'text-sm'} flex items-center justify-center leading-none`}>🤯</span>
);

const thinkingModes = [
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
  },
  {
    id: 'full-think',
    name: 'FullThink',
    icon: BrainBombed,
    description: 'Maximum creativity with high temperature',
    color: 'from-red-400 to-orange-600',
    glow: 'glow-red'
  }
];

interface ModernChatInterfaceProps {
  onModelRedirect?: (tab: string) => void;
}

export function ModernChatInterface({ onModelRedirect }: ModernChatInterfaceProps = {}) {
  const { user, refreshUsageStats } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showModelSearch, setShowModelSearch] = useState(false);
  const [thinkingMode, setThinkingMode] = useState('think');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [autoRoutingEnabled, setAutoRoutingEnabled] = useState(false);
  const modelInfo = useModelInfo(selectedModel);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Load conversations and preferences on mount
  useEffect(() => {
    loadConversations();

    // Load preferences from localStorage after hydration
    const savedModel = localStorage.getItem('omnix-selected-model');
    const savedThinkingMode = localStorage.getItem('omnix-thinking-mode');
    const savedAutoRouting = localStorage.getItem('omnix-auto-routing');
    const savedWebSearch = localStorage.getItem('omnix-web-search-enabled');

    if (savedModel) {
      setSelectedModel(savedModel);
    }
    if (savedThinkingMode) {
      setThinkingMode(savedThinkingMode);
    }
    if (savedAutoRouting) {
      setAutoRoutingEnabled(savedAutoRouting === 'true');
    }
    if (savedWebSearch) {
      setWebSearchEnabled(savedWebSearch === 'true');
    }
  }, []);

  // Persist conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('omnix-conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Persist selectedModel to localStorage
  useEffect(() => {
    localStorage.setItem('omnix-selected-model', selectedModel);
  }, [selectedModel]);

  // Persist thinkingMode to localStorage
  useEffect(() => {
    localStorage.setItem('omnix-thinking-mode', thinkingMode);
  }, [thinkingMode]);

  // Persist autoRoutingEnabled to localStorage
  useEffect(() => {
    localStorage.setItem('omnix-auto-routing', autoRoutingEnabled.toString());
  }, [autoRoutingEnabled]);

  // Persist webSearchEnabled to localStorage
  useEffect(() => {
    localStorage.setItem('omnix-web-search-enabled', webSearchEnabled.toString());
  }, [webSearchEnabled]);

  const loadConversations = async () => {
    const savedConversations = localStorage.getItem('omnix-conversations');
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations));
      return;
    }

    try {
      // This will be replaced with actual API call
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setMessages(conversation.messages);
    setSelectedModel(conversation.model);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      updatedAt: new Date(),
      model: selectedModel
    };

    setCurrentConversation(newConversation);
    setMessages([]);
    setConversations(prev => [newConversation, ...prev]);
    setSidebarOpen(false);
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
      setIsLoading(false);
      setStreamingMessage('');
      console.log('🛑 Generation stopped by user');
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    // Find the message index
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    // Update the message content without removing subsequent messages
    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content: newContent,
      timestamp: new Date() // Update timestamp to show it was edited
    };

    // Keep all messages, just update the edited one
    setMessages(updatedMessages);

    // Automatically send the edited message to get a new AI response (this will add a new response)
    await handleSendMessage(newContent);
  };

  // Auto-routing logic to select optimal model based on query
  const getOptimalModel = async (query: string, currentModel: string): Promise<string> => {
    if (!autoRoutingEnabled || !user) return currentModel;

    try {
      const routingResult = await autoRouter.routeQuery({
        query,
        userPlan: user.plan || 'pro',
        userPreference: 'balanced',
        hasAutoRouting: true,
        currentModel,
        context: {
          conversationHistory: messages.slice(-5).map(m => m.content),
          taskComplexity: query.length < 50 ? 'low' : query.length < 200 ? 'medium' : 'high',
          expectedLength: query.includes('explain') || query.includes('describe') ? 'long' : 'medium'
        }
      });

      console.log('🤖 Auto-routing recommendation:', {
        original: currentModel,
        recommended: routingResult.recommendedModel.id,
        reason: routingResult.routingReason,
        confidence: routingResult.confidence,
        shouldRedirect: routingResult.shouldRedirect
      });

      // Switch models if confidence is high enough and it's NOT a redirect recommendation
      // (redirects should go to image/video pages, not switch chat models)
      if (routingResult.confidence > 0.6 && !routingResult.shouldRedirect && 
          routingResult.recommendedModel.id !== currentModel) {
        console.log(`🔄 Auto-routing: ${currentModel} → ${routingResult.recommendedModel.id}`);
        return routingResult.recommendedModel.id;
      }
    } catch (error) {
      console.warn('Auto-routing failed:', error);
    }

    return currentModel;
  };

  const handleSendMessage = async (content: string, files?: any[]) => {
    if (!content.trim() || isLoading) return;

    // Get optimal model if auto-routing is enabled
    const optimalModel = await getOptimalModel(content.trim(), selectedModel);
    if (optimalModel !== selectedModel) {
      console.log(`🔄 Auto-routing: ${selectedModel} → ${optimalModel}`);
      setSelectedModel(optimalModel);
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      model: optimalModel
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsThinking(true);
    setIsLoading(true);
    setStreamingMessage('');

    // Create abort controller for this request with longer timeout
    const controller = new AbortController();
    setAbortController(controller);
    
    // Set a reasonable timeout for API responses (45 seconds for RAG + web search)
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('🕐 Request timed out after 45 seconds');
    }, 45000);

    try {
      // Show thinking state for more advanced models
      if (['o3', 'o3-pro', 'claude-4-opus'].includes(optimalModel)) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Show thinking for 1 second
      }

      setIsThinking(false);
      setIsStreaming(true);

      // Call AI API with streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          model: optimalModel,
          mode: thinkingMode,
          conversationId: currentConversation?.id,
          files: files || [], // Include processed files
          stream: true, // Request streaming response
          enableWebSearch: webSearchEnabled // Include web search setting
        }),
        signal: controller.signal // Add abort signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, response.statusText, errorText);
        throw new Error(`Failed to get AI response: ${response.status} ${response.statusText}`);
      }

      // Check if response is streaming
      const contentType = response.headers.get('content-type');
      if (response.body && (contentType?.includes('text/plain') || contentType?.includes('text/event-stream'))) {
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;
            setStreamingMessage(fullContent);
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('🛑 Streaming aborted by user or timeout');
            // Don't return early - preserve any partial content we received
            if (fullContent.length > 0) {
              console.log('📝 Preserving partial content from aborted stream:', fullContent.length, 'characters');
            } else {
              console.log('🚫 No partial content to preserve');
            }
          } else {
            console.error('❌ Streaming error:', error);
            // If streaming failed but we have partial content, use it
            if (fullContent.length > 0) {
              console.log('📝 Using partial content from interrupted stream:', fullContent.length, 'characters');
            } else {
              throw error;
            }
          }
        }

        // Create final message (use fullContent even if streaming was interrupted)
        const assistantMessage: Message = {
          id: `msg_${Date.now()}_ai`,
          role: 'assistant',
          content: fullContent || 'Sorry, I could not generate a response.',
          timestamp: new Date(),
          model: optimalModel
        };

        setMessages(prev => {
          const newMessages = [...prev, assistantMessage];
          // Update conversation after state is updated
          if (currentConversation) {
            const updatedConversation = {
              ...currentConversation,
              messages: newMessages,
              updatedAt: new Date(),
              title: currentConversation.title === 'New Chat' ? 
                content.slice(0, 50) + (content.length > 50 ? '...' : '') : 
                currentConversation.title
            };
            setCurrentConversation(updatedConversation);
            setConversations(prev => 
              prev.map(conv => conv.id === updatedConversation.id ? updatedConversation : conv)
            );
          }
          return newMessages;
        });
        
        // Refresh usage stats to update credit display
        refreshUsageStats();
        setStreamingMessage('');
        
        // Refresh credits to show updated balance
        refreshUsageStats();

      } else {
        // Fallback to regular JSON response
        const data = await response.json();

        const assistantMessage: Message = {
          id: `msg_${Date.now()}_ai`,
          role: 'assistant',
          content: data.content || 'Sorry, I could not generate a response.',
          timestamp: new Date(),
          model: optimalModel
        };

        setMessages(prev => {
          const newMessages = [...prev, assistantMessage];
          // Update conversation after state is updated
          if (currentConversation) {
            const updatedConversation = {
              ...currentConversation,
              messages: newMessages,
              updatedAt: new Date(),
              title: currentConversation.title === 'New Chat' ? 
                content.slice(0, 50) + (content.length > 50 ? '...' : '') : 
                currentConversation.title
            };
            setCurrentConversation(updatedConversation);
            setConversations(prev => 
              prev.map(conv => conv.id === updatedConversation.id ? updatedConversation : conv)
            );
          }
          return newMessages;
        });
        
        // Refresh usage stats to update credit display
        refreshUsageStats();
        
        // Refresh credits to show updated balance
        refreshUsageStats();
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 Request aborted by user');
        return;
      }

      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date(),
        model: optimalModel
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      setIsStreaming(false);
      setAbortController(null);
      setStreamingMessage('');
    }
  };

  const handleModelChange = (newModel: string) => {
    // Check if model is for image or video generation and redirect to appropriate tab
    const imageModels = ['dall-e-3', 'dall-e-2', 'gpt-image-1', 'imagen-4.0-fast-generate', 'imagen-4.0-generate-preview-06-06', 'imagen-4.0-ultra-generate-preview-06-06', 'imagen-4.0-fast-generate-preview-06-06', 'imagen-3.0-generate-002'];
    const videoModels = ['veo-2.0-generate-001', 'veo-3.0-generate-preview', 'seedance-v1-pro-i2v-720p'];

    if (imageModels.includes(newModel) && onModelRedirect) {
      onModelRedirect('image');
      setShowModelSearch(false);
      return;
    }

    if (videoModels.includes(newModel) && onModelRedirect) {
      onModelRedirect('video');
      setShowModelSearch(false);
      return;
    }

    setSelectedModel(newModel);
    setShowModelSearch(false);

    // Update current conversation model
    if (currentConversation) {
      const updatedConversation = {
        ...currentConversation,
        model: newModel
      };
      setCurrentConversation(updatedConversation);
      setConversations(prev => 
        prev.map(conv => conv.id === updatedConversation.id ? updatedConversation : conv)
      );
    }
  };

  const handleModelSwitch = (messageIndex: number, newModel: string) => {
    // Implementation for mid-conversation model switching
    setSelectedModel(newModel);
  };

  const handleDeleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));

    // If deleting current conversation, create a new one
    if (currentConversation?.id === conversationId) {
      handleNewConversation();
    }
  };

  const handleEditConversation = (conversationId: string, newTitle: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, title: newTitle }
        : conv
    ));
    // Update current conversation if it's the one being edited
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(prev => prev ? { ...prev, title: newTitle } : null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts
      if (e.key === 'Escape') {
        setShowModelSearch(false);
        setSidebarOpen(false);
      }
      
      // Ctrl/Cmd + shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setShowModelSearch(true);
            break;
          case 'b':
            e.preventDefault();
            setSidebarOpen(!sidebarOpen);
            break;
          case 'n':
            e.preventDefault();
            handleNewConversation();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getInputPlaceholder = () => {
    const mode = thinkingModes.find(m => m.id === thinkingMode);
    const webSearchText = webSearchEnabled ? " (web search enabled)" : "";
    return messages.length === 0 
      ? `Message ${modelInfo.displayName} in ${mode?.name} mode${webSearchText}...` 
      : `Type a message${webSearchText}...`;
  };

  return (
    <div className="h-full flex bg-background overflow-hidden">
      {/* Collapsible Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed lg:relative z-50 w-80 h-full bg-card border-r border-border shadow-lg lg:shadow-none"
              role="complementary"
              aria-label="Chat history and navigation"
            >
              <ChatSidebar
                conversations={conversations}
                currentConversation={currentConversation}
                onSelectConversation={handleConversationSelect}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
                onEditConversation={handleEditConversation}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col cultural-bg min-h-0 h-full">
        {/* Chat Header */}
        <div className="cultural-card cultural-border shrink-0" role="banner">
          <ChatHeader
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onShowModelSearch={() => setShowModelSearch(true)}
            showModelSearch={showModelSearch}
            conversationTitle={currentConversation?.title || "New Conversation"}
            thinkingMode={thinkingMode}
            onThinkingModeChange={setThinkingMode}
            userId={user?.id}
            autoRoutingEnabled={autoRoutingEnabled}
            onAutoRoutingToggle={setAutoRoutingEnabled}
            showVoiceChat={showVoiceChat}
            onVoiceChatToggle={setShowVoiceChat}
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={setWebSearchEnabled}
          />
        </div>

        {/* Messages Area */}
        <div className="flex-1 min-h-0 overflow-hidden cultural-bg" role="main" aria-label="Chat messages">
          <MessagesContainer
            messages={messages}
            isLoading={isLoading}
            selectedModel={selectedModel}
            onModelSwitch={() => {}}
            isThinking={isThinking}
            isStreaming={isStreaming}
            streamingMessage={streamingMessage}
            onStopGeneration={stopGeneration}
            onEditMessage={handleEditMessage}
          />
        </div>

        {/* Voice Chat Area */}
        {showVoiceChat && (
          <div className="cultural-card cultural-border border-t shrink-0">
            <RealtimeVoiceChat
              selectedModel={selectedModel}
              onMessage={(message, isUser) => {
                if (isUser) {
                  handleSendMessage(message);
                }
              }}
              disabled={isLoading}
              className="m-0"
            />
          </div>
        )}

        {/* Input Area */}
        <div className="cultural-card cultural-border border-t shrink-0">
          <div className="cultural-bg">
            <EnhancedChatInput
              onSend={handleSendMessage}
              selectedModel={selectedModel}
              disabled={isLoading}
              placeholder={getInputPlaceholder()}
              webSearchEnabled={webSearchEnabled}
              onWebSearchToggle={setWebSearchEnabled}
            />
          </div>
        </div>
      </div>

      {/* Model Search Modal */}
      <AnimatePresence>
        {showModelSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModelSearch(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <AdvancedModelSearch
                onModelSelect={handleModelChange}
                currentModel={selectedModel}
                onClose={() => setShowModelSearch(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}