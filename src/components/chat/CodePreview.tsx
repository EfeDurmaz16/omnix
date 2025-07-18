'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Code, Eye, Copy, X, Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sanitizeCode, validateCode, SANDBOX_ATTRIBUTES, rateLimiter } from '@/utils/sandboxSecurity';

interface CodePreviewProps {
  code: string;
  language: string;
  onClose?: () => void;
  className?: string;
}

type ViewMode = 'code' | 'preview' | 'split';

export const CodePreview: React.FC<CodePreviewProps> = ({ 
  code, 
  language, 
  onClose, 
  className = '' 
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Detect if code is runnable
  const isRunnable = ['html', 'javascript', 'js', 'jsx', 'tsx', 'react', 'css'].includes(language.toLowerCase());

  useEffect(() => {
    if (isRunnable && viewMode !== 'code') {
      runCode();
    }
  }, [code, language, viewMode]);

  const runCode = async () => {
    if (!iframeRef.current) return;
    
    // Rate limiting check
    const identifier = `${Date.now()}-${Math.random()}`;
    if (!rateLimiter.canExecute(identifier)) {
      setError('Rate limit exceeded. Please wait before running more code.');
      return;
    }
    
    setIsRunning(true);
    setError(null);

    try {
      // Validate code first
      const validation = validateCode(code);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      
      // Sanitize code
      const sanitizedCode = sanitizeCode(code, language);
      
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      // Clear previous content
      iframeDoc.open();
      
      let sandboxContent = '';
      
      switch (language.toLowerCase()) {
        case 'html':
          sandboxContent = createHTMLSandbox(sanitizedCode);
          break;
        case 'javascript':
        case 'js':
          sandboxContent = createJavaScriptSandbox(sanitizedCode);
          break;
        case 'jsx':
        case 'tsx':
        case 'react':
          sandboxContent = createReactSandbox(sanitizedCode);
          break;
        case 'css':
          sandboxContent = createCSSSandbox(sanitizedCode);
          break;
        default:
          sandboxContent = createGenericSandbox(sanitizedCode, language);
      }

      iframeDoc.write(sandboxContent);
      iframeDoc.close();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Code execution error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const createHTMLSandbox = (code: string): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            margin: 0; 
            padding: 16px; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .error { color: red; background: #fee; padding: 10px; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        ${code}
        <script>
          window.addEventListener('error', (e) => {
            document.body.insertAdjacentHTML('beforeend', 
              '<div class="error">Error: ' + e.message + '</div>'
            );
          });
        </script>
      </body>
      </html>
    `;
  };

  const createJavaScriptSandbox = (code: string): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            margin: 0; 
            padding: 16px; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .console-output {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-family: monospace;
            white-space: pre-wrap;
          }
          .error { color: red; background: #fee; padding: 10px; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div id="output"></div>
        <div id="console" class="console-output"></div>
        <script>
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('output');
          const originalLog = console.log;
          const originalError = console.error;

          console.log = function(...args) {
            originalLog.apply(console, args);
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            consoleEl.innerHTML += '<div>' + message + '</div>';
          };

          console.error = function(...args) {
            originalError.apply(console, args);
            const message = args.map(arg => String(arg)).join(' ');
            consoleEl.innerHTML += '<div style="color: red;">' + message + '</div>';
          };

          window.addEventListener('error', (e) => {
            consoleEl.innerHTML += '<div style="color: red;">Error: ' + e.message + '</div>';
          });

          try {
            ${code}
          } catch (error) {
            console.error('Execution error:', error.message);
          }
        </script>
      </body>
      </html>
    `;
  };

  const createReactSandbox = (code: string): string => {
    // Load virtual file system from localStorage
    const loadVirtualFS = () => {
      try {
        const stored = localStorage.getItem('codePreview_virtualFS');
        if (stored) {
          const { files, timestamp } = JSON.parse(stored);
          // Clean up old files (older than 1 hour)
          if (Date.now() - timestamp > 60 * 60 * 1000) {
            localStorage.removeItem('codePreview_virtualFS');
            return {};
          }
          return files;
        }
      } catch (e) {
        console.warn('Failed to load virtual file system:', e);
      }
      return {};
    };

    const virtualFS = loadVirtualFS();
    console.log('🔍 CodePreview - Virtual FS loaded:', Object.keys(virtualFS));

    // Smart preprocessing: resolve imports and handle exports
    const processReactCode = (code: string): { code: string, cssContent: string } => {
      let processedCode = code
        // Remove only React-related imports that we provide via CDN
        .replace(/import\s+React[^;]*from\s+['"]react['"];?\s*/g, '')
        .replace(/import\s+\{[^}]*\}\s+from\s+['"]react['"];?\s*/g, '')
        .replace(/import\s+.*?from\s+['"]react-dom['"];?\s*/g, '')
        .replace(/import\s+.*?from\s+['"]react-dom\/client['"];?\s*/g, '')
        // Handle export statements more carefully
        .replace(/export\s+default\s+/g, '')
        .replace(/export\s+\{[^}]*\}\s*;?\s*/g, '')
        // Keep other exports but remove the export keyword
        .replace(/export\s+(?=const|function|class)/g, '');

      let cssContent = '';

      // Handle CSS imports
      const cssImportMatches = code.match(/import\s+['"]([^'"]*\.css)['"];?/g);
      if (cssImportMatches) {
        cssImportMatches.forEach(importStatement => {
          const cssPathMatch = importStatement.match(/['"]([^'"]*\.css)['"]/);
          if (cssPathMatch) {
            const cssPath = cssPathMatch[1];
            const cssFileName = cssPath.split('/').pop() || 'styles.css';
            
            // Find matching CSS content in virtual file system
            console.log('🔍 CodePreview - Looking for CSS file:', cssFileName);
            console.log('🔍 CodePreview - Available files:', Object.keys(virtualFS));
            
            const matchingCSSKey = Object.keys(virtualFS).find(key => 
              key.endsWith('.css') && (
                key === cssFileName || 
                key.includes(cssFileName.replace('.css', '')) ||
                cssFileName.includes(key.replace('.css', ''))
              )
            );
            
            if (matchingCSSKey && virtualFS[matchingCSSKey]) {
              cssContent += virtualFS[matchingCSSKey] + '\n\n';
              processedCode = processedCode.replace(importStatement, '');
            } else {
              // If no matching CSS file found, remove the import anyway
              processedCode = processedCode.replace(importStatement, '');
            }
          }
        });
      }

      return {
        code: processedCode.trim(),
        cssContent: cssContent.trim()
      };
    };

    const { code: cleanCode, cssContent } = processReactCode(code);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { 
            margin: 0; 
            padding: 16px; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          #root { width: 100%; height: 100%; }
          .error { color: red; background: #fee; padding: 10px; border-radius: 4px; margin: 10px 0; }
          
          /* Imported CSS from virtual file system */
          ${cssContent}
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/babel">
          const { useState, useEffect, useRef, useCallback, useMemo } = React;
          
          try {
            // Execute the processed user's code
            ${cleanCode}
            
            // Create root for React 18
            const root = ReactDOM.createRoot(document.getElementById('root'));
            
            // Auto-detect and render component
            const renderComponent = () => {
              const userCode = \`${cleanCode}\`;
              
              // Try different component patterns
              const componentPatterns = [
                'App', 'TodoList', 'Component', 'Main', 'Home',
                // Extract component names from the user code
                ...(userCode.match(/(?:function|const|class)\\s+(\\w+)/g) || [])
                  .map(match => match.replace(/(?:function|const|class)\\s+/, ''))
                  .filter(name => name.charAt(0) === name.charAt(0).toUpperCase())
              ];
              
              console.log('Looking for components:', componentPatterns);
              
              // Try to render each potential component
              for (const componentName of componentPatterns) {
                try {
                  if (typeof window[componentName] !== 'undefined') {
                    console.log('Rendering component:', componentName);
                    root.render(React.createElement(window[componentName]));
                    return;
                  }
                  if (typeof eval(componentName) !== 'undefined') {
                    console.log('Rendering component via eval:', componentName);
                    root.render(React.createElement(eval(componentName)));
                    return;
                  }
                } catch (e) {
                  console.log('Failed to render', componentName, e);
                  continue;
                }
              }
              
              // If no component found, try to render any JSX directly
              const jsxMatch = userCode.match(/return\\s*\\(/);
              if (jsxMatch) {
                // Try to wrap the JSX in a functional component
                try {
                  const wrapperCode = \`
                    const AutoGeneratedComponent = () => {
                      \${userCode}
                    };
                    window.AutoGeneratedComponent = AutoGeneratedComponent;
                  \`;
                  eval(wrapperCode);
                  root.render(React.createElement(window.AutoGeneratedComponent));
                  return;
                } catch (e) {
                  console.log('Failed to create auto-generated component', e);
                }
              }
              
              // Last resort: show helpful message
              root.render(React.createElement('div', { 
                style: { 
                  padding: '20px', 
                  textAlign: 'center', 
                  color: '#666',
                  fontFamily: 'monospace' 
                } 
              }, [
                React.createElement('h3', { key: 'title' }, 'React Component Preview'),
                React.createElement('p', { key: 'msg' }, 'No renderable React component found.'),
                React.createElement('p', { key: 'tip' }, 'Make sure your component is named "App", "TodoList", or use a capitalized function name.'),
                React.createElement('details', { key: 'debug' }, [
                  React.createElement('summary', { key: 'summary' }, 'Debug Info'),
                  React.createElement('pre', { key: 'patterns', style: { textAlign: 'left', fontSize: '12px' } }, 
                    'Searched for: ' + componentPatterns.join(', '))
                ])
              ]));
            };
            
            // Add error handling
            window.addEventListener('error', (e) => {
              console.error('Runtime error:', e);
              document.getElementById('root').innerHTML = 
                '<div class="error">Runtime Error: ' + e.message + '</div>';
            });
            
            // Render the component
            renderComponent();
            
          } catch (error) {
            console.error('Code execution error:', error);
            document.getElementById('root').innerHTML = 
              '<div class="error">Error: ' + error.message + '</div>';
          }
        </script>
      </body>
      </html>
    `;
  };

  const createCSSSandbox = (code: string): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          ${code}
        </style>
      </head>
      <body>
        <div style="padding: 16px;">
          <h2>CSS Preview</h2>
          <p>This is a paragraph to demonstrate styling.</p>
          <div class="demo-box">Demo Box</div>
          <button>Sample Button</button>
        </div>
      </body>
      </html>
    `;
  };

  const createGenericSandbox = (code: string, language: string): string => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            margin: 0; 
            padding: 16px; 
            font-family: monospace;
            background: #f5f5f5;
          }
          pre { 
            background: white; 
            padding: 16px; 
            border-radius: 4px; 
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <h3>${language.toUpperCase()} Code</h3>
        <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
        <p><em>This language is not directly executable in the browser.</em></p>
      </body>
      </html>
    `;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${language}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportHTML = () => {
    let content = '';
    switch (language.toLowerCase()) {
      case 'html':
        content = createHTMLSandbox(code);
        break;
      case 'javascript':
      case 'js':
        content = createJavaScriptSandbox(code);
        break;
      case 'jsx':
      case 'tsx':
      case 'react':
        content = createReactSandbox(code);
        break;
      default:
        content = createGenericSandbox(code, language);
    }
    
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'preview.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={`w-full h-full ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Code Preview - {language.toUpperCase()}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isRunnable && (
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="code">
                    <Code className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="preview">
                    <Eye className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="split">
                    <Maximize2 className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <Button variant="outline" size="sm" onClick={copyCode}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCode}>
              <Download className="h-4 w-4" />
            </Button>
            {isRunnable && (
              <>
                <Button variant="outline" size="sm" onClick={exportHTML}>
                  Export HTML
                </Button>
                <Button variant="outline" size="sm" onClick={runCode} disabled={isRunning}>
                  <Play className="h-4 w-4" />
                  {isRunning ? 'Running...' : 'Run'}
                </Button>
              </>
            )}
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-80px)]">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 m-4 rounded">
            Error: {error}
          </div>
        )}
        
        <div className={`h-full flex ${viewMode === 'split' ? 'flex-row' : 'flex-col'}`}>
          {(viewMode === 'code' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} h-full border-r`}>
              <pre className="h-full p-4 overflow-auto bg-gray-50 dark:bg-gray-900 text-sm font-mono">
                <code>{code}</code>
              </pre>
            </div>
          )}
          
          {(viewMode === 'preview' || viewMode === 'split') && isRunnable && (
            <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} h-full`}>
              <iframe
                ref={iframeRef}
                className="w-full h-full border-none bg-white"
                sandbox={SANDBOX_ATTRIBUTES}
                title="Code Preview"
              />
            </div>
          )}
          
          {(viewMode === 'preview' || viewMode === 'split') && !isRunnable && (
            <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} h-full flex items-center justify-center bg-gray-50`}>
              <div className="text-center text-gray-500">
                <Code className="h-12 w-12 mx-auto mb-2" />
                <p>Preview not available for {language}</p>
                <p className="text-sm">This language cannot be executed in the browser</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};