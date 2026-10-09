'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Phone, MessageCircle } from 'lucide-react';
import { SizeGuideModal } from '@/components/product/SizeGuideModal';
import { socialLinks, telHref, type ContactInfo } from '@/lib/content/site-content';
import { cloudinaryImage } from '@/lib/media/cloudinary-url';
import { SOCIAL_ICONS } from '@/components/layout/SocialIcons';

/** Thông tin liên hệ lấy từ nội dung quản trị (khóa contact_info); mục nào để trống thì ẩn. */
export function Footer({ logoUrl, logoAlt, contact }: { logoUrl?: string; logoAlt?: string; contact?: ContactInfo | null } = {}) {
  const pathname = usePathname();
  const isCollectionPage = pathname?.startsWith('/collections');
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const socials = socialLinks(contact);

  return (
    <footer className={`bg-cream-100 border-t border-cream-200 ${isCollectionPage ? 'pt-8 sm:pt-10' : 'pt-10'} pb-24 md:pb-12 text-charcoal-700`}>

      {/* Cấu trúc Footer 4 Cột Chính */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* CỘT 1: LOGO & LỜI CAM KẾT */}
        <div className="space-y-3">
          <Link href="/" className="inline-block group">
            {logoUrl ? (
              <img
                src={cloudinaryImage(logoUrl, { width: 400 })}
                alt={logoAlt || "T'Petie - Made for little souls"}
                className="h-11 sm:h-12 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <span className="font-heading font-bold text-xl text-honey-700 group-hover:text-honey-600 transition-colors">T&apos;Petie</span>
            )}
          </Link>
          {contact?.commitment && <p className="text-xs leading-relaxed text-charcoal-600">
            <strong className="font-bold text-charcoal-900 uppercase">LỜI CAM KẾT:</strong> {contact.commitment}
          </p>}
          {contact?.madeIn && <div className="pt-1">
            <span className="text-[11px] font-semibold text-sage-700 bg-sage-50 px-2.5 py-1 rounded-full border border-sage-200 inline-block">
              🌿 {contact.madeIn}
            </span>
          </div>}
        </div>

        {/* CỘT 2: CHÍNH SÁCH */}
        <div className="space-y-3">
          <h4 className="font-heading font-bold text-sm text-charcoal-900 uppercase tracking-wider">
            CHÍNH SÁCH
          </h4>
          <ul className="space-y-2 text-xs text-charcoal-600">
            <li>
              <Link href="/privacy-policy" className="hover:text-honey-600 transition-colors block">
                Chính sách bảo mật
              </Link>
            </li>
            <li>
              <Link href="/return-policy" className="hover:text-honey-600 transition-colors block">
                Chính sách đổi trả
              </Link>
            </li>
            <li>
              <Link href="/payment-policy" className="hover:text-honey-600 transition-colors block">
                Chính sách thanh toán
              </Link>
            </li>
          </ul>
        </div>

        {/* CỘT 3: CHĂM SÓC KHÁCH HÀNG */}
        <div className="space-y-3">
          <h4 className="font-heading font-bold text-sm text-charcoal-900 uppercase tracking-wider">
            CHĂM SÓC KHÁCH HÀNG
          </h4>
          <ul className="space-y-2 text-xs text-charcoal-600">
            <li>
              <Link href="/orders" className="hover:text-honey-600 transition-colors block">
                Đơn mua của tôi
              </Link>
            </li>
            <li>
              <Link href="/order-lookup" className="hover:text-honey-600 transition-colors block">
                Tra cứu đơn hàng
              </Link>
            </li>
            <li>
              <Link href="/feedback" className="hover:text-honey-600 transition-colors block">
                Feedback khách hàng
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(true)}
                className="hover:text-honey-600 transition-colors text-left block"
              >
                Hướng dẫn chọn size
              </button>
            </li>
          </ul>
        </div>

        {/* CỘT 4: KẾT NỐI VỚI T'PETIE */}
        <div className="space-y-3">
          <h4 className="font-heading font-bold text-sm text-charcoal-900 uppercase tracking-wider">
            KẾT NỐI VỚI T&apos;PETIE
          </h4>
          <div className="space-y-2 text-xs">
            {contact?.hotline && <a
              href={telHref(contact.hotline)}
              className="flex items-center space-x-2 text-charcoal-800 font-semibold hover:text-honey-600 transition-colors"
            >
              <Phone className="w-4 h-4 text-honey-500 shrink-0" />
              <span>Hotline: {contact.hotline}</span>
            </a>}
            {contact?.zaloUrl && <a
              href={contact.zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-charcoal-800 font-semibold hover:text-honey-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-sage-600 shrink-0" />
              <span>{contact.zaloLabel || 'Zalo'}</span>
            </a>}
          </div>

          {/* Mạng xã hội: danh sách lấy từ SOCIAL_CHANNELS, mạng nào để trống thì ẩn */}
          {socials.length > 0 && <div className="pt-2">
            <span className="text-[11px] font-semibold text-charcoal-400 block mb-2">Mạng xã hội:</span>
            <div className="flex flex-wrap items-center gap-2.5">
              {socials.map(({ key, name, url }) => <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-8 h-8 rounded-full bg-white border border-cream-300 flex items-center justify-center text-charcoal-700 transition-all shadow-2xs ${SOCIAL_ICONS[key].hover}`}
                aria-label={`${name} T'Petie`}
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={SOCIAL_ICONS[key].path} />
                </svg>
              </a>)}
            </div>
          </div>}
        </div>

      </div>

      {/* Copyright */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-10 pt-6 border-t border-cream-200 text-center text-xs text-charcoal-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} {contact?.copyrightName || "T'Petie"}. All rights reserved.</p>
        <p className="flex items-center space-x-1">
          <span>Made with love for Mom &amp; Baby</span>
          <Heart className="w-3 h-3 text-blush-500 fill-blush-500 inline" />
        </p>
      </div>

      {/* Modal Bảng Hướng Dẫn Chọn Size */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
      />
    </footer>
  );
}
