import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Chính sách thanh toán - T\'Petie',
  description: 'Chính sách thanh toán và giao nhận tại T\'Petie',
};

export default function PaymentPolicyPage() {
  return (
    <div className="bg-cream-50 min-h-screen py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-cream-200">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-honey-600 mb-8 text-center uppercase tracking-wide">
            Chính Sách Thanh Toán
          </h1>
          
          <div className="prose prose-sm sm:prose-base max-w-none text-charcoal-700 space-y-8">
            <p className="leading-relaxed text-lg">
              T’petie hiện hỗ trợ <span className="font-bold text-charcoal-900">2 hình thức thanh toán</span>:
            </p>
            
            {/* Hình thức 1 */}
            <section className="bg-cream-100/50 p-6 rounded-2xl border border-cream-200">
              <h2 className="text-lg sm:text-xl font-bold text-charcoal-900 mb-3 flex items-center space-x-2">
                <span className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 flex items-center justify-center text-sm mr-2 shrink-0">①</span>
                <span>Chuyển khoản ngân hàng</span>
              </h2>
              <p className="ml-0 sm:ml-12 leading-relaxed">
                Khách hàng thanh toán trước theo thông tin tài khoản được T’petie cung cấp khi đặt hàng.
              </p>
            </section>

            {/* Hình thức 2 */}
            <section className="bg-cream-100/50 p-6 rounded-2xl border border-cream-200">
              <h2 className="text-lg sm:text-xl font-bold text-charcoal-900 mb-3 flex items-center space-x-2">
                <span className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 flex items-center justify-center text-sm mr-2 shrink-0">②</span>
                <span>COD – Thanh toán khi nhận hàng</span>
              </h2>
              <p className="ml-0 sm:ml-12 leading-relaxed">
                Khách hàng thanh toán trực tiếp cho đơn vị vận chuyển khi nhận hàng.
              </p>
            </section>

            {/* Lưu ý */}
            <section className="mt-10 border-t border-cream-200 pt-8">
              <h3 className="text-xl font-bold text-blush-600 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Lưu ý khi nhận hàng
              </h3>
              <div className="space-y-4">
                <p className="flex items-start">
                  <span className="text-honey-500 mr-2 mt-1">●</span>
                  <span>Với đơn hàng COD, khách hàng vui lòng kiểm tra tình trạng bên ngoài của kiện hàng trước khi nhận.</span>
                </p>
                <p className="flex items-start">
                  <span className="text-honey-500 mr-2 mt-1">●</span>
                  <span>Trong trường hợp phát hiện kiện hàng có dấu hiệu bất thường, vui lòng liên hệ T’petie để được hỗ trợ.</span>
                </p>
                <div className="bg-blush-50 p-4 rounded-xl border border-blush-100 mt-4">
                  <p className="font-semibold text-charcoal-800">
                    Vui lòng không tự ý từ chối hoặc hoàn đơn khi chưa liên hệ với T’petie.
                  </p>
                  <p className="text-sm mt-1">
                    Việc tự ý hoàn đơn có thể phát sinh chi phí vận chuyển và ảnh hưởng đến quá trình hỗ trợ đơn hàng.
                  </p>
                </div>
              </div>
            </section>
            
            <div className="text-center pt-8">
              <Link href="/cua-hang" className="inline-block px-8 py-3 bg-honey-500 hover:bg-honey-600 text-white font-bold rounded-full transition-colors shadow-sm hover:shadow">
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
