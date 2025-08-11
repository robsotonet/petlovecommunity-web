export default function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="text-center">
        {/* Animated pet heart icon */}
        <div className="relative mb-6">
          <svg 
            className="w-16 h-16 text-coral animate-pulse mx-auto" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          
          {/* Loading dots */}
          <div className="flex justify-center space-x-1 mt-4">
            <div className="w-2 h-2 bg-coral rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-coral rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-coral rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-midnight">
            Finding the Perfect Match...
          </h2>
          <p className="text-text-secondary">
            Please wait while we prepare something special for you
          </p>
        </div>
      </div>
    </div>
  );
}