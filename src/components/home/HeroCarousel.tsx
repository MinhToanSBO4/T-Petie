'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import type { Collection } from '@/types/collection';

export function HeroCarousel({ collections }: { collections: Collection[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeIndex = collections.length ? currentIndex % collections.length : 0;

  // Auto slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % collections.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [collections.length]);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % collections.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + collections.length) % collections.length);
  const goToSlide = (index: number) => setCurrentIndex(index);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-cream-200 shadow-soft bg-cream-50 group">
      {/* Banner Container */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/7] md:aspect-[21/8] overflow-hidden flex items-center justify-center">
        {collections.map((collection, index) => (
          <Link
            key={collection.id}
            href={`/bo-suu-tap/${collection.id}`}
            data-track={`click_hero_banner_${collection.id}`}
            className={`absolute inset-0 transition-transform duration-700 ease-in-out flex items-center justify-center ${
              index === activeIndex ? 'translate-x-0' : index < activeIndex ? '-translate-x-full' : 'translate-x-full'
            }`}
            style={{ backgroundColor: collection.themeColor }}
          >
            <Image
              src={collection.bannerImage}
              alt={collection.title}
              fill
              priority={index === 0}
              quality={75}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1400px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.01]"
              style={{ objectPosition: 'center center' }}
            />
          </Link>
        ))}

        {/* Arrow Navigation */}
        <button
          onClick={(e) => { e.preventDefault(); prevSlide(); }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/70 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center text-charcoal-700 shadow-md opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity z-10"
          aria-label="Lùi lại"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); nextSlide(); }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white/70 hover:bg-white backdrop-blur-sm rounded-full flex items-center justify-center text-charcoal-700 shadow-md opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity z-10"
          aria-label="Tiến tới"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        
        {/* Dots Navigation */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
          {collections.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.preventDefault(); goToSlide(index); }}
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all ${
                index === activeIndex ? 'bg-honey-500 w-4 sm:w-6' : 'bg-white/60 hover:bg-white'
              }`}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Quick Action & Info Bar under Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-cream-100 via-blush-50 to-sage-50 border-t border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-charcoal-700 text-center sm:text-left transition-opacity duration-300">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-honey-500 text-white text-[11px] font-bold shrink-0 shadow-sm">
            <Sparkles className="w-3 h-3 mr-1" />
            {collections[activeIndex]?.badge || 'Bộ sưu tập'}
          </span>
          <span>
            <strong>{collections[activeIndex]?.title}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center">
          <Link
            href="/be-gai"
            data-track="hero-cta-shop-girls"
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-honey-500 hover:bg-honey-600 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-1.5"
          >
            <span>Mua Sắm Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/bo-suu-tap"
            data-track="hero-cta-view-lookbook"
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-white hover:bg-cream-100 text-charcoal-900 border border-cream-300 text-xs sm:text-sm font-bold transition-all active:scale-95 text-center"
          >
            <span>Xem Lookbook</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
