'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Plus, FileText, Play } from 'lucide-react';

const DEFAULT_TEMPLATES = {
  html: `<!DOCTYPE html>
<html>
<head>
  <title>HTML Sandbox</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .demo-box { 
      background: #f0f0f0; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>Welcome to HTML Sandbox</h1>
  <p>Start building your HTML here!</p>
  <div class="demo-box">
    <h2>Demo Box</h2>
    <p>This is a styled demo box.</p>
  </div>
</body>
</html>`,

  javascript: `// JavaScript Sandbox
console.log("Welcome to JavaScript Sandbox!");

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci sequence:");
for (let i = 0; i < 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`,

  jsx: `// React JSX Sandbox
function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>React Sandbox</h1>
      <div style={{ marginBottom: '20px' }}>
        <h2>Counter: {count}</h2>
        <button onClick={() => setCount(count + 1)}>
          Increment
        </button>
        <button onClick={() => setCount(count - 1)} style={{ marginLeft: '10px' }}>
          Decrement
        </button>
      </div>
    </div>
  );
}`
};

export const CodeSandbox: React.FC = () => {
  const [activeTab, setActiveTab] = useState('playground');
  const [currentCode, setCurrentCode] = useState(DEFAULT_TEMPLATES.html);
  const [currentLanguage, setCurrentLanguage] = useState('html');

  const handleNewSandbox = (language: string) => {
    const template = DEFAULT_TEMPLATES[language as keyof typeof DEFAULT_TEMPLATES] || '';
    setCurrentCode(template);
    setCurrentLanguage(language);
  };

  const languages = [
    { value: 'html', label: 'HTML' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'jsx', label: 'React JSX' }
  ];

  return (
    <div className="w-full h-full">
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Code Sandbox
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-100px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="playground">
                <Play className="h-4 w-4 mr-2" />
                Playground
              </TabsTrigger>
              <TabsTrigger value="templates">
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="playground" className="h-[calc(100%-60px)]">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                  <select 
                    value={currentLanguage} 
                    onChange={(e) => setCurrentLanguage(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    {languages.map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => handleNewSandbox(currentLanguage)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </div>
                
                <div className="flex-1 border rounded-lg overflow-hidden">
                  <div className="h-full flex">
                    <div className="w-1/2 h-full border-r">
                      <div className="h-8 bg-gray-100 flex items-center px-4 text-sm font-medium">
                        Code Editor
                      </div>
                      <textarea
                        value={currentCode}
                        onChange={(e) => setCurrentCode(e.target.value)}
                        className="w-full h-[calc(100%-2rem)] p-4 font-mono text-sm resize-none border-none outline-none"
                        placeholder="Enter your code here..."
                      />
                    </div>
                    <div className="w-1/2 h-full">
                      <div className="h-8 bg-gray-100 flex items-center px-4 text-sm font-medium">
                        Preview
                      </div>
                      <iframe
                        srcDoc={currentCode}
                        className="w-full h-[calc(100%-2rem)] border-none bg-white"
                        sandbox="allow-scripts allow-same-origin"
                        title="Code Preview"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="templates" className="h-[calc(100%-60px)]">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Code Templates</h3>
                
                <div className="grid gap-4">
                  {Object.entries(DEFAULT_TEMPLATES).map(([language, template]) => (
                    <Card key={language} className="cursor-pointer hover:bg-gray-50">
                      <CardHeader>
                        <CardTitle className="text-base capitalize">{language}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto flex-1 mr-4">
                            <code>{template.substring(0, 100)}...</code>
                          </pre>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleNewSandbox(language)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Use Template
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};