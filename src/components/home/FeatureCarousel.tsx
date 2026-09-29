'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const features = [
  {
    id: 1,
    src: '/images/vay-thi-tho-hong.jpg',
    icon: '🌿',
    title: '100% Cotton & Đũi Tự Nhiên',
    description: 'Vải được dệt từ sợi tự nhiên hữu cơ, không sử dụng hóa chất nhuộm độc hại, an toàn với làn da non nớt.',
    objectPosition: 'center 15%'
  },
  {
    id: 2,
    src: '/images/set-ao-thanh-yen-phoi-chan-vay-caro-xanh.jpg',
    icon: '🪡',
    title: 'Đường May Lộn Ẩn Tinh Tế',
    description: 'Mọi đường chỉ và cúc bấm đều được xử lý giấu mép kỹ càng, đảm bảo không cọ xát hay làm đau bé khi vận động.',
    objectPosition: 'center 20%'
  },
  {
    id: 3,
    src: '/images/set-ao-mut-cam-phoi-quan-sooc-be.jpg',
    icon: '🧸',
    title: 'Form Dáng Dễ Mặc',
    description: 'Thiết kế đũng quần và váy rộng rãi, có cúc bấm đũng tiện lợi cho mẹ thay bỉm cho bé chỉ trong 30 giây.',
    objectPosition: 'center 10%'
  }
];

export function FeatureCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % features.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + features.length) % features.length);
  const goToSlide = (index: number) => setCurrentIndex(index);

  return (
    <div className="w-full text-center overflow-hidden">
      <span className="text-xs font-bold text-honey-600 uppercase tracking-wider block mb-2">
        Chất Lượng Là Danh Dự
      </span>
      <h2 className="text-xl sm:text-3xl font-bold font-heading text-charcoal-900 mb-6">
        Những điều làm nên sự khác biệt của T'Petie
      </h2>

      <div className="relative w-full aspect-[4/5] sm:aspect-[21/9] md:aspect-[2.5/1] rounded-none sm:rounded-2xl overflow-hidden group bg-cream-50">
        {features.map((feature, index) => (
          <div
            key={feature.id}
            className={`absolute inset-0 transition-transform duration-700 ease-in-out ${
              index === currentIndex ? 'translate-x-0' : index < currentIndex ? '-translate-x-full' : 'translate-x-full'
            }`}
          >
            {/* Background Image full cover — objectPosition per-banner để không cắt người */}
            <Image
              src={feature.src}
              alt={feature.title}
              fill
              quality={100}
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: feature.objectPosition }}
            />
            
            {/* Gradient che phủ vùng dưới để chữ dễ đọc, không tối toàn ảnh */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            
            {/* Chữ đặt phía trên góc trái — tránh vùng logo watermark ở giữa ảnh */}
            <div className="absolute top-6 left-6 right-6 sm:top-10 sm:left-12 sm:right-auto sm:w-2/3 md:w-1/2 text-left z-10">
              <span className="text-2xl sm:text-3xl mb-2 sm:mb-3 block drop-shadow-md">{feature.icon}</span>
              <h3 className="font-heading font-bold text-xl sm:text-2xl md:text-3xl text-white mb-2 sm:mb-3 drop-shadow-md tracking-wide">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-white/95 leading-relaxed drop-shadow-md max-w-xl">
                {feature.description}
              </p>
            </div>
          </div>
        ))}

        {/* Arrow Navigation */}
        <button
          onClick={(e) => { e.preventDefault(); prevSlide(); }}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-12 sm:h-12 bg-black/20 hover:bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 backdrop-blur-sm"
          aria-label="Lùi lại"
        >
          <ChevronLeft className="w-5 h-5 sm:w-8 sm:h-8" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); nextSlide(); }}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-12 sm:h-12 bg-black/20 hover:bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 backdrop-blur-sm"
          aria-label="Tiến tới"
        >
          <ChevronRight className="w-5 h-5 sm:w-8 sm:h-8" />
        </button>
        
        {/* Dots Navigation */}
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-8 flex space-x-2 z-20">
          {features.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.preventDefault(); goToSlide(index); }}
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all shadow-sm ${
                index === currentIndex ? 'bg-white w-4 sm:w-8' : 'bg-white/50 hover:bg-white'
              }`}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
