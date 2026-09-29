import type { Metadata, Viewport } from 'next';
import './globals.css';
import Script from 'next/script';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { MiniCart } from '@/components/cart/MiniCart';
import { FloatingMessenger } from '@/components/layout/FloatingMessenger';

export const metadata: Metadata = {
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
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFF8EE',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const ga4Id = 'G-LF9P82Z9QM';

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
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityId}");
            `}
          </Script>
        )}

        {/* Google Analytics 4 Script */}
        {ga4Id && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
              strategy="afterInteractive"
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${ga4Id}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="min-h-screen flex flex-col antialiased bg-cream-50 text-charcoal-900 font-sans selection:bg-honey-100 selection:text-honey-700">
        <SessionProvider>
          <AuthProvider>
            <ToastProvider>
              <CartProvider>
                {/* Header Sticky */}
                <Header />

                {/* Main Content Area */}
                <main className="flex-1 pb-16 md:pb-0">{children}</main>

                {/* Mini Cart Slide-in Drawer */}
                <MiniCart />

                {/* Mobile Bottom Navigation */}
                <MobileBottomNav />

                {/* Floating Messenger */}
                <FloatingMessenger />

                {/* Footer */}
                <Footer />
              </CartProvider>
            </ToastProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
