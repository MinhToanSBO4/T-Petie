'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ShoppingBag,
  Ruler,
  ShieldCheck,
  Truck,
  RefreshCw,
  Plus,
  Minus,
  Sparkles,
  Share2,
  Gift,
  AlertTriangle,
  ImageIcon,
} from 'lucide-react';
import { Product, ProductSizeOption } from '@/types/product';
import { formatPriceCompact } from '@/lib/utils/formatters';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { SizeGuideModal } from '@/components/product/SizeGuideModal';
import { ProductReviews } from '@/components/product/ProductReviews';
import { StarRating } from '@/components/reviews/StarRating';
import { cartSizeLabel } from '@/lib/orders/variant-match';
import { ProductCard } from '@/components/product/ProductCard';
import { trackViewItem, trackEvent } from '@/client/analytics/tracker';

export function ProductDetailClient({ product, relatedProducts }: { product: Product; relatedProducts: Product[] }) {
  const router = useRouter();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<ProductSizeOption>(() =>
    product.sizes.find((size) => size.stock > 0) || product.sizes[0] || {
      size: '', weightRange: '', ageRange: '', price: product.basePrice, stock: 0,
    }
  );
  const [quantity, setQuantity] = useState(1);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const productImages = (product.images && product.images.length > 0
    ? product.images
    : [product.thumbnail || product.image]).filter((src): src is string => Boolean(src));

  const { addToCart } = useCart();
  const { showToast } = useToast();

  // Reset image and size when route params change
  useEffect(() => {
    setSelectedImageIndex(0);
    setSelectedSize(product.sizes.find((size) => size.stock > 0) || product.sizes[0] || {
      size: '', weightRange: '', ageRange: '', price: product.basePrice, stock: 0,
    });
    setQuantity(1);
  }, [product]);

  // Track view item on mount
  useEffect(() => {
    if (product) {
      trackViewItem({
        id: product.id,
        name: product.name,
        category: product.categoryName,
        price: selectedSize.price,
      });
    }
  }, [product, selectedSize.price]);

  const handleAddToCart = () => {
    if (selectedSize.stock < quantity || selectedSize.stock < 1) {
      showToast('Kích cỡ này đã hết hàng hoặc không đủ số lượng.', 'info');
      return;
    }
    addToCart(product, selectedSize, quantity);
    showToast(`Đã thêm ${quantity} x "${product.name} (${selectedSize.size})" vào giỏ hàng!`, 'success');
  };

  const handleBuyNow = () => {
    if (selectedSize.stock < quantity || selectedSize.stock < 1) {
      showToast('Kích cỡ này đã hết hàng hoặc không đủ số lượng.', 'info');
      return;
    }
    const formattedSize = cartSizeLabel(selectedSize.size, selectedSize.weightRange);
    const buyNowItem = {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      thumbnail: product.thumbnail,
      category: product.categoryName,
      selectedSize: formattedSize,
      price: selectedSize.price,
      quantity,
    };
    sessionStorage.setItem('tpetie_buy_now', JSON.stringify(buyNowItem));
    router.push('/buy-now');
  };

  const handleBack = () => {
    // Trở về trang trước giữ nguyên scroll
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/girls');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-8">
      {/* Nút quay lại */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          data-track="product-back-btn"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-charcoal-700 hover:text-honey-600 px-3 py-1.5 rounded-full bg-white border border-cream-300 shadow-2xs transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

      </div>

      {/* Main Product Section: Gallery + Purchase Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Cột 1: Gallery Ảnh với Shared Element layoutId */}
        <div className="space-y-4">
          <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-cream-100 border border-cream-200 shadow-card">
            <motion.div
              layoutId={`product-image-${product.id}`}
              className="w-full h-full relative"
            >
              {productImages.length > 0 ? (
                <Image
                  src={productImages[selectedImageIndex] || productImages[0]}
                  alt={`${product.name} - Ảnh ${selectedImageIndex + 1}`}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-all duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-charcoal-300" aria-hidden="true">
                  <ImageIcon className="w-14 h-14" />
                </div>
              )}
            </motion.div>

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
              {product.isSale && product.discountPercent && (
                <span className="text-xs font-bold bg-blush-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                  Giảm {product.discountPercent}%
                </span>
              )}
              {product.isBestSeller && (
                <span className="text-xs font-bold bg-honey-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                  Best Seller ⭐
                </span>
              )}
            </div>

            {/* Indicator tổng số ảnh */}
            {productImages.length > 1 && (
              <div className="absolute bottom-3 right-3 z-10">
                <span className="px-2.5 py-1 rounded-full bg-charcoal-900/70 backdrop-blur-md text-white text-[11px] font-medium shadow-sm">
                  {selectedImageIndex + 1} / {productImages.length}
                </span>
              </div>
            )}

            {/* Chia sẻ sản phẩm */}
            <div className="absolute top-3 right-3 flex space-x-2 z-10">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Đã sao chép link sản phẩm để mẹ chia sẻ!', 'info');
                }}
                className="p-2 rounded-full bg-white/90 backdrop-blur-md text-charcoal-700 hover:text-honey-600 transition-colors shadow-sm"
                title="Chia sẻ"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Thumbnails list chuyển đổi ảnh */}
          {productImages.length > 1 && (
            <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar py-1">
              {productImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-2 transition-all shrink-0 focus:outline-none ${
                    selectedImageIndex === idx
                      ? 'border-honey-500 ring-2 ring-honey-400/50 scale-105 shadow-sm'
                      : 'border-cream-200 opacity-70 hover:opacity-100 hover:border-honey-300'
                  }`}
                  aria-label={`Xem ảnh ${idx + 1}`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    fill
                    sizes="88px"
                    className="object-cover"
                  />
                  {/* Nhãn mặt trước / mặt sau nếu có 2 ảnh */}
                  {productImages.length === 2 && (
                    <span className="absolute bottom-1 inset-x-1 text-[9px] font-bold text-center bg-black/60 text-white rounded py-0.5 leading-none">
                      {idx === 0 ? 'Mặt trước' : 'Mặt sau'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cột 2: Thông Tin & Chọn Mua */}
        <div className="space-y-4 sm:space-y-5">
          <div>
            <div className="flex items-center space-x-2 text-xs text-honey-600 font-bold uppercase tracking-wider mb-2">
              <span className="bg-sage-100 text-sage-700 px-2.5 py-0.5 rounded-full border border-sage-200">
                {product.collectionName || 'Bộ Sưu Tập T\'Petie'}
              </span>
              <span>•</span>
              <span>SKU: {product.sku}</span>
            </div>

            <h1 className="text-xl sm:text-3xl font-extrabold font-heading text-charcoal-900 leading-snug">
              {product.name}
            </h1>
            {/* Điểm đánh giá của khách đã mua (chỉ tính đánh giá đang hiển thị), bấm để xuống phần đánh giá. */}
            {product.reviewCount > 0 && (
              <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-xs sm:text-sm text-charcoal-700 hover:text-honey-700">
                <span className="font-bold text-honey-700">{product.rating.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                <StarRating value={product.rating} size="w-4 h-4" />
                <span className="underline-offset-2 hover:underline">{product.reviewCount} đánh giá</span>
              </a>
            )}
          </div>

          {/* Khối Giá Tiền Theo Size */}
          <div className="p-4 rounded-2xl bg-cream-100/80 border border-cream-200 flex items-baseline space-x-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-honey-600 font-heading">
              {formatPriceCompact(selectedSize.price)}
            </span>
            {product.originalPrice && (
              <span className="text-sm sm:text-base text-charcoal-400 line-through">
                {formatPriceCompact(product.originalPrice)}
              </span>
            )}
            <span className="text-xs text-sage-700 font-bold bg-sage-50 px-2 py-0.5 rounded-md border border-sage-200">
              Đã gồm VAT
            </span>
          </div>

          {/* Ưu đãi đặc biệt */}
          {product.promotion && (
            <div className="flex items-center space-x-2.5 p-3 rounded-2xl bg-blush-50 border border-blush-200 text-blush-900 text-xs font-medium shadow-2xs">
              <Gift className="w-4 h-4 text-blush-500 shrink-0" />
              <span><strong className="font-bold text-blush-700">Ưu đãi:</strong> {product.promotion}</span>
            </div>
          )}

          {/* Chọn Size Cho Bé */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                Chọn Kích Cỡ Cho Bé:
              </span>
              <button
                onClick={() => {
                  setIsSizeGuideOpen(true);
                  trackEvent('open_size_guide', { product_id: product.id });
                }}
                data-track="open-size-guide"
                className="inline-flex items-center space-x-1 text-xs font-bold text-honey-600 hover:text-honey-700 underline"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Bảng Hướng Dẫn Chọn Size</span>
              </button>
            </div>

            {/* Lưới Nút Chọn Size */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {product.sizes.map((s) => {
                const isSelected = selectedSize.size === s.size;
                return (
                  <button
                    key={s.size}
                    disabled={s.stock < 1}
                    onClick={() => {
                      setSelectedSize(s);
                      setQuantity(1);
                      trackEvent('select_size', {
                        item_id: product.id,
                        selected_size: s.size,
                        price: s.price,
                      });
                    }}
                    data-track="select-size-option"
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between ${
                      isSelected
                        ? 'border-honey-500 bg-honey-50/80 ring-2 ring-honey-400/40 shadow-sm'
                        : s.stock < 1
                          ? 'border-cream-200 bg-cream-100 text-charcoal-400 cursor-not-allowed'
                          : 'border-cream-300 bg-white hover:bg-cream-50 text-charcoal-800'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-charcoal-900">{s.size}</span>
                    <span className="text-[11px] text-sage-700 font-semibold">{s.weightRange}</span>
                    <span className="text-[10px] text-charcoal-400 mt-1">{s.ageRange}</span>
                    {s.stock < 1 && <span className="text-[10px] text-blush-600 mt-1">Hết hàng</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Số lượng */}
          <p className="text-xs text-charcoal-600" aria-live="polite">
            {selectedSize.stock > 0 ? `Còn ${selectedSize.stock} sản phẩm` : 'Kích cỡ này đã hết hàng'}
          </p>
          <div className="flex items-center space-x-4 pt-2">
            <span className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">Số Lượng:</span>
            <div className="flex items-center border border-cream-300 rounded-xl bg-white">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2 hover:bg-cream-100 rounded-l-xl transition-colors text-charcoal-600"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-bold text-charcoal-900">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(99, selectedSize.stock, q + 1))}
                disabled={selectedSize.stock < 1 || quantity >= Math.min(99, selectedSize.stock)}
                className="p-2 hover:bg-cream-100 rounded-r-xl transition-colors text-charcoal-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Nút CTA Mua Hàng Desktop */}
          <div className="hidden sm:grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={selectedSize.stock < 1}
              data-track="add-to-cart"
              className="py-3.5 px-4 rounded-full border-2 border-honey-500 bg-white hover:bg-honey-50 text-honey-600 font-bold text-sm flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Thêm Vào Giỏ Hàng</span>
            </button>
            <button
              onClick={handleBuyNow}
              disabled={selectedSize.stock < 1}
              data-track="buy-now"
              className="py-3.5 px-4 rounded-full bg-honey-500 hover:bg-honey-600 text-white font-bold text-sm flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Mua Ngay</span>
            </button>
          </div>

          {/* 3 Cam kết mua hàng */}
          <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200 space-y-2 text-xs text-charcoal-700">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-sage-600 shrink-0" />
              <span>Chất liệu {product.material} — Cam kết mềm mại, an toàn tuyệt đối.</span>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-honey-500 shrink-0" />
              <span>Hỗ trợ đổi size trong vòng 3 ngày kể từ ngày nhận hàng nếu bé mặc không vừa.</span>
            </div>
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-blush-500 shrink-0" />
              <span>Phí giao hàng được tính theo cấu hình hiện tại khi đặt hàng.</span>
            </div>
          </div>

          {/* Thông số bổ sung & Lưu ý nhận đơn */}
          {product.specifications && (
            <div className="p-4 rounded-2xl bg-honey-50/60 border border-honey-200 text-xs text-charcoal-800 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-honey-800">
                <Ruler className="w-4 h-4 text-honey-600 shrink-0" />
                <span>Thông số chiều dài chi tiết:</span>
              </div>
              <p className="leading-relaxed text-charcoal-700">{product.specifications}</p>
            </div>
          )}

          {product.orderNote && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-charcoal-800 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Lưu ý khi đặt / nhận đơn:</span>
              </div>
              <p className="leading-relaxed text-amber-900">{product.orderNote}</p>
            </div>
          )}

          {/* Mô tả chi tiết & Hướng dẫn giặt */}
          <div className="space-y-4 pt-4 border-t border-cream-200 text-xs sm:text-sm text-charcoal-700">
            <div>
              <h3 className="font-heading font-bold text-sm text-charcoal-900 mb-1.5">Mô Tả Sản Phẩm</h3>
              <p className="leading-relaxed">{product.description}</p>
            </div>

            <div>
              <h3 className="font-heading font-bold text-sm text-charcoal-900 mb-1.5">Hướng Dẫn Giặt &amp; Bảo Quản</h3>
              <ul className="list-disc list-inside space-y-1 text-charcoal-600">
                {product.careInstructions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar Cho Mobile (One-Hand Thumb Navigation) */}
      <div className="fixed bottom-14 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-cream-200 p-3 sm:hidden shadow-2xl flex items-center gap-2">
        <button
          onClick={handleAddToCart}
          disabled={selectedSize.stock < 1}
          data-track="mobile-sticky-add-cart"
          className="flex-1 py-3 px-3 rounded-full border border-honey-500 bg-honey-50 text-honey-700 font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-95"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Thêm Giỏ</span>
        </button>
        <button
          onClick={handleBuyNow}
          disabled={selectedSize.stock < 1}
          data-track="mobile-sticky-buy-now"
          className="flex-1 py-3 px-3 rounded-full bg-honey-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>Mua Ngay ({formatPriceCompact(selectedSize.price)})</span>
        </button>
      </div>

      {/* Đánh giá sản phẩm từ khách hàng */}
      <ProductReviews productId={product.id} productName={product.name} />

      {/* Sản phẩm liên quan */}
      <div className="pt-8 border-t border-cream-200">
        <h2 className="text-lg sm:text-2xl font-bold font-heading text-charcoal-900 mb-4">
          Mẹ Cũng Có Thể Thích ✨
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {relatedProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>

      {/* Size Guide Modal Popup */}
      <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
    </div>
  );
}
