"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, Settings, Plus, ChevronDown, Zap, Brain, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatSidebar } from './ChatSidebar';
import { ChatHeader } from './ChatHeader';
import { MessagesContainer } from './MessagesContainer';
import { EnhancedChatInput } from './EnhancedChatInput';
import { AdvancedModelSearch } from '../models/AdvancedModelSearch';

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
  <span className={`${className || 'text-base'}`}>🤯</span>
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showModelSearch, setShowModelSearch] = useState(false);
  const [thinkingMode, setThinkingMode] = useState('think');

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
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

  const handleSendMessage = async (content: string, files?: any[]) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      model: selectedModel
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsThinking(true);
    setIsLoading(true);

    try {
      // Show thinking state for more advanced models
      if (['o3', 'o3-pro', 'claude-4-opus'].includes(selectedModel)) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Show thinking for 1 second
      }

      setIsThinking(false);

      // Call AI API
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
          model: selectedModel,
          mode: thinkingMode,
          conversationId: currentConversation?.id,
          files: files || [] // Include processed files
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: data.content || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
        model: selectedModel
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update conversation
      if (currentConversation) {
        const updatedMessages = [...messages, userMessage, assistantMessage];
        const updatedConversation = {
          ...currentConversation,
          messages: updatedMessages,
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

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date(),
        model: selectedModel
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowModelSearch(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewConversation();
      }
      if (e.key === 'Escape') {
        setShowModelSearch(false);
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getInputPlaceholder = () => {
    const mode = thinkingModes.find(m => m.id === thinkingMode);
    return messages.length === 0 
      ? `Message ${selectedModel} in ${mode?.name} mode...` 
      : "Type a message...";
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
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
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed lg:relative z-50 w-80 h-full bg-card border-r border-border shadow-lg lg:shadow-none"
            >
              <ChatSidebar
                conversations={conversations}
                currentConversation={currentConversation}
                onSelectConversation={handleConversationSelect}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col cultural-bg">
        {/* Chat Header */}
        <div className="cultural-card cultural-border">
          <ChatHeader
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onShowModelSearch={() => setShowModelSearch(true)}
            showModelSearch={showModelSearch}
            conversationTitle={currentConversation?.title || "New Conversation"}
            thinkingMode={thinkingMode}
            onThinkingModeChange={setThinkingMode}
          />
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden cultural-bg">
          <MessagesContainer
            messages={messages}
            isLoading={isLoading}
            selectedModel={selectedModel}
            onModelSwitch={() => {}}
          />
        </div>

        {/* Input Area */}
        <div className="cultural-card cultural-border border-t">
          <div className="cultural-bg">
            <EnhancedChatInput
              onSend={handleSendMessage}
              selectedModel={selectedModel}
              disabled={isLoading}
              placeholder={getInputPlaceholder()}
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