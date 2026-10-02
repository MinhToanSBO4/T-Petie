import type { Metadata } from 'next';

// Trang riêng của từng khách: có tiêu đề riêng trên tab, không đưa vào kết quả tìm kiếm.
export const metadata: Metadata = { title: "Thanh toán | T'Petie", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
