import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EnhancedStreamProcessor, CodeBlock } from '@/lib/streaming/EnhancedStreamProcessor';

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

interface EnhancedMessageBlock extends MessageBlock {
  processedContent?: string;
  codeBlocks?: Map<string, CodeBlock>;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  messageId,
  onComplete,
  onError,
  className = ''
}) => {
  const [blocks, setBlocks] = useState<EnhancedMessageBlock[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memoryContext, setMemoryContext] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const accumulatedContentRef = useRef<string>('');
  const streamProcessorRef = useRef<EnhancedStreamProcessor>(new EnhancedStreamProcessor());

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

    // Process text chunks through enhanced processor
    if (chunk.type === 'text') {
      const processed = streamProcessorRef.current.processChunk(chunk.content);
      
      setBlocks(prevBlocks => {
        const existingBlockIndex = prevBlocks.findIndex(
          block => block.id === chunk.id
        );

        if (existingBlockIndex !== -1) {
          // Update existing block with processed content
          const updatedBlocks = [...prevBlocks];
          const existingBlock = updatedBlocks[existingBlockIndex];
          
          if (processed.type === 'code-complete') {
            // Store complete code blocks
            const codeBlocks = existingBlock.codeBlocks || new Map();
            const codeId = `code-${Date.now()}`;
            codeBlocks.set(codeId, {
              language: processed.language || 'plaintext',
              content: processed.content || ''
            });
            
            updatedBlocks[existingBlockIndex] = {
              ...existingBlock,
              content: existingBlock.content + `\n%%CODE_BLOCK_${codeId}%%\n`,
              processedContent: (existingBlock.processedContent || '') + (processed.raw || ''),
              codeBlocks,
              complete: chunk.complete || false
            };
          } else if (processed.type === 'markdown' && processed.content) {
            updatedBlocks[existingBlockIndex] = {
              ...existingBlock,
              content: existingBlock.content + processed.content,
              processedContent: (existingBlock.processedContent || '') + processed.content,
              complete: chunk.complete || false
            };
          }
          
          return updatedBlocks;
        } else {
          // Add new block
          let processedContent = chunk.content;
          let codeBlocks = new Map<string, CodeBlock>();
          
          if (processed.type === 'code-complete') {
            const codeId = `code-${Date.now()}`;
            codeBlocks.set(codeId, {
              language: processed.language || 'plaintext',
              content: processed.content || ''
            });
            processedContent = `\n%%CODE_BLOCK_${codeId}%%\n`;
          } else if (processed.type === 'markdown' && processed.content) {
            processedContent = processed.content;
          }
          
          return [...prevBlocks, {
            id: chunk.id,
            type: chunk.type,
            content: processedContent,
            processedContent,
            codeBlocks,
            language: chunk.language,
            complete: chunk.complete || false,
            metadata: chunk.metadata
          }];
        }
      });

      // Accumulate content for completion callback
      accumulatedContentRef.current += chunk.content;
    } else {
      // Handle non-text chunks normally
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
    }
  };

  const handleStreamComplete = () => {
    // Finalize any remaining content
    const finalizedContent = streamProcessorRef.current.finalize(accumulatedContentRef.current);
    setIsStreaming(false);
    onComplete?.(finalizedContent);
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

  const renderBlock = (block: EnhancedMessageBlock, index: number) => {
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
            <EnhancedMarkdownRenderer
              content={block.processedContent || block.content}
              codeBlocks={block.codeBlocks || new Map()}
              isStreaming={isStreaming && !block.complete}
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

// Enhanced Markdown Renderer Component
interface EnhancedMarkdownRendererProps {
  content: string;
  codeBlocks: Map<string, CodeBlock>;
  isStreaming?: boolean;
}

const EnhancedMarkdownRenderer: React.FC<EnhancedMarkdownRendererProps> = ({
  content,
  codeBlocks,
  isStreaming = false
}) => {
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      
      // Check if this is a placeholder for a complete code block
      if (codeString.startsWith('%%CODE_BLOCK_')) {
        const id = codeString.replace(/%%CODE_BLOCK_|%%/g, '');
        const codeBlock = codeBlocks.get(id);
        
        if (codeBlock) {
          return (
            <div className="my-4">
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <span className="text-sm text-gray-300 font-mono">
                    {codeBlock.language}
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(codeBlock.content)}
                    className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <SyntaxHighlighter
                  language={codeBlock.language}
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: '16px',
                    background: 'transparent'
                  }}
                  {...props}
                >
                  {codeBlock.content}
                </SyntaxHighlighter>
              </div>
            </div>
          );
        }
      }
      
      return !inline && match ? (
        <div className="my-4">
          <SyntaxHighlighter
            style={oneDark}
            language={match[1]}
            PreTag="div"
            customStyle={{
              margin: 0,
              padding: '16px',
              borderRadius: '8px'
            }}
            {...props}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }
  };

  // For streaming content, clean up incomplete markdown
  const safeContent = isStreaming ? cleanIncompleteMarkdown(content) : content;

  return (
    <div className="enhanced-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {safeContent}
      </ReactMarkdown>
      
      {isStreaming && (
        <span className="streaming-indicator animate-pulse">●</span>
      )}
    </div>
  );
};

// Clean incomplete markdown during streaming
const cleanIncompleteMarkdown = (content: string): string => {
  let cleaned = content;
  
  // Remove incomplete code blocks
  const codeBlockMatches = cleaned.match(/```/g);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    const lastCodeBlock = cleaned.lastIndexOf('```');
    cleaned = cleaned.substring(0, lastCodeBlock);
  }
  
  // Remove incomplete inline code
  const inlineMatches = cleaned.match(/(?<!`)`(?!`)/g);
  if (inlineMatches && inlineMatches.length % 2 !== 0) {
    const lastBacktick = cleaned.lastIndexOf('`');
    if (lastBacktick > -1) {
      cleaned = cleaned.substring(0, lastBacktick);
    }
  }
  
  return cleaned;
};

export default StreamingMessage;