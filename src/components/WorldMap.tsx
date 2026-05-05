import React from 'react';

export default function WorldMapSVG({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 1000 500" 
      className={className}
      style={{ width: '100%', height: '100%', opacity: 0.4 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#facc15" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Simplified Dotted Map Representation */}
      <g fill="#1e293b" opacity="0.5">
        {/* North America */}
        <circle cx="150" cy="120" r="2" /> <circle cx="170" cy="130" r="2" /> <circle cx="190" cy="140" r="2" />
        <circle cx="210" cy="150" r="2" /> <circle cx="230" cy="160" r="2" /> <circle cx="250" cy="170" r="2" />
        <circle cx="180" cy="100" r="2" /> <circle cx="200" cy="110" r="2" /> <circle cx="220" cy="120" r="2" />
        
        {/* Asia / India */}
        <circle cx="700" cy="300" r="2" /> <circle cx="720" cy="320" r="2" /> <circle cx="740" cy="340" r="2" />
        <circle cx="760" cy="360" r="2" /> <circle cx="730" cy="300" r="2" /> <circle cx="750" cy="320" r="2" />
        <circle cx="770" cy="340" r="2" /> <circle cx="710" cy="280" r="2" /> <circle cx="730" cy="280" r="2" />
        
        {/* Europe */}
        <circle cx="500" cy="150" r="2" /> <circle cx="520" cy="160" r="2" /> <circle cx="540" cy="170" r="2" />
        <circle cx="510" cy="130" r="2" /> <circle cx="530" cy="140" r="2" />
        
        {/* Africa */}
        <circle cx="500" cy="300" r="2" /> <circle cx="520" cy="320" r="2" /> <circle cx="540" cy="340" r="2" />
        <circle cx="480" cy="280" r="2" /> <circle cx="510" cy="280" r="2" />
        
        {/* South America */}
        <circle cx="300" cy="350" r="2" /> <circle cx="320" cy="370" r="2" /> <circle cx="340" cy="390" r="2" />
        <circle cx="280" cy="330" r="2" /> <circle cx="310" cy="330" r="2" />
      </g>

      {/* Strategic Glowing Nodes */}
      <circle cx="750" cy="350" r="3" fill="#facc15" className="animate-pulse" />
      <circle cx="250" cy="150" r="3" fill="#facc15" className="animate-pulse" />
    </svg>
  );
}
