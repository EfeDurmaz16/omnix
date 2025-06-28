"use client";

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Bot, 
  Copy, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown,
  MoreHorizontal,
  Zap,
  Clock,
  Brain
} from 'lucide-react';
import { VoiceControls } from './VoiceControls';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
}

interface MessagesContainerProps {
  messages: Message[];
  selectedModel: string;
  onModelSwitch: (messageIndex: number, newModel: string) => void;
  isLoading: boolean;
  isThinking?: boolean;
}

export function MessagesContainer({ 
  messages, 
  selectedModel, 
  onModelSwitch, 
  isLoading,
  isThinking = false
}: MessagesContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getModelDisplay = (model?: string) => {
    if (!model) return 'AI';
    const modelMap: Record<string, string> = {
      'gpt-4o': 'GPT-4o',
      'claude-3.5-sonnet': 'Claude 3.5',
      'o3': 'o3',
      'gemini-pro': 'Gemini Pro'
    };
    return modelMap[model] || model;
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
          <p className="text-muted-foreground mb-4">
            Choose from 100+ AI models and start chatting. Try asking about anything!
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              "Explain quantum computing",
              "Write a Python function",
              "Plan a trip to Istanbul",
              "Create a marketing strategy"
            ].map((suggestion) => (
              <Badge key={suggestion} variant="outline" className="cursor-pointer hover:bg-muted">
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 140px)' }}>
      <AnimatePresence>
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            index={index}
            onCopy={() => copyToClipboard(message.content)}
            onModelSwitch={onModelSwitch}
            selectedModel={selectedModel}
          />
        ))}
      </AnimatePresence>

      {/* Loading indicator */}
      {isThinking && <ThinkingMessage selectedModel={selectedModel} />}
      {isLoading && !isThinking && <LoadingMessage selectedModel={selectedModel} />}

      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  index: number;
  onCopy: () => void;
  onModelSwitch: (messageIndex: number, newModel: string) => void;
  selectedModel: string;
}

function MessageBubble({ 
  message, 
  index, 
  onCopy, 
  onModelSwitch, 
  selectedModel 
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center shrink-0
        ${isUser 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted text-muted-foreground'
        }
      `}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'text-right' : 'text-left'}`}>
        {/* Message Header */}
        <div className={`flex items-center gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-sm font-medium">
            {isUser ? 'You' : `${message.model ? message.model : 'AI'}`}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(message.timestamp, 'HH:mm')}
          </span>
          {!isUser && message.model && (
            <Badge variant="outline" className="text-xs">
              {message.model}
            </Badge>
          )}
        </div>

        {/* Message Bubble */}
        <div className={`
          relative rounded-lg p-4 
          ${isUser 
            ? 'bg-primary text-primary-foreground ml-12' 
            : 'bg-muted mr-12'
          }
        `}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Voice Controls */}
            <VoiceControls 
              text={message.content}
              onPlaybackStart={() => console.log('Started playing:', message.id)}
              onPlaybackEnd={() => console.log('Finished playing:', message.id)}
              onError={(error) => console.error('Voice error:', error)}
              className="mr-2"
            />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              className="h-8 px-2 hover:bg-muted"
              title="Copy message"
            >
              <Copy className="w-3 h-3" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onModelSwitch(index, selectedModel)}
              className="h-8 px-2 hover:bg-muted"
              title="Regenerate with current model"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => console.log('Liked message:', message.id)}
              className="h-8 px-2 hover:bg-muted"
              title="Like this response"
            >
              <ThumbsUp className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => console.log('Disliked message:', message.id)}
              className="h-8 px-2 hover:bg-muted"
              title="Dislike this response"
            >
              <ThumbsDown className="w-3 h-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => console.log('More actions for:', message.id)}
              className="h-8 px-2 hover:bg-muted"
              title="More actions"
            >
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ThinkingMessage({ selectedModel }: { selectedModel: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Thinking Content */}
      <div className="flex-1 max-w-3xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">{selectedModel}</span>
          <Badge variant="outline" className="text-xs">
            <Brain className="w-3 h-3 mr-1" />
            Thinking...
          </Badge>
        </div>

        <div className="bg-muted rounded-lg p-4 mr-12">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>
            <span className="text-sm text-muted-foreground">
              Model is reasoning through your request...
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingMessage({ selectedModel }: { selectedModel: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Loading Content */}
      <div className="flex-1 max-w-3xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">{selectedModel}</span>
          <Badge variant="outline" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            Generating...
          </Badge>
        </div>

        <div className="bg-muted rounded-lg p-4 mr-12">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
            </div>
            <span className="text-sm text-muted-foreground">
              AI is generating a response...
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 