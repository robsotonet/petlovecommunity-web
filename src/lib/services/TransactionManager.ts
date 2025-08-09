import { Transaction, TransactionType, TransactionStatus } from '../../types/enterprise';
import { generateTransactionId } from '../utils/transactionUtils';

export class TransactionManager {
  private static instance: TransactionManager;
  private transactions: Map<string, Transaction> = new Map();
  private retryQueue: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  async executeTransaction<T>(
    type: TransactionType,
    correlationId: string,
    idempotencyKey: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const transactionId = generateTransactionId();
    
    // Create transaction record
    const transaction: Transaction = {
      id: transactionId,
      correlationId,
      idempotencyKey,
      type,
      status: 'pending',
      retryCount: 0,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now()
    };

    this.transactions.set(transactionId, transaction);
    this.persistTransaction(transaction);

    try {
      // Update status to processing
      this.updateTransactionStatus(transactionId, 'processing');
      
      // Execute the operation
      const result = await operation();
      
      // Mark as completed
      this.updateTransactionStatus(transactionId, 'completed');
      
      return result;
    } catch (error) {
      // Mark as failed and potentially retry
      this.updateTransactionStatus(transactionId, 'failed');
      
      if (this.shouldRetry(transaction)) {
        return this.scheduleRetry(transaction, operation);
      }
      
      throw error;
    }
  }

  private updateTransactionStatus(transactionId: string, status: TransactionStatus): void {
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      transaction.status = status;
      transaction.updatedAtMs = Date.now();
      this.transactions.set(transactionId, transaction);
      this.persistTransaction(transaction);
    }
  }

  // Enhanced state persistence with localStorage fallback
  private persistTransaction(transaction: Transaction): void {
    if (typeof window !== 'undefined') {
      try {
        const key = `plc_transaction_${transaction.id}`;
        window.localStorage.setItem(key, JSON.stringify({
          ...transaction,
          // Don't persist sensitive data, only transaction metadata
          _persistedAt: Date.now()
        }));
      } catch (error) {
        console.warn('Failed to persist transaction state:', error);
      }
    }
  }

  private loadPersistedTransaction(transactionId: string): Transaction | null {
    if (typeof window !== 'undefined') {
      try {
        const key = `plc_transaction_${transactionId}`;
        const stored = window.localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Remove persistence metadata
          delete parsed._persistedAt;
          return parsed as Transaction;
        }
      } catch (error) {
        console.warn('Failed to load persisted transaction:', error);
      }
    }
    return null;
  }

  // Enhanced transaction retrieval with persistence fallback
  getTransactionWithFallback(transactionId: string): Transaction | undefined {
    let transaction = this.getTransaction(transactionId);
    
    if (!transaction) {
      transaction = this.loadPersistedTransaction(transactionId);
      if (transaction) {
        this.transactions.set(transactionId, transaction);
      }
    }
    
    return transaction;
  }

  // Transaction rollback functionality
  async rollbackTransaction(transactionId: string, rollbackOperation?: () => Promise<void>): Promise<boolean> {
    const transaction = this.getTransactionWithFallback(transactionId);
    
    if (!transaction) {
      console.warn(`Cannot rollback transaction ${transactionId}: not found`);
      return false;
    }

    if (transaction.status === 'completed' && rollbackOperation) {
      try {
        // Execute custom rollback operation
        await rollbackOperation();
        
        // Mark transaction as rolled back
        transaction.status = 'cancelled';
        transaction.updatedAtMs = Date.now();
        this.transactions.set(transactionId, transaction);
        this.persistTransaction(transaction);
        
        console.log(`Transaction ${transactionId} successfully rolled back`);
        return true;
      } catch (error) {
        console.error(`Failed to rollback transaction ${transactionId}:`, error);
        return false;
      }
    }
    
    // For non-completed transactions, just cancel them
    return this.cancelTransaction(transactionId);
  }

  private shouldRetry(transaction: Transaction): boolean {
    const maxRetries = this.getMaxRetries(transaction.type);
    return transaction.retryCount < maxRetries;
  }

  private getMaxRetries(type: TransactionType): number {
    const retryConfig = {
      pet_favorite: 3,
      adoption_application: 5,
      service_booking: 5,
      event_rsvp: 3,
      social_interaction: 2,
    };
    return retryConfig[type] || 3;
  }

  private async scheduleRetry<T>(
    transaction: Transaction, 
    operation: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const executeRetryAttempt = async () => {
        try {
          transaction.retryCount++;
          transaction.status = 'processing';
          transaction.updatedAtMs = Date.now();
          
          const result = await operation();
          this.updateTransactionStatus(transaction.id, 'completed');
          this.retryQueue.delete(transaction.id);
          resolve(result);
        } catch (error) {
          if (this.shouldRetry(transaction)) {
            // Schedule next retry without recursion
            const retryDelay = this.calculateRetryDelay(transaction.retryCount);
            const timeoutId = setTimeout(executeRetryAttempt, retryDelay);
            this.retryQueue.set(transaction.id, timeoutId);
          } else {
            this.updateTransactionStatus(transaction.id, 'failed');
            this.retryQueue.delete(transaction.id);
            reject(error);
          }
        }
      };

      // Start first retry attempt
      const initialDelay = this.calculateRetryDelay(transaction.retryCount);
      const timeoutId = setTimeout(executeRetryAttempt, initialDelay);
      this.retryQueue.set(transaction.id, timeoutId);
    });
  }

  private calculateRetryDelay(retryCount: number): number {
    // Enhanced exponential backoff: 2s, 4s, 8s, 16s, 32s (capped at 32s)
    const baseDelayMs = 2000;
    return Math.min(baseDelayMs * Math.pow(2, retryCount), 32000);
  }

  // Enhanced timeout handling
  private async executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Transaction timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  private getDefaultTimeout(type: TransactionType): number {
    const timeoutConfig = {
      pet_favorite: 5000,           // 5 seconds
      adoption_application: 15000,   // 15 seconds
      service_booking: 10000,        // 10 seconds
      event_rsvp: 8000,             // 8 seconds
      social_interaction: 5000,      // 5 seconds
    };
    return timeoutConfig[type] || 10000;
  }

  getTransaction(transactionId: string): Transaction | undefined {
    return this.transactions.get(transactionId);
  }

  getTransactionsByCorrelationId(correlationId: string): Transaction[] {
    return Array.from(this.transactions.values())
      .filter(t => t.correlationId === correlationId);
  }

  cancelTransaction(transactionId: string): boolean {
    const transaction = this.transactions.get(transactionId);
    if (transaction && transaction.status === 'pending') {
      this.updateTransactionStatus(transactionId, 'cancelled');
      
      // Cancel retry if scheduled
      const retryTimeout = this.retryQueue.get(transactionId);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        this.retryQueue.delete(transactionId);
      }
      
      return true;
    }
    return false;
  }

  cleanup(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const [transactionId, transaction] of this.transactions) {
      if (transaction.updatedAtMs < oneDayAgo && 
          ['completed', 'failed', 'cancelled'].includes(transaction.status)) {
        
        // Clear any remaining timeouts for old transactions
        const timeoutId = this.retryQueue.get(transactionId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          this.retryQueue.delete(transactionId);
        }
        
        // Clean up persisted storage
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.removeItem(`plc_transaction_${transactionId}`);
          } catch (error) {
            console.warn('Failed to clean up persisted transaction:', error);
          }
        }
        
        this.transactions.delete(transactionId);
      }
    }
  }
  
  // Clear all active timeouts and reset the manager
  clearAllTimeouts(): void {
    // Clear all active retry timeouts
    for (const [transactionId, timeoutId] of this.retryQueue) {
      clearTimeout(timeoutId);
    }
    this.retryQueue.clear();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[TransactionManager] Cleared all active timeouts');
    }
  }
  
  // Shutdown the transaction manager safely
  shutdown(): void {
    this.clearAllTimeouts();
    
    // Mark all pending transactions as cancelled
    for (const [transactionId, transaction] of this.transactions) {
      if (transaction.status === 'pending' || transaction.status === 'processing') {
        this.updateTransactionStatus(transactionId, 'cancelled');
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[TransactionManager] Shutdown completed');
    }
  }
  
  // Get active timeout count for monitoring
  getActiveTimeoutCount(): number {
    return this.retryQueue.size;
  }
}

export const transactionManager = TransactionManager.getInstance();