import React from 'react';
import Image from 'next/image';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MapPin, Clock, Phone, Sparkles, Heart, ShieldCheck } from 'lucide-react';

export default function CuaHangPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-8">
      <Breadcrumb items={[{ label: 'Hệ Thống Cửa Hàng Offline', href: '/cua-hang' }]} />

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto py-4">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sage-100 text-sage-700 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-sage-600" />
          <span>Không Gian Trải Nghiệm</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-charcoal-900 mb-3">
          Ghé Thăm Showroom T&apos;Petie
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
          Không gian mua sắm ấm cúng, thiết kế thân thiện với mẹ và bé. Mẹ có thể dắt bé đến thử đồ trực tiếp và cảm nhận chất liệu vải organic mềm mịn.
        </p>
      </div>

      {/* Showroom Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Showroom 1: Hà Nội */}
        <div className="bg-white rounded-3xl overflow-hidden border border-cream-200 shadow-card hover:shadow-soft transition-shadow flex flex-col justify-between">
          <div>
            <div className="relative w-full aspect-[16/10] bg-cream-100">
              <Image
                src="https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800&auto=format&fit=crop"
                alt="Showroom T'Petie Hà Nội"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-honey-500 text-white text-xs font-bold">
                Flagship Store Hà Nội
              </span>
            </div>
            <div className="p-5 sm:p-6 space-y-3">
              <h3 className="font-heading font-bold text-lg text-charcoal-900">
                T&apos;Petie Cầu Giấy — Không Gian Mẹ &amp; Bé
              </h3>

              <div className="space-y-2 text-xs text-charcoal-700">
                <div className="flex items-start space-x-2.5">
                  <MapPin className="w-4 h-4 text-honey-500 shrink-0 mt-0.5" />
                  <span>Số 188 Đường Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, TP. Hà Nội</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-4 h-4 text-sage-600 shrink-0" />
                  <span>Giờ mở cửa: 08:30 – 21:30 (Tất cả các ngày trong tuần)</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <Phone className="w-4 h-4 text-honey-600 shrink-0" />
                  <span>Hotline cửa hàng: <strong>0988.123.456</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 pt-0">
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-full bg-cream-100 hover:bg-honey-500 hover:text-white text-charcoal-900 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Chỉ Đường Trên Google Maps</span>
            </a>
          </div>
        </div>

        {/* Showroom 2: TP. Hồ Chí Minh */}
        <div className="bg-white rounded-3xl overflow-hidden border border-cream-200 shadow-card hover:shadow-soft transition-shadow flex flex-col justify-between">
          <div>
            <div className="relative w-full aspect-[16/10] bg-cream-100">
              <Image
                src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=800&auto=format&fit=crop"
                alt="Showroom T'Petie TP.HCM"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-blush-500 text-white text-xs font-bold">
                Showroom TP. Hồ Chí Minh
              </span>
            </div>
            <div className="p-5 sm:p-6 space-y-3">
              <h3 className="font-heading font-bold text-lg text-charcoal-900">
                T&apos;Petie Quận 3 — Boutique Trẻ Em
              </h3>

              <div className="space-y-2 text-xs text-charcoal-700">
                <div className="flex items-start space-x-2.5">
                  <MapPin className="w-4 h-4 text-honey-500 shrink-0 mt-0.5" />
                  <span>Số 245 Đường Hai Bà Trưng, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-4 h-4 text-sage-600 shrink-0" />
                  <span>Giờ mở cửa: 09:00 – 22:00 (Tất cả các ngày trong tuần)</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <Phone className="w-4 h-4 text-honey-600 shrink-0" />
                  <span>Hotline cửa hàng: <strong>0977.654.321</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 pt-0">
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-full bg-cream-100 hover:bg-honey-500 hover:text-white text-charcoal-900 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Chỉ Đường Trên Google Maps</span>
            </a>
          </div>
        </div>
      </div>

      {/* Tiện ích tại cửa hàng */}
      <div className="bg-cream-100/70 p-6 sm:p-8 rounded-3xl border border-cream-200">
        <h3 className="text-center font-heading font-bold text-lg sm:text-xl text-charcoal-900 mb-6">
          Trải Nghiệm Dành Riêng Cho Mẹ &amp; Bé Khi Đến Cửa Hàng
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-cream-200 flex items-start space-x-3">
            <span className="text-2xl">🍼</span>
            <div>
              <h4 className="font-bold text-charcoal-900 mb-0.5">Phòng Thay Đồ &amp; Chăm Sóc Bé</h4>
              <p className="text-charcoal-600">Có sẵn bàn thay tã, máy hâm sữa và khăn ướt hữu cơ miễn phí cho mẹ.</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-cream-200 flex items-start space-x-3">
            <span className="text-2xl">🎈</span>
            <div>
              <h4 className="font-bold text-charcoal-900 mb-0.5">Khu Vui Chơi An Toàn Cho Bé</h4>
              <p className="text-charcoal-600">Góc đồ chơi gỗ và sách tranh để bé giải trí trong lúc mẹ thảnh thơi chọn đồ.</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-cream-200 flex items-start space-x-3">
            <span className="text-2xl">🎁</span>
            <div>
              <h4 className="font-bold text-charcoal-900 mb-0.5">Gói Quà &amp; Viết Thiệp Miễn Phí</h4>
              <p className="text-charcoal-600">Hộp quà pastel thắt nơ xinh xắn phù hợp làm quà tặng đầy tháng, sinh nhật.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
