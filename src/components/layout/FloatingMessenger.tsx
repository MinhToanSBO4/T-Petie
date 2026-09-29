import React from 'react';
import Link from 'next/link';

export function FloatingMessenger() {
  // Liên kết trực tiếp đến hộp thư Messenger của T'Petie
  const messengerUrl = "https://m.me/thoitrangtreemtpetie"; 

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50">
      <Link
        href={messengerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex items-center justify-center w-14 h-14 bg-[#0A7CFF] rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group"
        aria-label="Chat with us on Messenger"
      >
        {/* Vòng tròn hiệu ứng lan tỏa (Pulse effect) */}
        <div className="absolute inset-0 rounded-full bg-[#0A7CFF] animate-ping opacity-75"></div>
        
        {/* Icon Messenger SVG */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-white relative z-10"
        >
          <path
            d="M12 2C6.477 2 2 6.145 2 11.26c0 2.936 1.54 5.553 3.94 7.273v3.744l3.606-1.986c1.13.313 2.336.485 3.593.485 5.523 0 10-4.145 10-9.26S17.523 2 12 2zm1.144 12.593l-2.612-2.793-5.088 2.793 5.59-5.928 2.653 2.793 5.048-2.793-5.59 5.928z"
            fill="currentColor"
          />
        </svg>
        
        {/* Tooltip khi hover */}
        <div className="absolute right-full mr-4 px-3 py-1.5 bg-white text-gray-800 text-sm font-medium rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Chat với T'Petie
        </div>
      </Link>
    </div>
  );
}
