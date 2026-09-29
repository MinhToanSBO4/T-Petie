'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Collection } from '@/types/collection';
import { CollectionCard } from './CollectionCard';

export function LookbookCarousel({ collections }: { collections: Collection[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative">
      {/* Nút điều hướng Carousel Desktop */}
      <div className="hidden sm:flex items-center space-x-2 absolute -top-12 right-0">
        <button
          onClick={() => scroll('left')}
          className="p-2 rounded-full border border-cream-300 bg-white hover:bg-cream-100 text-charcoal-700 transition-colors shadow-sm"
          aria-label="Lùi lại"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="p-2 rounded-full border border-cream-300 bg-white hover:bg-cream-100 text-charcoal-700 transition-colors shadow-sm"
          aria-label="Tiến tới"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Lưới cuộn ngang các BST */}
      <div
        ref={scrollRef}
        className="flex space-x-4 overflow-x-auto no-scrollbar py-2 px-1 snap-x snap-mandatory"
      >
        {collections.map((col) => (
          <div
            key={col.id}
            className="w-[280px] sm:w-[340px] shrink-0 snap-start"
          >
            <CollectionCard collection={col} />
          </div>
        ))}
      </div>
    </div>
  );
}
