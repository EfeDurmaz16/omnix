'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Code, Copy, Download, Maximize2, Minimize2 } from 'lucide-react';

interface AutoPreviewProps {
  htmlContent: string;
  onClose?: () => void;
}

export const AutoPreview: React.FC<AutoPreviewProps> = ({ htmlContent, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCode, setShowCode] = useState(true); // Show code by default for debugging
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      
      // Debug: Log what HTML content we're about to load
      console.log('🔍 Loading HTML content into iframe:');
      console.log('🔍 Content length:', htmlContent.length);
      console.log('🔍 Content preview:', htmlContent.substring(0, 200) + '...');
      console.log('🔍 Has script tag:', htmlContent.includes('<script>'));
      
      // Create a new iframe content with proper base64 encoding to avoid some issues
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframe.src = url;
      
      // Clean up the URL when component unmounts or content changes
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [htmlContent]);

  const copyCode = () => {
    navigator.clipboard.writeText(htmlContent);
  };

  const downloadCode = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'preview.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (isExpanded) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-7xl h-[90vh] overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCode(!showCode)}
                >
                  <Code className="h-4 w-4 mr-2" />
                  {showCode ? 'Hide Code' : 'Show Code'}
                </Button>
                <Button variant="outline" size="sm" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCode}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={toggleExpanded}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
                {onClose && (
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-80px)]">
            <div className={`h-full flex ${showCode ? 'flex-row' : 'flex-col'}`}>
              {showCode && (
                <div className="w-1/2 h-full border-r">
                  <div className="h-8 bg-gray-100 flex items-center px-4 text-sm font-medium">
                    HTML Source
                  </div>
                  <pre className="h-[calc(100%-2rem)] p-4 overflow-auto bg-gray-50 text-sm font-mono">
                    <code>{htmlContent}</code>
                  </pre>
                </div>
              )}
              <div className={`${showCode ? 'w-1/2' : 'w-full'} h-full`}>
                <div className="h-8 bg-gray-100 flex items-center px-4 text-sm font-medium">
                  Preview
                </div>
                <iframe
                  ref={iframeRef}
                  className="w-full h-[calc(100%-2rem)] border-none bg-white"
                  sandbox="allow-scripts allow-same-origin allow-modals"
                  title="Auto Preview"
                  key={htmlContent} // Force re-render when content changes
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="w-full mt-4 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Live Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCode(!showCode)}
            >
              <Code className="h-4 w-4 mr-2" />
              {showCode ? 'Hide Code' : 'Show Code'}
            </Button>
            <Button variant="outline" size="sm" onClick={copyCode}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={downloadCode}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={toggleExpanded}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                <EyeOff className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {showCode && (
            <div className="border rounded-lg overflow-hidden">
              <div className="h-8 bg-gray-100 flex items-center px-4 text-sm font-medium">
                HTML Source
              </div>
              <pre className="p-4 overflow-auto bg-gray-50 text-sm font-mono max-h-64">
                <code>{htmlContent}</code>
              </pre>
            </div>
          )}
          
          <div className="border rounded-lg overflow-hidden">
            <div className="h-8 bg-gray-100 flex items-center px-4 text-sm font-medium">
              Preview
            </div>
            <div className="h-64 bg-white">
              <iframe
                ref={iframeRef}
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin allow-modals"
                title="Auto Preview"
                key={htmlContent} // Force re-render when content changes
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};