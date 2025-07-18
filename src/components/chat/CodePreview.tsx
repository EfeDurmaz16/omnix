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
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/babel">
          const { useState, useEffect, useRef } = React;
          
          try {
            ${code}
            
            // Try to render the component
            const root = ReactDOM.createRoot(document.getElementById('root'));
            
            // Look for App component or default export
            if (typeof App !== 'undefined') {
              root.render(React.createElement(App));
            } else {
              // Try to find any React component in the code
              const componentMatch = code.match(/(?:function|const|class)\\s+(\\w+)/);
              if (componentMatch) {
                const ComponentName = componentMatch[1];
                if (typeof window[ComponentName] !== 'undefined') {
                  root.render(React.createElement(window[ComponentName]));
                } else {
                  root.render(React.createElement('div', null, 'No App component found. Define an App component to render.'));
                }
              } else {
                root.render(React.createElement('div', null, 'No React component found in the code.'));
              }
            }
          } catch (error) {
            document.getElementById('root').innerHTML = '<div class="error">Error: ' + error.message + '</div>';
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