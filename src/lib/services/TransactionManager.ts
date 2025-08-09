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
    }
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
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
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