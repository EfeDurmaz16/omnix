'use client';

import { useState, useCallback } from 'react';

export interface CodeArtifact {
  id: string;
  title: string;
  code: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  isRunnable: boolean;
  messageId?: string;
}

export const useCodeArtifacts = () => {
  const [artifacts, setArtifacts] = useState<Map<string, CodeArtifact>>(new Map());
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

  const isRunnableLanguage = (language: string): boolean => {
    const runnableLanguages = [
      'html', 'javascript', 'js', 'jsx', 'tsx', 'react', 'css', 'typescript', 'ts'
    ];
    return runnableLanguages.includes(language.toLowerCase());
  };

  const generateTitle = (language: string, code: string): string => {
    // Try to extract a meaningful title from the code
    const lines = code.split('\n').filter(line => line.trim());
    
    // Look for function names, class names, or component names
    for (const line of lines) {
      // React component
      const reactMatch = line.match(/(?:function|const|class)\s+(\w+)/);
      if (reactMatch) {
        return `${reactMatch[1]} Component`;
      }
      
      // HTML title
      const titleMatch = line.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        return titleMatch[1];
      }
      
      // Function name
      const funcMatch = line.match(/function\s+(\w+)/);
      if (funcMatch) {
        return `${funcMatch[1]} Function`;
      }
    }
    
    // Default title based on language
    return `${language.toUpperCase()} Code`;
  };

  const createArtifact = useCallback((
    code: string, 
    language: string, 
    messageId?: string
  ): string => {
    const id = `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const title = generateTitle(language, code);
    
    const artifact: CodeArtifact = {
      id,
      title,
      code,
      language,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      isRunnable: isRunnableLanguage(language),
      messageId
    };

    setArtifacts(prev => new Map(prev).set(id, artifact));
    setActiveArtifactId(id);
    
    return id;
  }, []);

  const updateArtifact = useCallback((id: string, updates: Partial<CodeArtifact>) => {
    setArtifacts(prev => {
      const artifact = prev.get(id);
      if (!artifact) return prev;

      const updated: CodeArtifact = {
        ...artifact,
        ...updates,
        updatedAt: new Date(),
        version: artifact.version + 1
      };

      return new Map(prev).set(id, updated);
    });
  }, []);

  const deleteArtifact = useCallback((id: string) => {
    setArtifacts(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
    
    if (activeArtifactId === id) {
      setActiveArtifactId(null);
    }
  }, [activeArtifactId]);

  const getArtifact = useCallback((id: string): CodeArtifact | undefined => {
    return artifacts.get(id);
  }, [artifacts]);

  const getArtifactsByMessage = useCallback((messageId: string): CodeArtifact[] => {
    return Array.from(artifacts.values()).filter(artifact => artifact.messageId === messageId);
  }, [artifacts]);

  const getAllArtifacts = useCallback((): CodeArtifact[] => {
    return Array.from(artifacts.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }, [artifacts]);

  const clearArtifacts = useCallback(() => {
    setArtifacts(new Map());
    setActiveArtifactId(null);
  }, []);

  return {
    artifacts: getAllArtifacts(),
    activeArtifact: activeArtifactId ? artifacts.get(activeArtifactId) : null,
    activeArtifactId,
    createArtifact,
    updateArtifact,
    deleteArtifact,
    getArtifact,
    getArtifactsByMessage,
    setActiveArtifactId,
    clearArtifacts
  };
};