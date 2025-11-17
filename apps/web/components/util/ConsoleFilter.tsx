'use client';

import { useEffect } from 'react';

const SUPPRESSED_PATTERNS = [
  'Failed to load resource: the server responded with a status of 404 (Not Found)',
  'No default component was found for a parallel route rendered on this page',
  'The above error occurred in the <NotFoundErrorBoundary> component',
  'Download the React DevTools',
  'reactjs.org/link/react-devtools'
];

function shouldSuppress(args: unknown[]): boolean {
  const message = args
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }

      try {
        return JSON.stringify(part);
      } catch (error) {
        return String(part);
      }
    })
    .join(' ');

  return SUPPRESSED_PATTERNS.some((pattern) => message.includes(pattern));
}

export default function ConsoleFilter(): null {
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    const wrap = (original: typeof console.error) =>
      (...args: unknown[]) => {
        if (shouldSuppress(args)) {
          return;
        }

        original(...args);
      };

    console.error = wrap(originalError);
    console.warn = wrap(originalWarn);
    console.log = wrap(originalLog);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
    };
  }, []);

  return null;
}
