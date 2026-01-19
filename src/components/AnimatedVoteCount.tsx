import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUp } from 'lucide-react';

interface AnimatedVoteCountProps {
  count: number;
  isAnimating: boolean;
  className?: string;
}

export const AnimatedVoteCount: React.FC<AnimatedVoteCountProps> = React.memo(({ 
  count, 
  isAnimating, 
  className = "" 
}) => {
  const [displayCount, setDisplayCount] = useState(count);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    if (isAnimating && count !== displayCount) {
      setShowPulse(true);
      
      // Animate count change
      const timer = setTimeout(() => {
        setDisplayCount(count);
      }, 100);

      // Remove pulse animation
      const pulseTimer = setTimeout(() => {
        setShowPulse(false);
      }, 600);

      return () => {
        clearTimeout(timer);
        clearTimeout(pulseTimer);
      };
    } else {
      setDisplayCount(count);
    }
  }, [count, isAnimating, displayCount]);

  // Memoized vote text
  const voteText = useMemo(() => 
    displayCount === 1 ? 'vote' : 'votes',
    [displayCount]
  );

  // Memoized container classes
  const containerClasses = useMemo(() => `
    flex items-center gap-1 transition-all duration-300
    ${showPulse ? 'scale-110 text-green-600' : 'scale-100'}
    ${isAnimating ? 'animate-pulse' : ''}
  `, [showPulse, isAnimating]);

  // Memoized arrow classes
  const arrowClasses = useMemo(() => `
    w-4 h-4 transition-all duration-300
    ${showPulse ? 'text-green-600 scale-125' : 'text-gray-500'}
  `, [showPulse]);

  // Memoized count classes
  const countClasses = useMemo(() => `
    font-medium transition-all duration-300
    ${showPulse ? 'text-green-600 font-bold' : 'text-gray-600'}
  `, [showPulse]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={containerClasses}>
        <ArrowUp className={arrowClasses} />
        <span className={countClasses}>
          {displayCount}
        </span>
      </div>
      <span className="text-sm text-gray-500">
        {voteText}
      </span>
      
      {/* Floating +1 animation */}
      {showPulse && (
        <div className="relative">
          <div className="absolute -top-6 left-0 text-green-600 font-bold text-sm animate-bounce">
            +1
          </div>
        </div>
      )}
    </div>
  );
});