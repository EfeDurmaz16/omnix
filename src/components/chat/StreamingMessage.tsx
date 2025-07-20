import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export interface StreamChunk {
  id: string;
  chatId: string;
  type: 'text' | 'code' | 'json' | 'thinking' | 'tool_call' | 'memory_context';
  content: string;
  language?: string;
  complete?: boolean;
  metadata?: any;
  timestamp?: number;
  messageId?: string;
}

interface StreamingMessageProps {
  messageId: string;
  onComplete?: (content: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface MessageBlock {
  id: string;
  type: StreamChunk['type'];
  content: string;
  language?: string;
  complete: boolean;
  metadata?: any;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  messageId,
  onComplete,
  onError,
  className = ''
}) => {
  const [blocks, setBlocks] = useState<MessageBlock[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memoryContext, setMemoryContext] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const accumulatedContentRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const processChunk = (chunk: StreamChunk) => {
    if (chunk.type === 'memory_context') {
      setMemoryContext(chunk);
      return;
    }

    if (chunk.type === 'error') {
      setError(chunk.content);
      onError?.(chunk.content);
      return;
    }

    setBlocks(prevBlocks => {
      const existingBlockIndex = prevBlocks.findIndex(
        block => block.id === chunk.id
      );

      if (existingBlockIndex !== -1) {
        // Update existing block
        const updatedBlocks = [...prevBlocks];
        updatedBlocks[existingBlockIndex] = {
          ...updatedBlocks[existingBlockIndex],
          content: chunk.complete 
            ? chunk.content 
            : updatedBlocks[existingBlockIndex].content + chunk.content,
          complete: chunk.complete || false,
          metadata: chunk.metadata
        };
        return updatedBlocks;
      } else {
        // Add new block
        return [...prevBlocks, {
          id: chunk.id,
          type: chunk.type,
          content: chunk.content,
          language: chunk.language,
          complete: chunk.complete || false,
          metadata: chunk.metadata
        }];
      }
    });

    // Accumulate content for completion callback
    if (chunk.type === 'text') {
      accumulatedContentRef.current += chunk.content;
    }
  };

  const handleStreamComplete = () => {
    setIsStreaming(false);
    onComplete?.(accumulatedContentRef.current);
  };

  // Connect to streaming endpoint via props or context
  const connectToStream = (endpoint: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource(endpoint);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          if (event.data === '[DONE]') {
            handleStreamComplete();
            return;
          }

          const chunk: StreamChunk = JSON.parse(event.data);
          
          if (chunk.type === 'done') {
            handleStreamComplete();
            return;
          }

          processChunk(chunk);
        } catch (err) {
          console.error('Failed to parse chunk:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('Stream error:', err);
        setError('Connection lost. Please try again.');
        setIsStreaming(false);
        onError?.('Connection lost. Please try again.');
      };

    } catch (err) {
      console.error('Failed to connect to stream:', err);
      setError('Failed to connect. Please try again.');
      onError?.('Failed to connect. Please try again.');
    }
  };

  // Expose methods for parent component
  React.useImperativeHandle(React.createRef(), () => ({
    connect: connectToStream,
    processChunk: (chunk: StreamChunk) => {
      processChunk(chunk);
    }
  }), []);

  const renderBlock = (block: MessageBlock, index: number) => {
    const blockVariants = {
      hidden: { opacity: 0, y: 10 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: { 
          duration: 0.3,
          ease: "easeOut"
        }
      }
    };

    switch (block.type) {
      case 'text':
        return (
          <motion.div
            key={block.id}
            variants={blockVariants}
            initial="hidden"
            animate="visible"
            className="prose prose-neutral dark:prose-invert max-w-none"
          >
            <TypewriterText 
              text={block.content} 
              speed={20}
              className="whitespace-pre-wrap"
            />
          </motion.div>
        );

      case 'code':
        return (
          <motion.div
            key={block.id}
            variants={blockVariants}
            initial="hidden"
            animate="visible"
            className="my-4"
          >
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <span className="text-sm text-gray-300 font-mono">
                  {block.language || 'code'}
                </span>
                <div className="flex items-center space-x-2">
                  {!block.complete && (
                    <div className="flex items-center space-x-1">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-400">Streaming...</span>
                    </div>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(block.content)}
                    className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <SyntaxHighlighter
                language={block.language || 'text'}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: '16px',
                  background: 'transparent'
                }}
              >
                {block.content}
              </SyntaxHighlighter>
            </div>
          </motion.div>
        );

      case 'json':
        return (
          <motion.div
            key={block.id}
            variants={blockVariants}
            initial="hidden"
            animate="visible"
            className="my-4"
          >
            <JSONRenderer 
              data={block.metadata?.parsed || block.content}
              isPartial={!block.complete}
              raw={block.content}
            />
          </motion.div>
        );

      case 'thinking':
        return (
          <motion.div
            key={block.id}
            variants={blockVariants}
            initial="hidden"
            animate="visible"
            className="my-4"
          >
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  Thinking...
                </span>
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400 whitespace-pre-wrap font-mono">
                <TypewriterText text={block.content} speed={30} />
              </div>
            </div>
          </motion.div>
        );

      case 'tool_call':
        return (
          <motion.div
            key={block.id}
            variants={blockVariants}
            initial="hidden"
            animate="visible"
            className="my-4"
          >
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                  Tool Call
                </span>
              </div>
              <pre className="text-sm text-purple-600 dark:text-purple-400 whitespace-pre-wrap">
                {block.content}
              </pre>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`streaming-message ${className}`}>
      {/* Memory Context Status */}
      <AnimatePresence>
        {memoryContext && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    memoryContext.complete ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
                  }`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {memoryContext.content}
                  </span>
                </div>
                {memoryContext.metadata && (
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {memoryContext.metadata.cacheHit ? 'Cache Hit' : 'DB Query'} • 
                    {memoryContext.metadata.retrievalTime}ms
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-4"
          >
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                  Error
                </span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {error}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Blocks */}
      <div className="space-y-2">
        <AnimatePresence>
          {blocks.map((block, index) => renderBlock(block, index))}
        </AnimatePresence>
      </div>

      {/* Streaming Indicator */}
      <AnimatePresence>
        {isStreaming && blocks.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2 text-gray-500 dark:text-gray-400"
          >
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm">Thinking...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Typewriter Text Component
interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ 
  text, 
  speed = 50, 
  className = '' 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed]);

  useEffect(() => {
    // Reset when text changes
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <span className={className}>
      {displayText}
      {currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
};

// JSON Renderer Component
interface JSONRendererProps {
  data: any;
  isPartial?: boolean;
  raw?: string;
}

const JSONRenderer: React.FC<JSONRendererProps> = ({ 
  data, 
  isPartial = false, 
  raw 
}) => {
  const [showRaw, setShowRaw] = useState(false);

  const renderValue = (value: any, depth = 0): React.ReactNode => {
    const indent = '  '.repeat(depth);

    if (value === null) return <span className="text-gray-500">null</span>;
    if (typeof value === 'boolean') return <span className="text-blue-600">{String(value)}</span>;
    if (typeof value === 'number') return <span className="text-green-600">{value}</span>;
    if (typeof value === 'string') return <span className="text-orange-600">"{value}"</span>;

    if (Array.isArray(value)) {
      return (
        <div>
          <span>[</span>
          {value.map((item, index) => (
            <div key={index} className="ml-4">
              {renderValue(item, depth + 1)}
              {index < value.length - 1 && <span>,</span>}
            </div>
          ))}
          <span>]</span>
        </div>
      );
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value);
      return (
        <div>
          <span>{'{'}</span>
          {entries.map(([key, val], index) => (
            <div key={key} className="ml-4">
              <span className="text-purple-600">"{key}"</span>
              <span>: </span>
              {renderValue(val, depth + 1)}
              {index < entries.length - 1 && <span>,</span>}
            </div>
          ))}
          <span>{'}'}</span>
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300 font-mono">JSON</span>
          {isPartial && (
            <span className="text-xs text-yellow-400 bg-yellow-400/20 px-2 py-1 rounded">
              Partial
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
          >
            {showRaw ? 'Formatted' : 'Raw'}
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(raw || JSON.stringify(data, null, 2))}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>
      <div className="p-4 font-mono text-sm">
        {showRaw ? (
          <pre className="text-gray-300 whitespace-pre-wrap">
            {raw || JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <div className="text-gray-300">
            {renderValue(data)}
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamingMessage;