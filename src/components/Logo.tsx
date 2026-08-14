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
  iconOnly = true,
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
        <Image
          src="/layo-logo.png"
          alt="Layo Logo"
          width={size}
          height={size}
          className="object-contain transition-transform group-hover:scale-105 flex-shrink-0 drop-shadow-sm"
          priority
        />

        {/* Brand Wordmark */}
        {!iconOnly && (
          <span 
            className={`font-black tracking-wider leading-none ${
              isDarkText ? 'text-[#0E1F38]' : 'text-white'
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
