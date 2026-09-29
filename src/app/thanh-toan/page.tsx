'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, CheckCircle2, Loader2, MapPin, CreditCard, Phone, User, Search } from 'lucide-react';
import { formatPriceCompact } from '@/lib/utils/formatters';
import { useToast } from '@/context/ToastContext';

interface CheckoutData {
  items: {
    productId: string;
    productName: string;
    selectedSize: string;
    quantity: number;
    price: number;
    thumbnail: string;
  }[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  finalTotal: number;
  couponCode: string;
}

export default function ThanhToanPage() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    district: '',
    ward: '',
    note: '',
    source: ''
  });

  useEffect(() => {
    // Lấy dữ liệu thanh toán từ session storage
    const storedData = sessionStorage.getItem('checkout_data');
    if (storedData) {
      try {
        setCheckoutData(JSON.parse(storedData));
      } catch (e) {
        console.error("Invalid checkout data");
        router.replace('/gio-hang');
      }
    } else {
      router.replace('/gio-hang');
    }
    setIsLoading(false);
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.phone || !formData.address || !formData.city || !formData.district) {
      showToast('Vui lòng điền đầy đủ thông tin bắt buộc!', 'info');
      return;
    }
    
    if (!/^(0[3|5|7|8|9])+([0-9]{8})\b/.test(formData.phone)) {
      showToast('Số điện thoại không hợp lệ!', 'info');
      return;
    }

    if (!checkoutData) return;

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        items: checkoutData.items,
        totalAmount: checkoutData.finalTotal,
        couponCode: checkoutData.couponCode
      };

      const key = sessionStorage.getItem('checkout_idempotency') || crypto.randomUUID();
      sessionStorage.setItem('checkout_idempotency', key);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (result.status === 'success' || result.orderId) {
        // Lưu thông tin để hiển thị ở trang thành công
        sessionStorage.setItem('order_success_id', result.orderId || 'TPE-SUCCESS');
        sessionStorage.setItem('order_success_total', String(result.totalAmount));
        sessionStorage.removeItem('checkout_idempotency');
        
        // Thành công -> chuyển trang
        router.push('/thanh-toan/thanh-cong');
      } else {
        throw new Error(result.message || 'Lỗi không xác định');
      }
    } catch (error: unknown) {
      console.error('Lỗi khi thanh toán:', error);
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra, vui lòng thử lại sau.';
      showToast(errorMessage, 'info');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 animate-fade-in" role="status" aria-label="Đang tải thông tin thanh toán">
        <div className="h-8 w-44 rounded-xl shimmer" />
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 bg-white p-6 rounded-3xl border border-cream-200 shadow-card space-y-5">
            <div className="h-6 w-52 rounded-lg shimmer" />
            <div className="space-y-4">
              <div className="h-11 rounded-xl shimmer" />
              <div className="h-11 rounded-xl shimmer" />
              <div className="h-11 rounded-xl shimmer" />
            </div>
          </div>
          <div className="w-full lg:w-96 bg-white p-6 rounded-3xl border border-cream-200 shadow-card space-y-4">
            <div className="h-6 w-36 rounded-lg shimmer" />
            <div className="h-24 rounded-2xl shimmer" />
            <div className="h-12 rounded-2xl shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!checkoutData) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center space-x-4 mb-6">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-cream-100 rounded-full transition-colors text-charcoal-500 hover:text-honey-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-charcoal-900">
          Thanh Toán
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Form Thông Tin */}
        <div className="flex-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-card">
            <h2 className="text-lg font-bold font-heading text-charcoal-900 mb-6 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-honey-500" />
              <span>Thông tin giao hàng</span>
            </h2>
            
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-1">
                  Họ và tên mẹ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="VD: Nguyễn Thị A"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-cream-300 bg-cream-50 focus:outline-none focus:border-honey-500 focus:ring-1 focus:ring-honey-500 transition-shadow text-sm"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="VD: 0987654321"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-cream-300 bg-cream-50 focus:outline-none focus:border-honey-500 focus:ring-1 focus:ring-honey-500 transition-shadow text-sm"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-1">Tỉnh/Thành phố <span className="text-red-500">*</span></label>
                <input name="city" value={formData.city} onChange={handleInputChange} required maxLength={100}
                  placeholder="VD: Hà Nội" className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-1">Quận/Huyện <span className="text-red-500">*</span></label>
                <input name="district" value={formData.district} onChange={handleInputChange} required maxLength={100}
                  placeholder="VD: Cầu Giấy" className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-1">Phường/Xã</label>
                <input name="ward" value={formData.ward} onChange={handleInputChange} maxLength={100}
                  placeholder="VD: Dịch Vọng" className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-1">
                  Địa chỉ chi tiết <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-charcoal-400" />
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Số nhà, đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố..."
                    rows={3}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-cream-300 bg-cream-50 focus:outline-none focus:border-honey-500 focus:ring-1 focus:ring-honey-500 transition-shadow text-sm resize-none"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-1">
                  Mẹ biết đến website T'Petie từ kênh nào?
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-cream-300 bg-cream-50 focus:outline-none focus:border-honey-500 focus:ring-1 focus:ring-honey-500 transition-shadow text-sm appearance-none"
                  >
                    <option value="">-- Chọn kênh --</option>
                    <option value="Facebook">Facebook</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Bạn bè giới thiệu">Bạn bè giới thiệu</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-1">
                  Ghi chú cho shop
                </label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  placeholder="Thời gian giao hàng thuận tiện, đặc điểm nhận dạng nhà..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-50 focus:outline-none focus:border-honey-500 focus:ring-1 focus:ring-honey-500 transition-shadow text-sm resize-none"
                />
              </div>
            </form>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-card">
            <h2 className="text-lg font-bold font-heading text-charcoal-900 mb-4 flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-honey-500" />
              <span>Phương thức thanh toán</span>
            </h2>
            <div className="p-4 border-2 border-honey-500 rounded-xl bg-honey-50 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-honey-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-charcoal-900 text-sm">Thanh toán khi nhận hàng (COD)</h3>
                <p className="text-xs text-charcoal-600 mt-1">
                  Mẹ sẽ thanh toán bằng tiền mặt hoặc chuyển khoản cho shipper khi nhận được hàng.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tóm Tắt Đơn Hàng */}
        <div className="lg:w-[400px]">
          <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-card sticky top-24">
            <h2 className="text-lg font-bold font-heading text-charcoal-900 mb-4 pb-4 border-b border-cream-100">
              Đơn Hàng Của Mẹ ({checkoutData.items.length} món)
            </h2>
            
            <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {checkoutData.items.map((item, idx) => (
                <div key={idx} className="flex space-x-3">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-cream-100 shrink-0 border border-cream-200">
                    <Image
                      src={item.thumbnail || '/placeholder.png'}
                      alt={item.productName}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                    <div className="absolute -top-1 -right-1 bg-charcoal-900 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                      {item.quantity}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h4 className="text-sm font-bold text-charcoal-900 line-clamp-2 leading-tight">
                      {item.productName}
                    </h4>
                    <p className="text-xs text-charcoal-500 mt-1">Size: {item.selectedSize}</p>
                  </div>
                  <div className="text-right py-1">
                    <span className="text-sm font-bold text-honey-600">
                      {formatPriceCompact(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-sm text-charcoal-700 pt-4 border-t border-cream-100">
              <div className="flex justify-between">
                <span>Tạm tính:</span>
                <span className="font-semibold">{formatPriceCompact(checkoutData.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Phí vận chuyển:</span>
                <span className="font-semibold">
                  {checkoutData.shippingFee === 0 ? (
                    <span className="text-sage-700 font-bold">Miễn Phí</span>
                  ) : (
                    formatPriceCompact(checkoutData.shippingFee)
                  )}
                </span>
              </div>
              {checkoutData.discountAmount > 0 && (
                <div className="flex justify-between text-blush-600 font-semibold">
                  <span>Mã giảm giá ({checkoutData.couponCode}):</span>
                  <span>-{formatPriceCompact(checkoutData.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-charcoal-900 pt-3 border-t border-cream-200">
                <span>Tổng cộng:</span>
                <span className="text-xl text-honey-600 font-heading">
                  {formatPriceCompact(checkoutData.finalTotal)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting}
              className="w-full mt-6 py-4 rounded-full bg-honey-500 hover:bg-honey-600 disabled:bg-cream-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Xác Nhận Đặt Hàng</span>
              )}
            </button>
            <p className="text-xs text-center text-charcoal-400 mt-3 flex items-center justify-center space-x-1">
              <span>Bảo mật thông tin khách hàng tuyệt đối</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
