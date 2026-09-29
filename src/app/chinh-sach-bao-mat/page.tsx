import React from 'react';

export const metadata = {
  title: 'Chính sách bảo mật - T\'Petie',
  description: 'Chính sách bảo mật thông tin & Quyền riêng tư tại T\'Petie',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-cream-50 min-h-screen py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-cream-200">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-honey-600 mb-8 text-center uppercase tracking-wide">
            Chính Sách Bảo Mật Thông Tin & Quyền Riêng Tư
          </h1>
          
          <div className="prose prose-sm sm:prose-base max-w-none text-charcoal-700 space-y-6">
            <p className="leading-relaxed">
              Nhằm đảm bảo an toàn cho website và bảo mật thông tin cho người tiêu dùng. Chúng tôi đưa ra một số chính sách bảo mật thông tin cho khách hàng cá nhân và tổ chức khi mua hàng tại website:
            </p>
            
            {/* Mục 1 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-charcoal-900 mt-8 mb-3 flex items-center space-x-2">
                <span className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 flex items-center justify-center text-sm mr-2 shrink-0">1</span>
                <span>Mục đích thu thập thông tin:</span>
              </h2>
              <p className="mb-2">Việc thu thập dữ liệu của website sẽ giúp chúng tôi:</p>
              <ul className="list-disc pl-5 sm:pl-12 space-y-2">
                <li>Nắm bắt được các yêu cầu, mong muốn của khách hàng nhằm nâng cao chất lượng sản phẩm.</li>
                <li>Giúp khách hàng cập nhật các thông tin chương trình khuyến mại, giảm giá do chúng tôi tổ chức sớm nhất.</li>
                <li>Hỗ trợ khách hàng khi có khiếu nại, ý kiến một cách nhanh nhất.</li>
                <li>Giao hàng cho khách hàng khi có đơn mua tại T’Petie.</li>
              </ul>
            </section>

            {/* Mục 2 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-charcoal-900 mt-8 mb-3 flex items-center space-x-2">
                <span className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 flex items-center justify-center text-sm mr-2 shrink-0">2</span>
                <span>Phạm vi thu thập và sử dụng thông tin:</span>
              </h2>
              <ul className="list-disc pl-5 sm:pl-12 space-y-2 mb-4">
                <li>Họ và Tên</li>
                <li>Địa chỉ</li>
                <li>Email</li>
                <li>Điện thoại</li>
                <li>Thông tin đơn đặt hàng (sản phẩm đặt mua, tổng giá trị đơn hàng)</li>
                <li>Nội dung cần liên hệ</li>
              </ul>
              
              <p className="font-semibold text-charcoal-800 mb-2 mt-6">Phạm vi sử dụng thông tin:</p>
              <ul className="list-disc pl-5 sm:pl-12 space-y-2 mb-4">
                <li>Giao hàng cho quý khách đã mua hàng tại T’Petie.</li>
                <li>Thông báo về việc giao hàng và hỗ trợ cho khách hàng.</li>
                <li>Xử lý các đơn đặt hàng và cung cấp sản phẩm thông qua website T’Petie.</li>
              </ul>
              <p className="leading-relaxed bg-gray-50 p-4 rounded-xl italic text-charcoal-600 border border-gray-100 mt-4">
                Ngoài ra, các thông tin giao dịch gồm: lịch sử mua hàng, giá trị giao dịch, phương thức vận chuyển và thanh toán cũng được website lưu trữ nhằm giải quyết những vấn đề có thể phát sinh về sau.
              </p>
            </section>

            {/* Mục 3 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-charcoal-900 mt-8 mb-3 flex items-center space-x-2">
                <span className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 flex items-center justify-center text-sm mr-2 shrink-0">3</span>
                <span>Thời gian lưu trữ thông tin</span>
              </h2>
              <ul className="list-disc pl-5 sm:pl-12 space-y-2">
                <li>Dữ liệu cá nhân của khách hàng được lưu trữ trong thời gian cần thiết để thực hiện mục đích xử lý đã thông báo hoặc theo quy định của pháp luật.</li>
                <li>Khi hết hạn thời gian lưu trữ hoặc mục đích xử lý dữ liệu cá nhân, T’Petie sẽ xóa, hủy hoặc thực hiện các biện pháp xử lý dữ liệu theo quy định của pháp luật, trừ trường hợp pháp luật có quy định khác hoặc có yêu cầu lưu trữ theo quy định. Việc xóa, hủy dữ liệu theo quy định cũng được thực hiện khi có yêu cầu hợp lệ của chủ thể dữ liệu theo quy định của pháp luật.</li>
              </ul>
            </section>

            {/* Mục 4 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-charcoal-900 mt-8 mb-3 flex items-center space-x-2">
                <span className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 flex items-center justify-center text-sm mr-2 shrink-0">4</span>
                <span>Người/tổ chức được tiếp cận với thông tin cá nhân</span>
              </h2>
              <ul className="list-disc pl-5 sm:pl-12 space-y-2">
                <li>Bộ phận quản trị website T’Petie.</li>
                <li>Cơ quan nhà nước có thẩm quyền theo quy định pháp luật.</li>
              </ul>
            </section>

            {/* Mục 5 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-charcoal-900 mt-8 mb-3 flex items-center space-x-2">
                <span className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 flex items-center justify-center text-sm mr-2 shrink-0">5</span>
                <span>Địa chỉ đơn vị thu thập và quản lý thông tin</span>
              </h2>
              <div className="ml-0 sm:ml-10 bg-blush-50 p-4 rounded-2xl border border-blush-100 inline-block mt-2">
                <p className="font-medium text-charcoal-800">
                  Hotline: <a href="tel:0359995381" className="text-honey-600 font-bold hover:underline">035 999 5381</a> (8:30 – 23:00)
                </p>
              </div>
            </section>

            {/* Mục 6 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-charcoal-900 mt-8 mb-3 flex items-center space-x-2">
                <span className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 flex items-center justify-center text-sm mr-2 shrink-0">6</span>
                <span>Biện pháp bảo mật thông tin, dữ liệu của người sử dụng</span>
              </h2>
              <ul className="list-disc pl-5 sm:pl-12 space-y-3">
                <li>T’Petie áp dụng các biện pháp quản lý, kĩ thuật và tổ chức phù hợp theo quy định của pháp luật nhằm bảo vệ thông tin, dữ liệu của người sử dụng khỏi việc truy cập, sử dụng, tiết lộ, sửa đổi hoặc hủy bỏ trái phép.</li>
                <li>Thông tin của người sử dụng chỉ được tiếp cận bởi các cá nhân tổ chức có thẩm quyền hoặc được T’Petie phân quyền trong phạm vi cần thiết để thực hiện mục đích xử lý dữ liệu theo quy định của pháp luật.</li>
                <li>Trường hợp xảy ra sự cố ảnh hưởng đến an toàn thông tin, dữ liệu của người sử dụng. T’Petie sẽ thực hiện các biện pháp xử lý và thông báo theo quy định của pháp luật.</li>
              </ul>
            </section>

            {/* Mục 7 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-charcoal-900 mt-8 mb-3 flex items-center space-x-2">
                <span className="w-8 h-8 rounded-full bg-honey-100 text-honey-700 flex items-center justify-center text-sm mr-2 shrink-0">7</span>
                <span>Phương thức và công cụ để người tiêu dùng tiếp cận, chỉnh sửa dữ liệu cá nhân</span>
              </h2>
              <ul className="list-disc pl-5 sm:pl-12 space-y-3 mb-6">
                <li>Khách hàng có quyền xem, cập nhật, chỉnh sửa hoặc yêu cầu chỉnh sửa dữ liệu cá nhân, yêu cầu xóa, hủy hoặc hạn chế xử lý dữ liệu cá nhân đã cung cấp, đồng thời gửi khiếu nại, yêu cầu hoặc phản ánh liên quan đến việc thu thập, sử dụng, lưu trữ, xử lý và bảo mật dữ liệu cá nhân.</li>
                <li>Khách hàng có thể thực hiện các yêu cầu trên bằng cách gửi yêu cầu qua Hotline: <a href="tel:0359995381" className="text-honey-600 font-bold hover:underline">035 999 5381</a>.</li>
                <li>Sau khi tiếp nhận yêu cầu, T’Petie sẽ xác minh thông tin của chủ thể dữ liệu, xem xét và thực hiện xử lý phù hợp theo quy định của pháp luật. Trường hợp yêu cầu không được thực hiện do thuộc trường hợp pháp luật quy định, T’Petie sẽ thông báo lý do cho chủ thể dữ liệu.</li>
                <li>Mọi khiếu nại, yêu cầu hoặc phản ánh liên quan đến việc thu thập, sử dụng và bảo mật thông tin cá nhân được tiếp nhận qua các kênh liên hệ nêu trên. T’Petie sẽ tiếp nhận, xác minh, xử lý và phản hồi theo quy định của pháp luật.</li>
              </ul>
              
              <div className="ml-0 sm:ml-10 bg-cream-100/50 p-5 rounded-2xl border border-cream-200 mt-4">
                <h3 className="text-base font-bold text-charcoal-900 mb-3">Quy trình giải quyết khiếu nại:</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Trong vòng <span className="font-semibold text-charcoal-800">07 ngày</span> kể từ ngày tiếp nhận thông tin khiếu nại, công ty thực hiện kiểm tra, xác nhận thông tin về khiếu nại.</li>
                  <li>Trong vòng <span className="font-semibold text-charcoal-800">07 ngày</span> kể từ khi kết thúc quá trình xác minh, công ty liên hệ khách hàng để đối thoại, đưa ra các biện pháp giải quyết, xử lý khiếu nại.</li>
                </ul>
              </div>
            </section>
            
          </div>
        </div>
      </div>
    </div>
  );
}
