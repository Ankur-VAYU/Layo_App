import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  variant?: 'header' | 'footer';
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function Logo({ className, showTagline = false, variant = 'header', onClick }: LogoProps) {
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
      className={className} 
      onClick={onClick}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-start',
        textDecoration: 'none',
        cursor: 'pointer'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LogoIcon size={variant === 'footer' ? 40 : 48} />
        <span style={{ 
          color: primaryColor, 
          fontSize: variant === 'footer' ? '42px' : '56px', 
          fontWeight: '500', 
          fontFamily: 'serif',
          fontStyle: 'italic',
          lineHeight: '1',
          marginLeft: '4px'
        }}>Layo</span>
      </div>
      {showTagline && (
        <span style={{ 
          color: primaryColor, 
          fontSize: '18px', 
          fontWeight: '400',
          marginTop: '4px',
          alignSelf: 'flex-end',
          letterSpacing: '0.01em'
        }}>Distance, decoded.</span>
      )}
    </Link>
  );
}
