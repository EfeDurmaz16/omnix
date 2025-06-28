'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { 
  contextManager, 
  ConversationContext, 
  ContextMessage 
} from '@/lib/context/AdvancedContextManager';

interface UseContextManagerReturn {
  currentContext: ConversationContext | null;
  contexts: ConversationContext[];
  loading: boolean;
  error: string | null;
  
  // Context operations
  createNewContext: (model?: string) => Promise<ConversationContext>;
  switchContext: (contextId: string) => Promise<void>;
  deleteContext: (contextId: string) => Promise<void>;
  
  // Message operations
  addMessage: (message: Omit<ContextMessage, 'id' | 'timestamp'>) => Promise<void>;
  switchModel: (newModel: string) => Promise<void>;
  getContextForModel: () => Promise<ContextMessage[]>;
  
  // Utility
  refreshContexts: () => Promise<void>;
}

export function useContextManager(): UseContextManagerReturn {
  const { user } = useUser();
  const [currentContext, setCurrentContext] = useState<ConversationContext | null>(null);
  const [contexts, setContexts] = useState<ConversationContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user contexts on mount
  useEffect(() => {
    if (user?.id) {
      loadUserContexts();
    }
  }, [user?.id]);

  const loadUserContexts = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const userContexts = await contextManager.getUserContexts(user.id);
      setContexts(userContexts);
      
      // Set current context to most recent if none selected
      if (!currentContext && userContexts.length > 0) {
        const mostRecent = userContexts.sort((a, b) => 
          new Date(b.metadata.lastActivity).getTime() - new Date(a.metadata.lastActivity).getTime()
        )[0];
        setCurrentContext(mostRecent);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to load contexts');
      console.error('❌ Failed to load contexts:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNewContext = useCallback(async (model: string = 'gpt-4o'): Promise<ConversationContext> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      
      const newContext = await contextManager.getOrCreateContext(
        user.id,
        undefined, // Let it generate new ID
        model
      );
      
      setCurrentContext(newContext);
      await refreshContexts();
      
      console.log('✅ Created new context:', newContext.id);
      return newContext;
      
    } catch (err: any) {
      setError(err.message || 'Failed to create context');
      throw err;
    }
  }, [user?.id]);

  const switchContext = useCallback(async (contextId: string): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);
      
      const context = await contextManager.getOrCreateContext(user.id, contextId);
      setCurrentContext(context);
      
      console.log('🔄 Switched to context:', contextId);
      
    } catch (err: any) {
      setError(err.message || 'Failed to switch context');
      throw err;
    }
  }, [user?.id]);

  const deleteContext = useCallback(async (contextId: string): Promise<void> => {
    try {
      setError(null);
      
      await contextManager.deleteContext(contextId);
      
      // If deleting current context, switch to another one
      if (currentContext?.id === contextId) {
        const remainingContexts = contexts.filter(c => c.id !== contextId);
        if (remainingContexts.length > 0) {
          setCurrentContext(remainingContexts[0]);
        } else {
          // Create new context if no others exist
          await createNewContext();
        }
      }
      
      await refreshContexts();
      console.log('🗑️ Deleted context:', contextId);
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete context');
      throw err;
    }
  }, [currentContext, contexts, createNewContext]);

  const addMessage = useCallback(async (
    message: Omit<ContextMessage, 'id' | 'timestamp'>
  ): Promise<void> => {
    if (!currentContext) {
      throw new Error('No active context');
    }

    try {
      setError(null);
      
      await contextManager.addMessage(currentContext.id, message);
      
      // Update current context in state
      const updatedContext = await contextManager.getOrCreateContext(
        currentContext.userId, 
        currentContext.id
      );
      setCurrentContext(updatedContext);
      
      console.log('💬 Added message to context:', currentContext.id);
      
    } catch (err: any) {
      setError(err.message || 'Failed to add message');
      throw err;
    }
  }, [currentContext]);

  const switchModel = useCallback(async (newModel: string): Promise<void> => {
    if (!currentContext) {
      throw new Error('No active context');
    }

    try {
      setError(null);
      
      await contextManager.switchModel(currentContext.id, newModel);
      
      // Update current context in state
      const updatedContext = await contextManager.getOrCreateContext(
        currentContext.userId, 
        currentContext.id
      );
      setCurrentContext(updatedContext);
      
      console.log('🔄 Switched model to:', newModel);
      
    } catch (err: any) {
      setError(err.message || 'Failed to switch model');
      throw err;
    }
  }, [currentContext]);

  const getContextForModel = useCallback(async (): Promise<ContextMessage[]> => {
    if (!currentContext) {
      throw new Error('No active context');
    }

    try {
      setError(null);
      
      const messages = await contextManager.getContextForModel(currentContext.id);
      return messages;
      
    } catch (err: any) {
      setError(err.message || 'Failed to get context for model');
      throw err;
    }
  }, [currentContext]);

  const refreshContexts = useCallback(async (): Promise<void> => {
    await loadUserContexts();
  }, []);

  return {
    currentContext,
    contexts,
    loading,
    error,
    
    // Operations
    createNewContext,
    switchContext,
    deleteContext,
    addMessage,
    switchModel,
    getContextForModel,
    refreshContexts,
  };
}

// Additional hook for context-aware chat operations
export function useContextualChat() {
  const contextManager = useContextManager();
  const { user } = useUser();

  const sendMessage = useCallback(async (
    content: string, 
    model?: string
  ): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    // Ensure we have a context
    let context = contextManager.currentContext;
    if (!context) {
      context = await contextManager.createNewContext(model);
    }

    // Switch model if requested
    if (model && context.metadata.currentModel !== model) {
      await contextManager.switchModel(model);
    }

    // Add user message
    await contextManager.addMessage({
      role: 'user',
      content,
      model: context.metadata.currentModel,
    });

    // Get context for AI model
    const messages = await contextManager.getContextForModel();
    
    // Here you would call your AI API with the context
    // For now, return a placeholder
    const response = `This is a contextual response to: ${content}`;
    
    // Add AI response to context
    await contextManager.addMessage({
      role: 'assistant',
      content: response,
      model: context.metadata.currentModel,
    });

    return response;
    
  }, [user?.id, contextManager]);

  const startNewConversation = useCallback(async (model?: string): Promise<void> => {
    await contextManager.createNewContext(model);
  }, [contextManager]);

  const switchToConversation = useCallback(async (contextId: string): Promise<void> => {
    await contextManager.switchContext(contextId);
  }, [contextManager]);

  return {
    ...contextManager,
    sendMessage,
    startNewConversation,
    switchToConversation,
  };
} 