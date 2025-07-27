'use client';

import React from 'react';
import { MathRenderer } from '@/components/chat/MathRenderer';
import { Navbar } from '@/components/layout/Navbar';

const testContent = `Here's a test button that should work:

\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>Test Button</title>
    <style>
        button { 
            padding: 10px 20px; 
            background: lightblue; 
            border: none; 
            cursor: pointer; 
            font-size: 16px;
            border-radius: 5px;
        }
        button.clicked { 
            background: lightcoral; 
        }
    </style>
</head>
<body>
    <h1>Button Test</h1>
    <button id="colorButton">Click Me!</button>
    <script>
        document.getElementById('colorButton').addEventListener('click', function() {
            console.log('Button was clicked!');
            this.classList.toggle('clicked');
        });
    </script>
</body>
</html>
\`\`\`

This should automatically show a preview with a working button.`;

export default function TestPreviewPage() {
  return (
    <div className="h-screen cultural-bg">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Code Preview Test</h1>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <MathRenderer content={testContent} />
          </div>
        </div>
      </div>
    </div>
  );
}