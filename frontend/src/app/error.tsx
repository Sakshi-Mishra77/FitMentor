// frontend/src/app/error.tsx
"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // This will print the ACTUAL cause of the 500 error to your browser console
    console.error("Page crashed:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center bg-white">
      <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4 mx-auto">
        <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong!</h2>
      <p className="text-slate-600 mb-6 max-w-md mx-auto">
        {error.message || "An unexpected error occurred while rendering this page."}
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}