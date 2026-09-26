'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HotelOverviewProps {
  desc: string;
}

const HotelOverview = ({ desc }: HotelOverviewProps) => {
  const [showMore, setShowMore] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > 100);
    }
  }, []);

  return (
    <div className="space-y-6 text-sm md:text-base">
      <div>
        <h2 className="type-res-h3 text-res-ink sm:text-lg text-sm mb-3">About Hotel</h2>
        <div
          ref={contentRef}
          className={cn(
            'transition-all overflow-hidden',
            showMore ? 'max-h-[5000px]' : 'max-h-[90px]'
          )}
        >
          <div className="text-gray-700 text-sm leading-relaxed space-y-3">
            {desc.split('\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
        {isOverflowing && (
          <button
            className="mt-2 flex items-center gap-1 text-sm text-res-brand hover:underline cursor-pointer"
            onClick={() => setShowMore((prev) => !prev)}
          >
            {showMore ? 'Show less' : 'Show more'}
            {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default HotelOverview;
