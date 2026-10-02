import type { Metadata, Viewport } from 'next';
import './globals.css';
import Script from 'next/script';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { MiniCart } from '@/components/cart/MiniCart';
import { FloatingMessenger } from '@/components/layout/FloatingMessenger';
import { NavigationProgress } from '@/components/layout/NavigationProgress';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { PublicChrome } from '@/components/layout/PublicChrome';
import { getSiteContent } from '@/server/content/site-content';
import { getCommerceSettings } from '@/server/orders/commerce-settings';
import { getCollections } from '@/server/catalog/queries';
import { Suspense } from 'react';
import { siteUrl } from '@/lib/site-url';

const DEFAULT_GA4_ID = 'G-LF9P82Z9QM';

export const metadata: Metadata = {
  // Gốc để Next.js dựng URL tuyệt đối cho canonical và ảnh Open Graph.
  metadataBase: new URL(siteUrl()),
  title: "T'Petie | Thời Trang Trẻ Em Cao Cấp & Dịu Ngọt",
  description: "Thương hiệu thời trang thiết kế cho bé gái từ chất liệu organic mềm mát. Phong cách ngọt ngào, trong trẻo, an toàn cho làn da nhạy cảm của bé.",
  keywords: ["thời trang trẻ em", "váy bé gái", "thời trang bé gái", "T'Petie", "thời trang mẹ và bé"],
  openGraph: {
    title: "T'Petie | Thời Trang Trẻ Em Cao Cấp",
    description: "Nâng niu từng bước chạm của bé yêu với chất liệu hữu cơ mềm mại và thiết kế ngọt ngào.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Không chặn phóng to: khách cần zoom xem chất vải, chữ nhỏ (WCAG 1.4.4).
  themeColor: '#FFF8EE',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clarityId = /^[a-z0-9]+$/i.test(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || '')
    ? process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID : undefined;
  // GA4: NEXT_PUBLIC_GA4_ID nếu có, nếu không dùng property mặc định của T'Petie nhưng chỉ ở bản production trên Vercel,
  // để lượt truy cập từ máy local và bản preview không lẫn vào báo cáo. Measurement ID là thông tin công khai.
  const ga4Candidate = process.env.NEXT_PUBLIC_GA4_ID || (process.env.VERCEL_ENV === 'production' ? DEFAULT_GA4_ID : '');
  const ga4Id = /^G-[A-Z0-9]+$/.test(ga4Candidate) ? ga4Candidate : undefined;
  // Nhận diện thương hiệu và cấu hình bán hàng lấy từ database, không còn số liệu viết cứng.
  // Menu bộ sưu tập đọc từ cache máy chủ (làm mới khi admin sửa bộ sưu tập), không gọi API mỗi lần chuyển trang.
  const [siteContent, commerceSettings, collections] = await Promise.all([getSiteContent(), getCommerceSettings(), getCollections()]);
  const brandAssets = siteContent.brand_assets;
  const collectionNav = collections.filter((item) => item.showInMenu)
    .map((item) => ({ label: item.title, href: `/collections/${item.id}` }));

  return (
    <html lang="vi">
      <head>
        {/* Google Fonts Quicksand & Be Vietnam Pro */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Quicksand:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* Microsoft Clarity Script */}
        {clarityId && (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                  if (['verify-email','reset-password','forgot-password'].includes(l.location.pathname.split('/')[1])) return;
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityId}");
            `}
          </Script>
        )}
      </head>
      <body className="min-h-screen flex flex-col antialiased bg-cream-50 text-charcoal-900 font-sans selection:bg-honey-100 selection:text-honey-700">
        <SessionProvider>
          {ga4Id && <GoogleAnalytics measurementId={ga4Id} />}
          <AuthProvider>
            <ToastProvider>
              <CartProvider>
                <Suspense fallback={null}><NavigationProgress /></Suspense>
                <AuthNotice />
                {/* Khu vực quản trị có khung riêng nên các thành phần của trang khách được ẩn ở đó. */}
                <PublicChrome
                  header={<Header logoUrl={brandAssets?.logoUrl} logoAlt={brandAssets?.logoAlt} collectionNav={collectionNav} />}
                  floating={<>
                    <MiniCart freeShippingThreshold={commerceSettings?.freeShippingThreshold ?? null} />
                    <MobileBottomNav />
                    <FloatingMessenger messengerUrl={siteContent.contact_info?.messengerUrl} />
                  </>}
                  footer={<Footer logoUrl={brandAssets?.logoUrl} logoAlt={brandAssets?.logoAlt} contact={siteContent.contact_info} />}
                >
                  <main className="flex-1 pb-16 md:pb-0">{children}</main>
                </PublicChrome>
              </CartProvider>
            </ToastProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
