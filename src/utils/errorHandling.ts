import { toast } from 'sonner';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppError {
  message: string;
  severity: ErrorSeverity;
  code?: string;
  details?: any;
}

/**
 * Centralized error handler
 */
export const handleError = (error: unknown, context?: string): AppError => {
  const appError: AppError = {
    message: 'An unexpected error occurred',
    severity: 'error',
  };

  if (error instanceof Error) {
    appError.message = error.message;
    appError.details = error.stack;
  } else if (typeof error === 'string') {
    appError.message = error;
  }

  // Log to console
  const logPrefix = context ? `[${context}]` : '';
  console.error(`${logPrefix} Error:`, error);

  // Show toast notification based on severity
  switch (appError.severity) {
    case 'critical':
    case 'error':
      toast.error(appError.message);
      break;
    case 'warning':
      toast.warning(appError.message);
      break;
    case 'info':
      toast.info(appError.message);
      break;
  }

  return appError;
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};

/**
 * Safe JSON parse with fallback
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};
