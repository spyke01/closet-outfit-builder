'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function DebugPage() {
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const testClientConnection = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      console.log('🔍 Testing client-side Supabase connection...');
      
      const supabase = createClient();
      
      // Test 1: Environment variables
      const envCheck = {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      };
      
      // Test 2: Basic query
      let queryResult = null;
      let queryError = null;
      
      try {
        const { data, error } = await supabase
          .from('wardrobe_items')
          .select('count')
          .limit(1);
          
        queryResult = data;
        queryError = error;
      } catch (err) {
        queryError = err;
      }
      
      // Test 3: Auth status
      let authResult = null;
      let authError = null;
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        authResult = user ? { id: user.id, email: user.email } : null;
        authError = error;
      } catch (err) {
        authError = err;
      }
      
      setResults({
        timestamp: new Date().toISOString(),
        environment: envCheck,
        query: {
          success: !queryError,
          data: queryResult,
          error: queryError ? (queryError instanceof Error ? queryError.message : String(queryError)) : null,
        },
        auth: {
          success: !authError,
          user: authResult,
          error: authError ? (authError instanceof Error ? authError.message : String(authError)) : null,
        },
      });
      
    } catch (error) {
      setResults({
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const testServerConnection = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      console.log('🔍 Testing server-side Supabase connection...');
      
      const response = await fetch('/api/debug/supabase');
      const data = await response.json();
      
      setResults({
        type: 'server',
        timestamp: new Date().toISOString(),
        ...data,
      });
      
    } catch (error) {
      setResults({
        type: 'server',
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Supabase Debug Console</h1>
      
      <div className="space-y-4 mb-6">
        <Button 
          onClick={testClientConnection} 
          disabled={loading}
          className="mr-4"
        >
          {loading ? 'Testing...' : 'Test Client Connection'}
        </Button>
        
        <Button 
          onClick={testServerConnection} 
          disabled={loading}
          variant="outline"
        >
          {loading ? 'Testing...' : 'Test Server Connection'}
        </Button>
      </div>

      {results && (
        <div className="bg-muted p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Test Results</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-secondary/20 rounded-lg">
        <h3 className="font-semibold mb-2">Environment Info</h3>
        <div className="text-sm space-y-1">
          <div>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ Not set'}</div>
          <div>Key: {process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Not set'}</div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <h3 className="font-semibold mb-2">Common Issues</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Environment variables not set in production (Netlify dashboard)</li>
          <li>CSP headers blocking Supabase requests</li>
          <li>RLS policies preventing access</li>
          <li>Network connectivity issues</li>
          <li>Supabase project paused or inactive</li>
        </ul>
      </div>
    </div>
  );
}
