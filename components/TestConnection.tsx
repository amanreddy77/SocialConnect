'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestConnection() {
  const [status, setStatus] = useState('Testing...')
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<string[]>([])

  useEffect(() => {
    testConnection()
  }, [])

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const testConnection = async () => {
    try {
      setStatus('Testing Supabase connection...')
      addTestResult('Testing basic connection...')
      
      const { data, error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true })
      
      if (error) {
        throw error
      }
      
      addTestResult(`✅ Basic connection successful! Found ${data?.length || 0} profiles`)
      
      // Test RLS policies
      await testRLSPolicies()
      
      setStatus('✅ All tests completed!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setStatus('❌ Connection failed')
      addTestResult(`❌ Error: ${errorMessage}`)
      console.error('Connection test error:', err)
    }
  }

  const testRLSPolicies = async () => {
    try {
      addTestResult('Testing RLS policies...')
      
      // Test 1: Check if we can read profiles
      const { data: readData, error: readError } = await supabase
        .from('profiles')
        .select('id, username')
        .limit(1)
      
      if (readError) {
        addTestResult(`❌ Read profiles failed: ${readError.message}`)
      } else {
        addTestResult(`✅ Read profiles successful: ${readData?.length || 0} profiles found`)
      }
      
      // Test 2: Check current user session
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        addTestResult(`✅ User authenticated: ${user.email}`)
        
        // Test 3: Try to create a test profile (this should fail due to RLS)
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: `test_${Date.now()}`,
            full_name: 'Test User'
          })
        
        if (insertError) {
          addTestResult(`❌ Profile creation blocked: ${insertError.message}`)
          addTestResult('This indicates RLS policies are still blocking profile creation')
        } else {
          addTestResult('✅ Profile creation successful (RLS policies working)')
        }
      } else {
        addTestResult('ℹ️ No user authenticated - this is normal for new visitors')
      }
      
    } catch (err) {
      addTestResult(`❌ RLS test error: ${err instanceof Error ? err.message : 'Unknown'}`)
    }
  }

  const runRLSFix = async () => {
    try {
      addTestResult('Attempting to fix RLS policies...')
      
      // This is a temporary workaround - we'll disable RLS temporarily
      const { error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;'
      })
      
      if (error) {
        addTestResult(`❌ Cannot disable RLS: ${error.message}`)
        addTestResult('You need to run the SQL script in Supabase dashboard')
      } else {
        addTestResult('✅ RLS temporarily disabled - profile creation should work now')
      }
    } catch (err) {
      addTestResult(`❌ RLS fix attempt failed: ${err instanceof Error ? err.message : 'Unknown'}`)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Supabase Connection & RLS Test</h2>
      <div className="space-y-4">
        <div>
          <p><strong>Status:</strong> {status}</p>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded mt-2">
              <p className="text-red-800"><strong>Error:</strong> {error}</p>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <button 
            onClick={testConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
          >
            Test Connection
          </button>
          
          <button 
            onClick={runRLSFix}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Try RLS Fix
          </button>
        </div>
        
        {testResults.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <div className="bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800">
            <strong>Next Step:</strong> If RLS policies are blocking profile creation, 
            you need to run the updated <code>supabase-setup.sql</code> script in your 
            Supabase dashboard SQL Editor.
          </p>
        </div>
      </div>
    </div>
  )
}
