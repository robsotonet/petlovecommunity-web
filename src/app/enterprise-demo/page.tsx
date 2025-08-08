'use client';

import { useState } from 'react';
import { useCorrelation } from '@/hooks/useCorrelation';
import { useTransaction } from '@/hooks/useTransaction';

export default function EnterpriseDemoPage() {
  const [result, setResult] = useState<string>('');
  const { currentContext, createContext, createChild } = useCorrelation();
  const { executeTransaction, executeIdempotent, getIdempotencyStats, activeTransactions } = useTransaction();

  const handleCreateContext = () => {
    const context = createContext('demo-user-123');
    setResult(`Created context: ${context.correlationId}`);
  };

  const handleCreateChildContext = () => {
    const context = createChild('demo-user-123');
    setResult(`Created child context: ${context.correlationId}`);
  };

  const handleTestTransaction = async () => {
    try {
      setResult('Executing transaction...');
      const result = await executeTransaction(
        'pet_favorite',
        async () => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { petId: 'pet-123', favorited: true };
        },
        { petId: 'pet-123' }
      );
      setResult(`Transaction completed: ${JSON.stringify(result)}`);
    } catch (error) {
      setResult(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestIdempotency = async () => {
    try {
      setResult('Testing idempotency...');
      const result1 = await executeIdempotent(
        'test-operation',
        async () => {
          return { timestamp: Date.now(), data: 'First execution' };
        },
        { param: 'test' }
      );
      
      // Second call should return cached result
      const result2 = await executeIdempotent(
        'test-operation',
        async () => {
          return { timestamp: Date.now(), data: 'Second execution' };
        },
        { param: 'test' }
      );
      
      setResult(`Idempotency test: First=${result1.timestamp}, Second=${result2.timestamp}, Same=${result1.timestamp === result2.timestamp}`);
    } catch (error) {
      setResult(`Idempotency test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stats = getIdempotencyStats();

  return (
    <div className="p-8 space-y-8 bg-beige min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-midnight mb-8">
          Enterprise Services Demo
        </h1>
        
        {/* Current Context Display */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-midnight">Current Correlation Context</h2>
          <div className="bg-white rounded-lg p-4 shadow-card">
            <pre className="text-sm text-text-secondary overflow-auto">
              {JSON.stringify(currentContext, null, 2)}
            </pre>
          </div>
        </section>

        {/* Context Management */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-midnight">Context Management</h2>
          <div className="flex flex-wrap gap-4">
            <button onClick={handleCreateContext} className="btn-service">
              Create New Context
            </button>
            <button onClick={handleCreateChildContext} className="btn-secondary">
              Create Child Context
            </button>
          </div>
        </section>

        {/* Transaction Testing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-midnight">Transaction Management</h2>
          <div className="flex flex-wrap gap-4">
            <button onClick={handleTestTransaction} className="btn-adoption">
              Test Pet Favorite Transaction
            </button>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-card">
            <h4 className="font-medium text-midnight mb-2">Active Transactions: {Object.keys(activeTransactions).length}</h4>
          </div>
        </section>

        {/* Idempotency Testing */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-midnight">Idempotency Service</h2>
          <div className="flex flex-wrap gap-4">
            <button onClick={handleTestIdempotency} className="btn-service">
              Test Idempotency
            </button>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-card">
            <h4 className="font-medium text-midnight mb-2">Idempotency Stats</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>Total: {stats.totalRecords}</div>
              <div>Active: {stats.activeRecords}</div>
              <div>Expired: {stats.expiredRecords}</div>
            </div>
          </div>
        </section>

        {/* Results Display */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-midnight">Operation Results</h2>
          <div className="bg-white rounded-lg p-4 shadow-card">
            <pre className="text-sm text-text-secondary whitespace-pre-wrap">
              {result || 'No operations performed yet...'}
            </pre>
          </div>
        </section>

        <section className="space-y-4">
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <h4 className="text-success font-semibold mb-2">✅ Phase D - Enterprise Services Complete</h4>
            <ul className="text-text-secondary space-y-1 text-sm">
              <li>• Correlation Service: Context management and request headers</li>
              <li>• Transaction Manager: Retry logic with exponential backoff</li>
              <li>• Idempotency Service: Duplicate prevention with caching</li>
              <li>• React Hooks: useCorrelation and useTransaction integration</li>
              <li>• Full enterprise traceability and reliability patterns</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}