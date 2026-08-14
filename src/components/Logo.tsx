'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  variant?: 'header' | 'footer' | 'dark' | 'light';
  darkText?: boolean;
  iconOnly?: boolean;
  useImage?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function Logo({
  className = '',
  showTagline = false,
  variant = 'header',
  darkText,
  iconOnly = false,
  useImage = false,
  onClick
}: LogoProps) {
  const size = variant === 'footer' ? 36 : 42;
  const isDarkText = darkText !== undefined ? darkText : variant === 'light';

  return (
    <Link 
      href="/" 
      className={`inline-flex flex-col items-start no-underline cursor-pointer group ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        {useImage ? (
          <Image
            src="/layo-logo.jpg"
            alt="Layo Logo"
            width={size}
            height={size}
            className="rounded-lg object-contain transition-transform group-hover:scale-105 flex-shrink-0 drop-shadow-md"
          />
        ) : (
          /* 3D Isometric Layo Box Icon (Coral Red #FF5A65) */
          <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-transform group-hover:scale-105 flex-shrink-0 drop-shadow-md"
          >
            {/* Top Face */}
            <path d="M 50 8 L 84 25 L 50 42 L 16 25 Z" fill="#FF5A65" />
            <path d="M 30 16 L 64 33" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
            <path d="M 38 12 L 72 29" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />

            {/* Left Face - L & A */}
            <path d="M 16 25 L 50 42 L 50 86 L 16 69 Z" fill="#FF5A65" />
            <path d="M 23 35 V 62 H 33 V 56 H 28 V 35 Z" fill="#FFFFFF" />
            <path d="M 35 36 H 45 V 66 H 40 V 54 H 35 Z M 35 41 H 40 V 47 H 35 Z" fill="#FFFFFF" />

            {/* Right Face - Y & O */}
            <path d="M 50 42 L 84 25 L 84 69 L 50 86 Z" fill="#E24550" />
            <path d="M 54 43 L 60 53 V 69 H 64 V 53 L 70 43 H 65 L 62 49 L 59 43 Z" fill="#FFFFFF" />
            <path d="M 72 43 C 77 43 79 46 79 53 V 61 C 79 68 77 70 72 70 C 67 70 65 68 65 61 V 53 C 65 46 67 43 72 43 Z M 72 48 C 70 48 69 50 69 54 V 59 C 69 63 70 65 72 65 C 74 65 75 63 75 59 V 54 C 75 50 74 48 72 48 Z" fill="#FFFFFF" />
          </svg>
        )}

        {/* Brand Wordmark */}
        {!iconOnly && (
          <span 
            className={`font-black tracking-wider leading-none ${
              isDarkText ? 'text-[#1c1917]' : 'text-white'
            }`}
            style={{ 
              fontSize: variant === 'footer' ? '22px' : '26px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
            }}
          >
            LAYO
          </span>
        )}
      </div>

      {showTagline && !iconOnly && (
        <span className="text-[#FF5A65] text-[10px] font-bold mt-1 tracking-widest uppercase">
          Distance Decoded.
        </span>
      )}
    </Link>
  );
}
