"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Plus, 
  Search, 
  MessageSquare, 
  Clock,
  MoreHorizontal,
  Edit,
  Trash,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';

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

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onEditConversation: (conversationId: string, newTitle: string) => void;
  onClose: () => void;
}

export function ChatSidebar({
  conversations,
  currentConversation,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onEditConversation,
  onClose
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    const now = new Date();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    switch (selectedTimeframe) {
      case 'today':
        return now.getTime() - new Date(conv.updatedAt).getTime() < dayInMs;
      case 'week':
        return now.getTime() - new Date(conv.updatedAt).getTime() < 7 * dayInMs;
      case 'month':
        return now.getTime() - new Date(conv.updatedAt).getTime() < 30 * dayInMs;
      default:
        return true;
    }
  });

  const groupedConversations = {
    today: filteredConversations.filter(conv => 
      new Date().getTime() - new Date(conv.updatedAt).getTime() < 24 * 60 * 60 * 1000
    ),
    yesterday: filteredConversations.filter(conv => {
      const dayAgo = new Date().getTime() - 24 * 60 * 60 * 1000;
      const twoDaysAgo = new Date().getTime() - 2 * 24 * 60 * 60 * 1000;
      return new Date(conv.updatedAt).getTime() < dayAgo && new Date(conv.updatedAt).getTime() > twoDaysAgo;
    }),
    thisWeek: filteredConversations.filter(conv => {
      const weekAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
      const twoDaysAgo = new Date().getTime() - 2 * 24 * 60 * 60 * 1000;
      return new Date(conv.updatedAt).getTime() < twoDaysAgo && new Date(conv.updatedAt).getTime() > weekAgo;
    }),
    older: filteredConversations.filter(conv => 
      new Date().getTime() - new Date(conv.updatedAt).getTime() > 7 * 24 * 60 * 60 * 1000
    )
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Chats</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* New Chat Button */}
        <Button
          onClick={onNewConversation}
          className="w-full mb-4"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Time Filter */}
        <div className="flex gap-1 mt-3">
                   {['all', 'today', 'week', 'month'].map((timeframe) => (
             <Button
               key={timeframe}
               variant={selectedTimeframe === timeframe ? 'secondary' : 'ghost'}
               size="sm"
               onClick={() => setSelectedTimeframe(timeframe)}
               className="text-xs capitalize"
             >
               {timeframe}
             </Button>
           ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedConversations).map(([group, convs]) => {
          if (convs.length === 0) return null;
          
          return (
            <div key={group} className="p-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2 capitalize">
                {group === 'thisWeek' ? 'This Week' : group}
              </h3>
              
              <div className="space-y-1">
                {convs.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={currentConversation?.id === conversation.id}
                    onClick={() => onSelectConversation(conversation)}
                    onDelete={() => onDeleteConversation(conversation.id)}
                    onEdit={(newTitle) => onEditConversation(conversation.id, newTitle)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filteredConversations.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onEdit: (newTitle: string) => void;
}

function ConversationItem({ conversation, isActive, onClick, onDelete, onEdit }: ConversationItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);

  const getModelDisplay = (model: string) => {
    const modelMap: Record<string, string> = {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'claude-3.5-sonnet': 'Claude 3.5',
      'gemini-pro': 'Gemini Pro',
    };
    return modelMap[model] || model;
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim() && editTitle !== conversation.title) {
      onEdit(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditTitle(conversation.title);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative group rounded-lg p-3 cursor-pointer transition-all duration-200
        ${isActive 
          ? 'bg-primary/10 border border-primary/20' 
          : 'hover:bg-muted/50'
        }
      `}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="flex items-center gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-6 text-sm"
                autoFocus
                onBlur={handleEditCancel}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    handleEditCancel();
                  }
                }}
              />
            </form>
          ) : (
            <h4 className={`
              text-sm font-medium truncate
              ${isActive ? 'text-primary' : 'text-foreground'}
            `}>
              {conversation.title}
            </h4>
          )}
          
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {getModelDisplay(conversation.model)}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
            </span>
          </div>

          {conversation.messages.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {conversation.messages[conversation.messages.length - 1].content}
            </p>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-1 ml-2">
                         <Button
               variant="ghost"
               size="sm"
               onClick={(e) => {
                 e.stopPropagation();
                 setIsEditing(true);
               }}
             >
               <Edit className="h-3 w-3" />
             </Button>
             <Button
               variant="ghost"
               size="sm"
               onClick={(e) => {
                 e.stopPropagation();
                 onDelete();
               }}
             >
               <Trash className="h-3 w-3" />
             </Button>
          </div>
        )}
        
        {/* Message count indicator - positioned to avoid overlap with actions */}
        {conversation.messages.length > 0 && (
          <div className={`absolute top-2 transition-all duration-200 ${showActions ? 'right-20' : 'right-2'}`}>
            <div className="bg-muted rounded-full px-1.5 py-0.5">
              <span className="text-xs text-muted-foreground">
                {conversation.messages.length}
              </span>
            </div>
          </div>
        )}
      </div>

    </motion.div>
  );
} 