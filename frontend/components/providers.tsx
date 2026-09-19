"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    // Suppress web-vitals errors from browser extensions
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('startTime')) {
        return;
      }
      originalError.apply(console, args);
    };

    // Also suppress uncaught errors related to startTime
    const originalHandler = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      if (typeof message === 'string' && message.includes('startTime')) {
        return true; // Suppress the error
      }
      if (originalHandler) {
        return originalHandler.call(window, message, source, lineno, colno, error);
      }
      return false;
    };

    // Suppress unhandled promise rejections
    const originalRejectionHandler = window.onunhandledrejection;
    window.onunhandledrejection = function(event) {
      if (event.reason && typeof event.reason.message === 'string' && event.reason.message.includes('startTime')) {
        event.preventDefault();
        return;
      }
      if (originalRejectionHandler) {
        return originalRejectionHandler.call(window, event);
      }
    };

    return () => {
      console.error = originalError;
      window.onerror = originalHandler;
      window.onunhandledrejection = originalRejectionHandler;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
