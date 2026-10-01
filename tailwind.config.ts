
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Nền/viền trung tính cũng đọc từ biến CSS: khu quản trị dùng tông trung tính ngả hồng
        // để hover, viền, nền không còn ánh cam cạnh màu nhấn hồng.
        cream: Object.fromEntries([50, 100, 200, 300]
          .map((step) => [step, `rgb(var(--cream-${step}) / <alpha-value>)`])),
        // Shade nào được dùng trong code mà không khai báo ở đây sẽ không sinh CSS (class vô hiệu),
        // nên mỗi thang màu phải đủ các shade đang dùng. Shade làm chữ (charcoal 500+, honey/sage/blush 700+)
        // đạt tương phản ≥ 4.5:1 trên nền trắng/cream-50/cream-100 (WCAG 2.2 AA).
        sage: {
          50: '#F4FAF5',
          100: '#EAF4EC',
          200: '#CFE6D2',
          300: '#A9D2AC',
          500: '#77B77A',
          600: '#5F9D62',
          700: '#4B834E',
          800: '#37613A',
        },
        // Màu nhấn đọc từ biến CSS (khai báo trong globals.css): giao diện khách giữ màu mật ong,
        // khu quản trị (.admin-theme) đổi sang hồng pastel mà không phải sửa từng class.
        honey: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
          .map((step) => [step, `rgb(var(--honey-${step}) / <alpha-value>)`])),
        blush: {
          50: '#FFF5F5',
          100: '#FFEBEB',
          200: '#FBD0D4',
          300: '#F7AAB2',
          500: '#F2828D',
          600: '#E06D75',
          700: '#B8434F',
          900: '#7A2630',
        },
        charcoal: {
          300: '#B8BFCB',
          400: '#98A1B0',
          500: '#687388',
          600: '#5A667D',
          700: '#4F5D75',
          800: '#3C465C',
          900: '#2D3142',
        },
      },
      fontFamily: {
        heading: ['var(--font-quicksand)', 'Quicksand', 'sans-serif'],
        sans: ['var(--font-be-vietnam-pro)', 'Be Vietnam Pro', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(220, 190, 160, 0.15)',
        card: '0 2px 10px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        // Hiệu ứng vào trang: `backwards` để hết hiệu ứng là bỏ hẳn transform. Transform còn lại trên khung bao
        // khiến mọi phần tử `fixed` bên trong (ngăn kéo, hộp thoại) bị neo vào khung đó thay vì màn hình.
        'page-in': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'shimmer': 'shimmer 1.8s infinite',
        'indeterminate-progress': 'indeterminate 1.5s infinite linear',
        // Cùng nhịp với menu tài khoản ở giao diện khách (framer-motion: y 8px, scale .97, 0.16s easeOut).
        'scale-up': 'scaleUp 0.16s ease-out both',
        'shake': 'shake 0.4s ease-in-out',
        'spin-slow': 'spin 6s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        indeterminate: {
          '0%': { transform: 'translateX(-100%) scaleX(0.2)' },
          '50%': { transform: 'translateX(30%) scaleX(0.6)' },
          '100%': { transform: 'translateX(100%) scaleX(0.2)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
