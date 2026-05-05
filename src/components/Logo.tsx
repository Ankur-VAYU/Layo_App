import React from 'react';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  variant?: 'header' | 'footer';
}

export default function Logo({ className, showTagline = false, variant = 'header' }: LogoProps) {
  const primaryColor = '#facc15';

  const LogoIcon = ({ size = 48 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Connected Nodes Icon */}
      <circle cx="25" cy="50" r="12" fill={primaryColor} />
      <circle cx="65" cy="25" r="12" fill={primaryColor} />
      <circle cx="65" cy="75" r="12" fill={primaryColor} />
      
      {/* Connecting Blobs */}
      <path 
        d="M25 50 Q 45 50 65 25" 
        stroke={primaryColor} 
        strokeWidth="24" 
        strokeLinecap="round" 
        opacity="1" 
      />
      <path 
        d="M25 50 Q 45 50 65 75" 
        stroke={primaryColor} 
        strokeWidth="24" 
        strokeLinecap="round" 
        opacity="1" 
      />
      
      {/* Inner smoothing/blend */}
      <circle cx="45" cy="50" r="12" fill={primaryColor} />
    </svg>
  );

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LogoIcon size={variant === 'footer' ? 40 : 48} />
        <span style={{ 
          color: primaryColor, 
          fontSize: variant === 'footer' ? '42px' : '56px', 
          fontWeight: '500', 
          fontFamily: 'serif',
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
    </div>
  );
}
