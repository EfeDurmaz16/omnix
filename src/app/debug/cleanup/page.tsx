'use client';

import { useState } from 'react';

export default function CleanupPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runAction = async (action: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/cleanup-vectors', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action})
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({error: error instanceof Error ? error.message : 'Unknown error'});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Database Cleanup Tool</h1>
      
      <div className="space-y-4 mb-8">
        <button
          onClick={() => runAction('analyze_structure')}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Analyze Data Structure'}
        </button>
        
        <button
          onClick={() => runAction('delete_user_only')}
          disabled={loading}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50 ml-4"
        >
          {loading ? 'Loading...' : 'Delete My Data Only'}
        </button>
        
        <button
          onClick={() => runAction('delete_all_user_vectors')}
          disabled={loading}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 ml-4"
        >
          {loading ? 'Loading...' : 'Delete All Data (CAREFUL!)'}
        </button>
      </div>

      {result && (
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}