'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Collection } from '@/types/collection';

export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative rounded-3xl overflow-hidden shadow-card hover:shadow-soft border border-cream-200 bg-white flex flex-col justify-between"
    >
      <Link
        href={`/bo-suu-tap/${collection.id}`}
        data-track="click-collection"
        data-collection-id={collection.id}
        className="block"
      >
        {/* Ảnh Banner BST */}
        <div className="relative w-full aspect-[4/3] bg-cream-100 overflow-hidden">
          <Image
            src={collection.bannerImage}
            alt={collection.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          {/* Badge */}
          {collection.badge && (
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center space-x-1 text-[11px] font-bold px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-charcoal-900 shadow-sm border border-cream-200">
                <Sparkles className="w-3 h-3 text-honey-500" />
                <span>{collection.badge}</span>
              </span>
            </div>
          )}
        </div>

        {/* Nội dung BST */}
        <div className="p-4 sm:p-5">
          {collection.season && (
            <span className="text-[11px] font-semibold text-honey-600 tracking-wider uppercase block mb-1">
              {collection.season}
            </span>
          )}
          <h3 className="font-heading font-bold text-lg sm:text-xl text-charcoal-900 group-hover:text-honey-600 transition-colors mb-2">
            {collection.title}
          </h3>
          <p className="text-xs text-charcoal-600 line-clamp-2 leading-relaxed mb-4">
            {collection.subtitle}
          </p>

          <div className="flex items-center text-xs font-bold text-honey-600 group-hover:text-honey-700 transition-colors">
            <span>Khám Phá Lookbook</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
