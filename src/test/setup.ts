import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock crypto.randomUUID for testing - generate proper UUID format with hex chars
const mockRandomUUID = vi.fn(() => {
  // Generate a proper UUID v4 with random hex characters
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
})

Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: mockRandomUUID,
  },
  writable: true,
})

// Mock console methods for testing
globalThis.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock next/navigation for React components that use it
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}))

// Export utility functions for tests
export { mockRandomUUID }