import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  variant?: 'header' | 'footer';
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function Logo({ className = '', showTagline = false, variant = 'header', onClick }: LogoProps) {
  const primaryColor = '#facc15';

  const LogoIcon = ({ size = 48 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Isolated Left Node */}
      <circle cx="20" cy="50" r="12" fill={primaryColor} />
      
      {/* Connected Nodes */}
      <circle cx="50" cy="25" r="12" fill={primaryColor} />
      <circle cx="50" cy="75" r="12" fill={primaryColor} />
      <circle cx="85" cy="50" r="12" fill={primaryColor} />
      
      {/* Connecting Blobs */}
      <path 
        d="M85 50 Q 65 50 50 25" 
        stroke={primaryColor} 
        strokeWidth="24" 
        strokeLinecap="round" 
        opacity="1" 
      />
      <path 
        d="M85 50 Q 65 50 50 75" 
        stroke={primaryColor} 
        strokeWidth="24" 
        strokeLinecap="round" 
        opacity="1" 
      />
      
      {/* Inner smoothing/blend */}
      <circle cx="65" cy="50" r="12" fill={primaryColor} />
    </svg>
  );

  return (
    <Link 
      href="/" 
      className={`flex flex-col items-start no-underline cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <LogoIcon size={variant === 'footer' ? 40 : 48} />
        <span 
          className="text-primary font-serif italic leading-none ml-1"
          style={{ 
            fontSize: variant === 'footer' ? '42px' : '56px', 
            fontWeight: '500'
          }}
        >
          Layo
        </span>
      </div>
      {showTagline && (
        <span className="text-primary text-[18px] font-normal mt-1 self-end tracking-wide">
          Distance Decoded.
        </span>
      )}
    </Link>
  );
}
