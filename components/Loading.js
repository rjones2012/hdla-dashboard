export function LoadingSpinner({ size = 'md' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`${sizes[size]} animate-spin`}>
      <svg viewBox="0 0 24 24" fill="none" className="text-hdla-magenta">
        <circle 
          cx="12" cy="12" r="10" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeOpacity="0.2"
        />
        <path 
          d="M12 2a10 10 0 0 1 10 10" 
          stroke="currentColor" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-hdla-muted mt-4">Loading data...</p>
      </div>
    </div>
  );
}

export function ErrorMessage({ message, retry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-red-700 text-sm">{message}</p>
      {retry && (
        <button 
          onClick={retry}
          className="mt-2 text-sm text-red-600 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
