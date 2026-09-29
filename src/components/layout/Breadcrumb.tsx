'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center space-x-1.5 text-xs text-charcoal-400 py-3 overflow-x-auto no-scrollbar" aria-label="Breadcrumb">
      <Link
        href="/"
        className="flex items-center hover:text-honey-600 transition-colors shrink-0 font-medium"
      >
        <Home className="w-3.5 h-3.5 mr-1" />
        <span>Trang chủ</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3 h-3 text-cream-300 shrink-0" />
            {isLast || !item.href ? (
              <span className="font-semibold text-charcoal-800 truncate max-w-[200px] shrink-0">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-honey-600 transition-colors shrink-0 font-medium"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
