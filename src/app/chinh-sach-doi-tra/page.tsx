import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Chính sách đổi hàng - T\'Petie',
  description: 'Chính sách đổi hàng và trả hàng tại T\'Petie',
};

export default function ExchangePolicyPage() {
  return (
    <div className="bg-cream-50 min-h-screen py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-cream-200">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-honey-600 mb-8 text-center uppercase tracking-wide">
            Chính Sách Đổi Hàng
          </h1>
          
          <div className="prose prose-sm sm:prose-base max-w-none text-charcoal-700 space-y-8">
            <p className="leading-relaxed text-base sm:text-lg text-center text-charcoal-800 px-4">
              T’petie hỗ trợ đổi size và đổi mẫu với tất cả sản phẩm, với mong muốn khách hàng có thể lựa chọn được sản phẩm phù hợp nhất cho bé.
            </p>
            
            <section className="bg-cream-100/50 p-6 sm:p-8 rounded-2xl border border-cream-200">
              <h2 className="text-xl font-bold text-charcoal-900 mb-5 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Điều kiện đổi hàng:
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-honey-500 mr-3 mt-1">✿</span>
                  <span>Khách hàng vui lòng thông báo nhu cầu đổi hàng cho T’petie trong vòng <span className="font-bold text-charcoal-900">03 ngày</span> kể từ ngày nhận hàng.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-honey-500 mr-3 mt-1">✿</span>
                  <span>Sản phẩm được hỗ trợ đổi size hoặc đổi sang mẫu khác.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-honey-500 mr-3 mt-1">✿</span>
                  <span>Giá trị sản phẩm/đơn hàng đổi phải lớn hơn hoặc bằng giá trị đơn hàng đã mua.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-honey-500 mr-3 mt-1">✿</span>
                  <span>Phần chênh lệch (nếu có) sẽ được khách hàng thanh toán thêm.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-honey-500 mr-3 mt-1">✿</span>
                  <span>T’petie <span className="font-semibold text-blush-600">không hỗ trợ hoàn tiền phần chênh lệch</span> khi sản phẩm đổi có giá trị thấp hơn đơn hàng ban đầu.</span>
                </li>
              </ul>
            </section>

            <section className="mt-8 border-t border-cream-200 pt-8">
              <h3 className="text-xl font-bold text-blush-600 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Lưu ý
              </h3>
              <div className="bg-blush-50 p-5 rounded-xl border border-blush-100 space-y-4 text-sm sm:text-base">
                <p>
                  T’petie <span className="font-bold text-charcoal-900">không áp dụng trả hàng</span> đối với các lý do không xuất phát từ lỗi của thương hiệu, ví dụ: <em className="text-charcoal-600">không thích, không hợp ý, chọn nhầm mẫu/size hoặc thay đổi nhu cầu sau khi nhận hàng</em>.
                </p>
                <div className="h-px w-full bg-blush-200" />
                <p className="font-medium text-charcoal-800">
                  Đối với sản phẩm có lỗi từ T’petie, khách hàng vui lòng liên hệ ngay khi nhận hàng để được hỗ trợ kiểm tra và xử lý.
                </p>
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
