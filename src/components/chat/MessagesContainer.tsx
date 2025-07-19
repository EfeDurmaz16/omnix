"use client";

import { useEffect, useRef, useState } from 'react';
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
  Brain,
  Square,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { VoiceControls } from './VoiceControls';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { format } from 'date-fns';
import { useModelInfo } from '@/hooks/useModelInfo';
import { MathRenderer } from './MathRenderer';

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
  isStreaming?: boolean;
  streamingMessage?: string;
  onStopGeneration?: () => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

export function MessagesContainer({ 
  messages, 
  selectedModel, 
  onModelSwitch, 
  isLoading,
  isThinking = false,
  isStreaming = false,
  streamingMessage = '',
  onStopGeneration,
  onEditMessage
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

  // This function will be replaced by useModelInfo hook in individual components

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
    <div ref={containerRef} className="h-full overflow-y-auto overflow-x-hidden p-4 space-y-6">
      <AnimatePresence>
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            index={index}
            onCopy={() => copyToClipboard(message.content)}
            onModelSwitch={onModelSwitch}
            selectedModel={selectedModel}
            onEdit={onEditMessage}
          />
        ))}
      </AnimatePresence>

      {/* Loading indicator */}
      {isThinking && <ThinkingMessage selectedModel={selectedModel} />}
      {isStreaming && <StreamingMessage selectedModel={selectedModel} streamingMessage={streamingMessage} onStop={onStopGeneration} />}
      {isLoading && !isThinking && !isStreaming && <LoadingMessage selectedModel={selectedModel} />}

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
  onEdit?: (messageId: string, newContent: string) => void;
}

function MessageBubble({ 
  message, 
  index, 
  onCopy, 
  onModelSwitch, 
  selectedModel,
  onEdit
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const modelInfo = useModelInfo(message.model || selectedModel);

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim()) {
      onEdit(message.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

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
            {isUser ? 'You' : modelInfo.displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(message.timestamp, 'HH:mm')}
          </span>
          {!isUser && message.model && (
            <Badge variant="outline" className="text-xs">
              {modelInfo.provider}
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
          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className={`w-full min-h-[100px] p-3 rounded border resize-none ${
                  isUser 
                    ? 'bg-primary-foreground text-primary border-primary-foreground/20' 
                    : 'bg-background text-foreground border-border'
                }`}
                placeholder="Edit your message..."
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-8 px-3"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveEdit}
                  className="h-8 px-3"
                  disabled={!editContent.trim()}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Save & Send
                </Button>
              </div>
            </div>
          ) : (
            /* Normal Display Mode */
            <div className="max-w-none leading-relaxed">
              <MathRenderer content={message.content} />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {isUser ? (
          /* User Message Actions */
          <div className="flex items-center gap-2 mt-2 flex-wrap justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              className="h-8 px-2 hover:bg-muted"
              title="Copy message"
            >
              <Copy className="w-3 h-3" />
            </Button>
            
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 px-2 hover:bg-muted"
                title="Edit and resend"
              >
                <Edit3 className="w-3 h-3" />
              </Button>
            )}
          </div>
        ) : (
          /* AI Message Actions */
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
  const modelInfo = useModelInfo(selectedModel);
  
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
          <span className="text-sm font-medium">{modelInfo.displayName}</span>
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
  const modelInfo = useModelInfo(selectedModel);
  
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
          <span className="text-sm font-medium">{modelInfo.displayName}</span>
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

function StreamingMessage({ 
  selectedModel, 
  streamingMessage, 
  onStop 
}: { 
  selectedModel: string; 
  streamingMessage: string; 
  onStop?: () => void; 
}) {
  const modelInfo = useModelInfo(selectedModel);
  
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

      {/* Streaming Content */}
      <div className="flex-1 max-w-3xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">{modelInfo.displayName}</span>
          <Badge variant="outline" className="text-xs">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
            Streaming...
          </Badge>
          {onStop && (
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              className="h-6 px-2 text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-600"
            >
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          )}
        </div>

        <div className="bg-muted rounded-lg p-4 mr-12">
          <div className="max-w-none leading-relaxed">
            <MathRenderer content={streamingMessage} />
            {/* Typing cursor */}
            <span className="inline-block w-3 h-5 bg-primary ml-1 animate-pulse" style={{ animationDuration: '1s' }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
} 