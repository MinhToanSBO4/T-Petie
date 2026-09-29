'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  Sparkles, 
  Heart, 
  Compass, 
  Target, 
  Award, 
  ChevronRight, 
  ArrowRight, 
  Shirt, 
  Smile, 
  Camera, 
  Feather, 
  CheckCircle2,
  Flower,
  Gift,
  Star,
  Backpack,
  Car
} from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

// 5 Main Tabs Data
const ABOUT_TABS = [
  {
    id: 'story',
    number: '01',
    title: 'Câu chuyện thương hiệu',
    subtitle: 'Hành trình từ năm 2021',
    icon: Sparkles,
    color: 'from-blush-100 to-sage-100 text-blush-600 border-blush-100',
  },
  {
    id: 'belief',
    number: '02',
    title: 'Niềm Tin',
    subtitle: 'Tuổi thơ chỉ cần được nâng niu',
    icon: Heart,
    color: 'from-blush-100 to-sage-100 text-blush-600 border-blush-100',
  },
  {
    id: 'vision',
    number: '03',
    title: 'Tầm nhìn',
    subtitle: 'Hệ sinh thái Lifestyle cho bé',
    icon: Flower,
    color: 'from-blush-100 to-sage-100 text-blush-600 border-blush-100',
  },
  {
    id: 'mission',
    number: '04',
    title: 'Sứ mệnh',
    subtitle: 'Cùng tâm hồn nhỏ bé lớn lên',
    icon: Gift,
    color: 'from-blush-100 to-sage-100 text-blush-600 border-blush-100',
  },
  {
    id: 'values',
    number: '05',
    title: 'Giá trị cốt lõi',
    subtitle: '4 nguyên tắc bất biến',
    icon: Star,
    color: 'from-blush-100 to-sage-100 text-blush-600 border-blush-100',
  },
];

function AboutContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('story');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ABOUT_TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-8 sm:space-y-12">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Về Chúng Tôi', href: '/ve-chung-toi' }]} />

      {/* 1. HERO HEADER BANNER (Soft & Poetic) */}
      <section className="relative rounded-3xl overflow-hidden shadow-soft w-full aspect-[2/1] sm:aspect-[21/9] lg:aspect-[3/1]">
        <img 
          src="/images/anh-nen-face.jpg" 
          alt="Học Xinh - T'Petie" 
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        
        {/* Ẩn text đi để giữ SEO nhưng không hiển thị chồng chéo lên ảnh vì ảnh đã có chữ */}
        <div className="sr-only">
          <h1>Made for little souls.</h1>
          <p>Chúng tôi tạo ra những thiết kế nhẹ nhàng, tinh tế và tự nhiên — nơi quần áo đồng hành cùng những ngày tháng rất thật của một đứa trẻ.</p>
        </div>
      </section>

      {/* 2. INTERACTIVE VERTICAL TABS / ACCORDION LAYOUT */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* LEFT COLUMN: Navigation Tabs (Vertical on Desktop, Horizontal Scroll on Mobile) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="hidden lg:block mb-5 text-center">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-blush-600 tracking-wide drop-shadow-sm">
              Khám Phá T&apos;Petie
            </h2>
          </div>

          {/* Desktop Vertical List / Mobile Scrollable Pill Row */}
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible no-scrollbar gap-2 sm:gap-2.5 pb-2 lg:pb-0">
            {ABOUT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isCurrent = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 lg:w-full min-w-[200px] lg:min-w-0 text-left p-3.5 sm:p-4 rounded-2xl transition-all duration-300 flex items-center justify-between group border relative ${
                    isCurrent
                      ? 'bg-gradient-to-r from-blush-50 to-sage-50 border-blush-500/40 shadow-md ring-2 ring-blush-500/20'
                      : 'bg-blush-100/40 hover:bg-gradient-to-r hover:from-blush-50 hover:to-sage-50 border-blush-100 text-charcoal-700 hover:border-blush-500/30'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isCurrent
                          ? 'bg-gradient-to-br from-blush-500 to-sage-500 text-white shadow-xs'
                          : 'bg-gradient-to-br from-blush-100 to-sage-100 text-blush-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div>
                      <h3 className={`text-xs sm:text-sm font-bold tracking-tight mb-0.5 ${isCurrent ? 'text-charcoal-900' : 'text-charcoal-700'}`}>
                        {tab.title}
                      </h3>
                      <p className="text-[11px] text-charcoal-400 line-clamp-1">
                        {tab.subtitle}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isCurrent
                        ? 'text-blush-500 translate-x-0.5'
                        : 'text-charcoal-300 group-hover:text-blush-500 group-hover:translate-x-0.5'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Dynamic Animated Content Panel */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl border border-cream-200 p-6 sm:p-8 shadow-card h-[500px] lg:h-[600px] flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2 sm:pr-4 pb-4 styled-scrollbar">
              <AnimatePresence mode="wait">
              
              {/* ==================== TAB 1: CÂU CHUYỆN THƯƠNG HIỆU ==================== */}
              {activeTab === 'story' && (
                <motion.div
                  key="story"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  {/* Title Header */}
                  <div className="border-b border-cream-200 pb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-honey-700 bg-honey-100 px-2.5 py-1 rounded-full border border-honey-200 inline-block mb-2">
                      Khởi Nguồn
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif text-charcoal-900">
                      Câu chuyện thương hiệu T&apos;Petie
                    </h2>

                  </div>

                  {/* Body Story Paragraphs */}
                  <div className="space-y-4 font-sans text-xs sm:text-sm text-charcoal-700 leading-relaxed">
                    <p className="text-charcoal-800 text-justify">
                      <strong>T&apos;Petie</strong> được hình thành từ năm 2021, bắt đầu bằng một tình yêu giản dị dành cho thời trang trẻ em và những điều nhỏ bé tạo nên một tuổi thơ đẹp. Chúng tôi tin rằng quần áo không chỉ là thứ trẻ mặc trên người.
                    </p>

                    {/* 4 Emotional Memory Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-2">
                      <div className="p-3 bg-cream-200 rounded-2xl border border-cream-300 flex items-center space-x-3 group transition-all hover:border-honey-300">
                        <span className="w-8 h-8 rounded-full bg-blush-50 text-blush-600 flex items-center justify-center shrink-0 border border-blush-100">
                          <Shirt className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </span>
                        <span className="text-xs text-charcoal-800 leading-relaxed">Một chiếc váy trong ngày đặc biệt.</span>
                      </div>
                      <div className="p-3 bg-cream-200 rounded-2xl border border-cream-300 flex items-center space-x-3 group transition-all hover:border-sage-300">
                        <span className="w-8 h-8 rounded-full bg-sage-50 text-sage-600 flex items-center justify-center shrink-0 border border-sage-100">
                          <Backpack className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </span>
                        <span className="text-xs text-charcoal-800 leading-relaxed">Một chiếc áo mặc đến trường.</span>
                      </div>
                      <div className="p-3 bg-cream-200 rounded-2xl border border-cream-300 flex items-center space-x-3 group transition-all hover:border-honey-300">
                        <span className="w-8 h-8 rounded-full bg-honey-50 text-honey-600 flex items-center justify-center shrink-0 border border-honey-100">
                          <Car className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </span>
                        <span className="text-xs text-charcoal-800 leading-relaxed">Một bộ đồ trong chuyến đi cùng gia đình.</span>
                      </div>
                      <div className="p-3 bg-cream-200 rounded-2xl border border-cream-300 flex items-center space-x-3 group transition-all hover:border-blush-300">
                        <span className="w-8 h-8 rounded-full bg-blush-50 text-blush-600 flex items-center justify-center shrink-0 border border-blush-100">
                          <Smile className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </span>
                        <span className="text-xs text-charcoal-800 leading-relaxed">Hay một bộ quần áo được mặc đi mặc lại vì đó là món đồ mà bé yêu thích.</span>
                      </div>
                    </div>

                    <p className="text-charcoal-800 text-justify">
                      Những điều rất nhỏ ấy, theo thời gian, có thể trở thành những ký ức rất lớn. Vì vậy, T&apos;Petie tạo ra những thiết kế dành cho trẻ nhỏ với tinh thần nhẹ nhàng, tinh tế và tự nhiên — những món đồ đủ đẹp để người lớn yêu thích, nhưng đủ thoải mái để trẻ được tự do vui chơi, khám phá và lớn lên.
                    </p>

                    <p className="text-charcoal-800 text-justify">
                      Từ cách lựa chọn chất liệu, phom dáng, màu sắc đến từng chi tiết nhỏ, T&apos;Petie luôn cố gắng tạo nên những sản phẩm không chỉ đẹp trong một khoảnh khắc, mà có thể đồng hành cùng những ngày tháng rất thật của một đứa trẻ.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ==================== TAB 2: NIỀM TIN ==================== */}
              {activeTab === 'belief' && (
                <motion.div
                  key="belief"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  <div className="border-b border-cream-200 pb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blush-700 bg-blush-100 px-2.5 py-1 rounded-full border border-blush-200 inline-block mb-2">
                      Triết Lý
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif text-charcoal-900">
                      Niềm Tin
                    </h2>
                  </div>

                  <div className="space-y-5 font-sans text-xs sm:text-sm text-charcoal-700 leading-relaxed">
                    {/* Big Quote */}
                    <div className="p-6 rounded-3xl bg-gradient-to-br from-blush-50 via-cream-100 to-honey-50 border border-blush-200 text-center space-y-2 shadow-soft">
                      <Heart className="w-8 h-8 text-blush-500 mx-auto" />
                      <blockquote className="font-serif text-base sm:text-lg text-charcoal-900 italic font-bold">
                        &ldquo;T&apos;Petie tin rằng tuổi thơ không cần phải hoàn hảo.<br />Tuổi thơ chỉ cần được nâng niu.&rdquo;
                      </blockquote>
                    </div>

                    <p className="text-justify">
                      Trẻ em không cần những bộ quần áo khiến chúng trở thành một <em>&ldquo;phiên bản hoàn hảo&rdquo;</em> trong mắt người lớn. Các em cần được thoải mái chạy nhảy, nghịch ngợm, khám phá, đến trường, đi chơi và lớn lên theo cách của riêng mình.
                    </p>

                    {/* 3 "Vừa Đủ" Balance Pillars */}
                    <div className="pt-2">
                      <h4 className="font-serif italic font-bold text-lg sm:text-xl text-charcoal-900 text-center mb-4">
                        Tinh Thần Thiết Kế Cân Bằng Của T&apos;Petie
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 bg-cream-100 rounded-2xl border border-cream-200 text-center space-y-1.5">
                          <span className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 font-serif font-bold text-xs flex items-center justify-center mx-auto">
                            01
                          </span>
                          <h5 className="font-bold text-xs text-charcoal-900">Đẹp vừa đủ</h5>
                          <p className="text-[11px] text-charcoal-500">Nhã nhặn, tôn trọn nét ngây thơ trong trẻo.</p>
                        </div>

                        <div className="p-4 bg-cream-100 rounded-2xl border border-cream-200 text-center space-y-1.5">
                          <span className="w-8 h-8 rounded-full bg-sage-100 text-sage-700 font-serif font-bold text-xs flex items-center justify-center mx-auto">
                            02
                          </span>
                          <h5 className="font-bold text-xs text-charcoal-900">Thoải mái vừa đủ</h5>
                          <p className="text-[11px] text-charcoal-500">Thấm hút tốt, êm ái cho từng cử động chạy nhảy.</p>
                        </div>

                        <div className="p-4 bg-cream-100 rounded-2xl border border-cream-200 text-center space-y-1.5">
                          <span className="w-8 h-8 rounded-full bg-blush-100 text-blush-700 font-serif font-bold text-xs flex items-center justify-center mx-auto">
                            03
                          </span>
                          <h5 className="font-bold text-xs text-charcoal-900">Cá tính vừa đủ</h5>
                          <p className="text-[11px] text-charcoal-500">Mang phong cách riêng, tự nhiên không gượng ép.</p>
                        </div>
                      </div>
                    </div>

                    <p className="pt-2 text-charcoal-800 text-justify">
                      Vì vậy, T&apos;Petie theo đuổi những thiết kế đẹp vừa đủ, thoải mái vừa đủ và có cá tính vừa đủ — để quần áo trở thành một phần của tuổi thơ, thay vì che lấp nó.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ==================== TAB 3: TẦM NHÌN ==================== */}
              {activeTab === 'vision' && (
                <motion.div
                  key="vision"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  <div className="border-b border-cream-200 pb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sage-800 bg-sage-100 px-2.5 py-1 rounded-full border border-sage-200 inline-block mb-2">
                      Tương Lai
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif text-charcoal-900">
                      Tầm nhìn
                    </h2>
                  </div>

                  <div className="space-y-4 font-sans text-xs sm:text-sm text-charcoal-700 leading-relaxed">
                    <p className="text-charcoal-800 text-justify">
                      Trở thành một thương hiệu thời trang trẻ em Việt Nam có dấu ấn riêng, được nhớ đến bởi vẻ đẹp tinh tế, chất lượng và cách trân trọng những năm tháng tuổi thơ. Về dài hạn, T&apos;Petie có thể phát triển thành một thương hiệu lifestyle dành cho trẻ nhỏ, không chỉ giới hạn ở quần áo.
                    </p>

                    <div className="pt-2 space-y-3">
                      <h4 className="font-serif italic font-bold text-lg sm:text-xl text-charcoal-900 text-center mb-4">
                        Tức là T&apos;Petie có thể sở hữu một thế giới riêng gồm:
                      </h4>

                      {/* Interactive Visual Ecosystem Roadmap Flow */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                        {[
                          { step: '01', name: 'Clothing', desc: 'Trang phục hữu cơ', colorClass: 'bg-honey-100 text-honey-700', icon: <Shirt className="w-5 h-5 text-honey-500 group-hover:scale-110 transition-transform" /> },
                          { step: '02', name: 'Accessories', desc: 'Phụ kiện dịu ngọt', colorClass: 'bg-sage-100 text-sage-700', icon: <Flower className="w-5 h-5 text-sage-500 group-hover:scale-110 transition-transform" /> },
                          { step: '03', name: 'Objects', desc: 'Đồ dùng nâng niu', colorClass: 'bg-blush-100 text-blush-700', icon: <Star className="w-5 h-5 text-blush-500 group-hover:scale-110 transition-transform" /> },
                          { step: '04', name: 'Visuals', desc: 'Hình ảnh trong trẻo', colorClass: 'bg-honey-100 text-honey-700', icon: <Camera className="w-5 h-5 text-honey-500 group-hover:scale-110 transition-transform" /> },
                          { step: '05', name: 'Stories', desc: 'Câu chuyện nuôi dưỡng', colorClass: 'bg-sage-100 text-sage-700', icon: <Feather className="w-5 h-5 text-sage-500 group-hover:scale-110 transition-transform" /> },
                          { step: '06', name: 'Childhood Experiences', desc: 'Trải nghiệm tuổi thơ', colorClass: 'bg-blush-100 text-blush-700', icon: <Smile className="w-5 h-5 text-blush-500 group-hover:scale-110 transition-transform" /> },
                        ].map((item, idx) => (
                          <div
                            key={item.name}
                            className="p-4 bg-cream-100 rounded-2xl border border-cream-200 transition-all group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`w-8 h-8 rounded-full ${item.colorClass} font-serif font-bold text-xs flex items-center justify-center`}>
                                {item.step}
                              </span>
                              {item.icon}
                            </div>
                            <div className="text-center pt-1">
                              <h5 className="font-bold text-xs text-charcoal-900">{item.name}</h5>
                              <p className="text-[11px] text-charcoal-500">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Flow summary bar */}
                      <div className="p-3 bg-cream-100 rounded-2xl border border-cream-200 text-center text-xs text-charcoal-700 font-medium">
                        Clothing ➔ Accessories ➔ Objects ➔ Visuals ➔ Stories ➔ Childhood Experiences
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ==================== TAB 4: SỨ MỆNH ==================== */}
              {activeTab === 'mission' && (
                <motion.div
                  key="mission"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  <div className="border-b border-cream-200 pb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-honey-700 bg-honey-100 px-2.5 py-1 rounded-full border border-honey-200 inline-block mb-2">
                      Trọng Trách
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif text-charcoal-900">
                      Sứ mệnh
                    </h2>
                  </div>

                  <div className="py-8 text-center space-y-6 max-w-xl mx-auto">
                    <div className="w-16 h-16 rounded-full bg-honey-100 text-honey-600 flex items-center justify-center mx-auto shadow-sm">
                      <Sparkles className="w-8 h-8 animate-spin-slow" />
                    </div>

                    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-honey-50 via-cream-100 to-blush-50 border border-honey-200 shadow-soft my-6">
                      <blockquote className="font-serif text-xl sm:text-3xl text-charcoal-900 italic font-bold leading-relaxed">
                        &ldquo;Tạo nên những điều đẹp đẽ để những tâm hồn nhỏ bé lớn lên cùng.&rdquo;
                      </blockquote>
                    </div>

                    <p className="text-sm font-sans text-charcoal-700 leading-relaxed text-justify w-full">
                      Mỗi đường chỉ êm ái, mỗi gam màu pastel thanh thoát đều là một lời nhắn nhủ yêu thương, gửi trao đến những mầm non đang khám phá thế giới rộng lớn.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ==================== TAB 5: GIÁ TRỊ CỐT LÕI ==================== */}
              {activeTab === 'values' && (
                <motion.div
                  key="values"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  <div className="border-b border-cream-200 pb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-700 bg-cream-200 px-2.5 py-1 rounded-full border border-cream-300 inline-block mb-2">
                      Kim Chỉ Nam
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif text-charcoal-900">
                      Giá trị cốt lõi
                    </h2>

                  </div>

                  {/* 4 Core Value Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Card 01 */}
                    <div className="p-5 rounded-2xl bg-cream-100 border border-cream-200 hover:border-honey-300 hover:shadow-card transition-all space-y-3 group">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 font-serif font-bold text-xs flex items-center justify-center">
                          01
                        </span>
                        <Smile className="w-5 h-5 text-honey-500 group-hover:scale-110 transition-transform" />
                      </div>
                      <h3 className="font-serif text-sm sm:text-base font-bold text-charcoal-900 uppercase">
                        CHILDHOOD FIRST <span className="font-sans font-normal italic text-xs text-charcoal-500 block mt-1">(Tuổi thơ là trung tâm)</span>
                      </h3>
                      <p className="text-xs text-charcoal-600 leading-relaxed font-sans text-justify">
                        Mọi thiết kế cuối cùng đều phải quay về một câu hỏi: <em>&ldquo;Điều này có thực sự dành cho một đứa trẻ không?&rdquo;</em>. Không hy sinh sự thoải mái của trẻ chỉ để đổi lấy một hình ảnh đẹp.
                      </p>
                    </div>

                    {/* Card 02 */}
                    <div className="p-5 rounded-2xl bg-cream-100 border border-cream-200 hover:border-sage-300 hover:shadow-card transition-all space-y-3 group">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-full bg-sage-100 text-sage-700 font-serif font-bold text-xs flex items-center justify-center">
                          02
                        </span>
                        <Feather className="w-5 h-5 text-sage-600 group-hover:scale-110 transition-transform" />
                      </div>
                      <h3 className="font-serif text-sm sm:text-base font-bold text-charcoal-900 uppercase">
                        QUIETLY BEAUTIFUL <span className="font-sans font-normal italic text-xs text-charcoal-500 block mt-1">(Đẹp một cách tinh tế)</span>
                      </h3>
                      <p className="text-xs text-charcoal-600 leading-relaxed font-sans text-justify">
                        T&apos;Petie không chạy theo sự nổi bật bằng mọi giá. Thay vào đó là màu sắc, chất liệu, phom dáng và những chi tiết nhỏ có thể khiến người ta nhìn lâu hơn một chút.
                      </p>
                    </div>

                    {/* Card 03 */}
                    <div className="p-5 rounded-2xl bg-cream-100 border border-cream-200 hover:border-blush-300 hover:shadow-card transition-all space-y-3 group">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-full bg-blush-100 text-blush-700 font-serif font-bold text-xs flex items-center justify-center">
                          03
                        </span>
                        <Shirt className="w-5 h-5 text-blush-500 group-hover:scale-110 transition-transform" />
                      </div>
                      <h3 className="font-serif text-sm sm:text-base font-bold text-charcoal-900 uppercase">
                        MADE WITH CARE <span className="font-sans font-normal italic text-xs text-charcoal-500 block mt-1">(Làm bằng sự chăm chút)</span>
                      </h3>
                      <p className="text-xs text-charcoal-600 leading-relaxed font-sans text-justify">
                        Từ thiết kế, chất liệu, đường may, đóng gói đến cách giao tiếp với khách hàng — những điều nhỏ đều quan trọng.
                      </p>
                    </div>

                    {/* Card 04 */}
                    <div className="p-5 rounded-2xl bg-cream-100 border border-cream-200 hover:border-honey-300 hover:shadow-card transition-all space-y-3 group">
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 font-serif font-bold text-xs flex items-center justify-center">
                          04
                        </span>
                        <Camera className="w-5 h-5 text-honey-600 group-hover:scale-110 transition-transform" />
                      </div>
                      <h3 className="font-serif text-sm sm:text-base font-bold text-charcoal-900 uppercase">
                        LASTING MEMORIES <span className="font-sans font-normal italic text-xs text-charcoal-500 block mt-1">(Tạo nên ký ức có thể ở lại)</span>
                      </h3>
                      <p className="text-xs text-charcoal-600 leading-relaxed font-sans text-justify">
                        T&apos;Petie không chỉ nghĩ về mùa này hay xu hướng này. Chúng tôi muốn những sản phẩm của mình có thể xuất hiện trong những bức ảnh mà nhiều năm sau bố mẹ vẫn muốn giữ lại.
                      </p>
                    </div>

                  </div>
                </motion.div>
              )}

            </AnimatePresence>
            </div>

            {/* Bottom Footer Action Inside Card */}
            <div className="pt-4 mt-2 border-t border-cream-200/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center space-x-2 text-charcoal-500 font-sans">
                <CheckCircle2 className="w-4 h-4 text-sage-600" />
                <span>Thương hiệu thiết kế quần áo cho bé</span>
              </div>

              <Link
                href="/be-gai"
                className="inline-flex items-center space-x-1.5 font-bold text-honey-700 hover:text-white bg-honey-50 hover:bg-honey-500 border border-honey-200 hover:border-honey-500 rounded-full px-3 py-1.5 transition-all"
              >
                <span>Khám phá các thiết kế của T&apos;Petie</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

      </section>

      {/* 3. INVITATION FOOTER BANNER */}
      <section className="bg-gradient-to-r from-cream-200 via-honey-100 to-blush-100 rounded-3xl p-6 sm:p-10 border border-cream-300 text-center space-y-4">
        <h3 className="text-3xl lg:text-4xl font-serif font-bold text-blush-600 tracking-wide drop-shadow-sm">
          Cùng T&apos;Petie Nâng Niu Tuổi Thơ Của Con 🌸
        </h3>
        <p className="text-xs sm:text-sm text-charcoal-600 max-w-lg mx-auto font-sans leading-relaxed">
          Mời ba mẹ ghé thăm các bộ sưu tập mới nhất để chọn cho bé những món đồ nhẹ nhàng và thoải mái nhất.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/bo-suu-tap"
            className="px-6 py-3 rounded-full bg-honey-500 hover:bg-honey-600 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
          >
            XEM BỘ SƯU TẬP
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function AboutPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto p-8 text-center text-charcoal-400">Đang tải thông tin T&apos;Petie...</div>}>
      <AboutContent />
    </Suspense>
  );
}
